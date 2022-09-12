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
		this.files = [];
		this.path2json = join(
			cfg.options.sponsor.dir.remote,
			cfg.options.sponsor.file.requires,
		);

		// Configure files
		let file, lst, path;
		for (let i = 0; i < files.length; i++) {
			path = join(this.basePath, files[i]);
			if (!test("-d", path)) {
				this.files.push(files[i]); // File
				continue;
			}
			lst = FileUtils.getFileList(path); // Files in directory
			lst.forEach(item => {
				file = join(path, item).replace(this.basePath + sep, "");
				this.files.push(file);
			});
		}

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
	 * Update what we have so far
	 */
	updateList() {
		let changed = false,
			file,
			idx,
			imports,
			item,
			path,
			source;

		// Read project package.json
		let pkgs = FileUtils.readJsonFile(
			join(this.dirProject, "package.json"),
			true,
		);
		pkgs = pkgs.dependencies;

		for (let i = 0; i < this.files.length; i++) {
			file = this.files[i];
			idx = this.lst.findIndex(item => item.name == file);
			path = join(this.basePath, file);

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
			item.updateImports(this.basePath, path, imports, pkgs);

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
	 * @param {Object} pkgs
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
				this.npm.push(
					new EntryPkg({
						name: mprt,
						version: current.toString(),
					}),
				);
			}
		}

		this.imports = this.imports.sort();
	}
}

class EntryPkg {
	constructor(obj) {
		this.name = obj.name;
		this.version = obj.version;
	}
}
