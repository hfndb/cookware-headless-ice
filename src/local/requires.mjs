"use strict";
import { dirname, join, resolve, sep } from "node:path";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { CodeJs } from "../generic/source/javascript.mjs";
import { NodePackage } from "../generic/package-json.mjs";
import { test } from "../generic/sys.mjs";

let cfg, log;

/**
 * Make and use an inventory what sponsored files require;
 * other sponsored files, npm packages
 */
export class Requires {
	/**
	 * Install missing packages, incremental update installed packages if needed
	 *
	 * @param {string} dirProject
	 * @param {string[]} files Outgoing from this project
	 */
	constructor(dirProject, files) {
		cfg = AppConfig.getInstance();
		log = Logger.getInstance();
		this.basePath = join(
			dirProject,
			cfg.options.javascript.dirs.source,
			cfg.options.sponsor.dir.generic,
		);
		this.dirProject = dirProject;
		this.dirRemoteSource = join(cfg.options.sponsor.dir.remote, "generic");
		this.files = FileUtils.expandFileList(this.dirRemoteSource, files);
		this.path2json = join(
			cfg.options.sponsor.dir.remote,
			cfg.options.sponsor.file.requires,
		);

		// Read project package.json
		let pkgs = FileUtils.readJsonFile(
			join(this.dirProject, "package.json"),
			true,
		);
		this.pkgs = pkgs.dependencies;

		// Read what we have so far
		if (test("-f", this.path2json)) {
			this.lastChanged = FileUtils.getLastModified("", this.path2json);
			this.lst = FileUtils.readJsonFile(this.path2json);
		} else {
			this.lastChanged = -1;
			this.lst = [];
		}
	}

	/**
	 * Step 1: Update what we have so far
	 */
	updateList() {
		let changed = false,
			file,
			idx,
			imports,
			item,
			path,
			source;

		for (let i = 0; i < this.files.length; i++) {
			file = this.files[i];
			idx = this.lst.findIndex(item => item.name == file);
			path = join(this.dirRemoteSource, file);

			if (
				idx >= 0 &&
				this.lastChanged > 0 &&
				FileUtils.getLastModified("", path) < this.lastChanged
			) {
				continue;
			}
			changed = true;

			item = new EntryFile(idx >= 0 ? this.lst[idx] : { name: file });

			// Extract and update imports
			source = FileUtils.readFile(path);
			imports = CodeJs.getImports(source);
			item.updateImports(this.basePath, path, imports, this.pkgs);

			if (idx >= 0) {
				this.lst[idx] = item;
			} else {
				this.lst.push(item);
			}
		}

		if (changed) {
			FileUtils.writeJsonFile(this.lst, "", this.path2json, false);
		}
	}

	/**
	 * Step 2: What else does this project need?
	 *
	 * @param {string[]} files List of available generic files
	 * @returns {AlsoNeeds}
	 */
	getNeeds(files) {
		let an = new AlsoNeeds(files, this.pkgs),
			file,
			idx,
			pkg;

		// Scan current files and check npm
		for (let f = 0; f < an.current.files.length; f++) {
			file = an.current.files[f];
			this.addFile(an, file);
		}

		Reflect.deleteProperty(an, "current");
		return an;
	}

	/**
	 * Add a generic source file
	 *
	 * @private
	 * @param {AlsoNeeds} an
	 * @param {string} file
	 */
	addFile(an, file) {
		let idx = this.lst.findIndex(item => item.name == file);
		if (idx < 0) return; // Not found

		// Check which generic files are needed
		let entry = this.lst[idx];
		if (
			!an.current.files.includes(entry.name) &&
			!an.generic.includes(entry.name)
		) {
			an.generic.push(entry.name);
		}
		entry.imports.forEach(name => {
			if (!an.current.files.includes(name) && !an.generic.includes(name)) {
				this.addFile(an, name); // Recursive call
			}
		});

		// Check which npm packages are needed
		let currentVersion, installedVersion;
		entry.npm.forEach(item => {
			currentVersion = new NodePackage(item.version);
			installedVersion = this.pkgs[item.name] || "";
			if (!installedVersion) {
				an.npm.push(item); // Not installed yet
				return;
			}

			installedVersion = new NodePackage(installedVersion);
			if (NodePackage.isOlder(installedVersion, currentVersion)) {
				console.log(
					"- Package %s needs an update; version %s -> %s",
					item.name,
					installedVersion.toString(),
					currentVersion.toString(),
				);
				an.npm.push(item); // Older version installed, update
			}
		});
	}
}

class EntryFile {
	constructor(obj) {
		this.imports = obj?.imports || []; // Generic
		this.name = obj.name;
		this.npm = obj?.npm || []; // Npm packages
	}

	/**
	 * @param {string} basePath
	 * @param {string} path
	 * @param {string[]} imports
	 * @param {Object} pkgs As in project package.json
	 */
	updateImports(basePath, path, imports, pkgs) {
		this.imports = []; // Reset
		this.npm = [];

		let current, mprt, tmp;
		for (let i = 0; i < imports.length; i++) {
			mprt = imports[i];
			if (mprt.includes("node:")) continue;
			if (mprt.endsWith("default-settings.mjs")) continue;
			if (mprt.startsWith(".")) {
				tmp = resolve(dirname(path), mprt).replace(basePath + sep, "");
				if (!tmp.startsWith(this.dirProject)) mprt = tmp; // File not generic
				this.imports.push(mprt);
			} else {
				if (pkgs[mprt]) {
					current = new NodePackage(pkgs[mprt]);
				} else {
					current = "--unknown";
				}
				this.npm.push(new EntryPkg(mprt, current.toString()));
			}
		}

		this.imports = this.imports.sort();
	}
}

/**
 * Results of a search of what a project also needs
 *
 * @property {string[]} files List of available generic files
 * @property {string[]} generic Generic files not available yet
 * @property {EntryPkg[]} npm Npm packages not available yet
 */
class AlsoNeeds {
	/**
	 * @param {string[]} files
	 * @param {Object} pkgs As in project package.json
	 */
	constructor(files, pkgs) {
		this.current = {
			files: files,
			npm: [],
		};
		this.generic = [];
		this.npm = [];

		let version;
		Object.keys(pkgs).forEach(key => {
			version = new NodePackage(pkgs[key]);
			this.current.npm.push(new EntryPkg(key, version.toString()));
		});
	}

	/**
	 * @returns {string} Npm install command
	 */
	getNpmInstall() {
		if (this.npm.length == 0) return "";
		let pkg,
			rt = "npm i ";
		for (let i = 0; i < this.npm.length; i++) {
			pkg = this.npm[i];
			rt += `${pkg.name}@${pkg.version} `;
		}

		return rt + "--save";
	}
}

/**
 * For internal usage within this file
 */
class EntryPkg {
	/**
	 * @param {string} name
	 * @param {string} version
	 */
	constructor(name, version) {
		this.name = name;
		this.version = version;
	}
}
