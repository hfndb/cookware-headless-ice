"use strict";
import { join } from "node:path";
import { AppConfig } from "./config.mjs";
import { FileUtils } from "./file-system/files.mjs";
import { Logger } from "./log.mjs";
import { StringExt } from "./utils.mjs";
import { cd, exec, test } from "./sys.mjs";

/**
 * Class as namespace, to work with packages.json
 */
export class Packages {
	/**
	 * Get a list of installed packages, excluding types
	 *
	 * @param {string} dir
	 */
	static getPackages(dir) {
		let packages = FileUtils.readJsonFile(join(dir, "package.json"), true);
		let pkg = [];
		for (let key in packages.dependencies) {
			if (!key.startsWith("@types")) pkg.push(key);
		}
		for (let key in packages.devDependencies) {
			if (!key.startsWith("@types")) pkg.push(key);
		}
		return pkg;
	}

	/**
	 * Get a list of README.md files of project and installed packages
	 *
	 * @param {boolean} sys
	 * @param {string} dir
	 */
	static getPackageReadmeFiles(sys, dir) {
		let cfg = AppConfig.getInstance();
		if (!test("-f", join(dir, "package.json"))) {
			let log = Logger.getInstance();
			log.warn(`No package.json found in directory ${dir}`);
			return []; // Should not occur, since controller filters
		}
		let list = Packages.getPackages(dir);
		let mds = [];
		let pkg = "";
		if (!cfg.isProject && !sys) return mds;
		for (let i = 0; i < list.length; i++) {
			pkg = list[i];
			FileUtils.getFileList(join(dir, "node_modules", pkg), {
				allowedExtensions: [".md"],
				recursive: false,
			}).forEach(file => {
				if (file.toLowerCase() == "readme.md") {
					mds.push({
						name: pkg,
						file: file,
					});
				}
			});
		}
		return mds;
	}

	/**
	 * Install missing packages, incremental update installed packages if needed
	 *
	 * @param {boolean} sys
	 * @param {string} dir
	 */
	static updatePackages(sys, dir) {
		let cfg = AppConfig.getInstance(),
			changed = false, // package.json of project
			file = join(dir, "package.json"),
			packages = FileUtils.readJsonFile(file, true), // package.json of project
			update = [];

		if (!test("-f", file)) return;

		console.log(`Checking ${sys ? "system" : "project"} packages for updates...`);
		let deps = Object.entries(packages.dependencies);
		for (let i = 0; i < deps.length; i++) {
			let key = deps[i][0],
				needsAction = false,
				currentVersion = new NodePackage(deps[i][1]),
				pkgDir = join(dir, "node_modules", key),
				pkgFile = join(dir, "node_modules", key, "package.json");

			if (!test("-d", pkgDir)) {
				console.log(`- ${key} not installed yet`);
				needsAction = true;
			} else if (!test("-f", pkgFile)) {
				console.log(`- ${key} incorrectly installed`);
				needsAction = true;
			}

			if (!needsAction) {
				let pkgInf = FileUtils.readJsonFile(pkgFile, true),
					installedVersion = new NodePackage(pkgInf.version);

				if (NodePackage.isOlder(currentVersion, installedVersion)) {
					// Case: npm audit fix, package.json not updated yet
					changed = true;
					packages.dependencies[key] =
						currentVersion.comparator + installedVersion.toString();
					console.log(
						`- %s audit fixed, currentVersion %s to %s`,
						key,
						currentVersion.toString(),
						installedVersion.toString(),
					);
				} else if (NodePackage.isOlder(installedVersion, currentVersion)) {
					// Case: Installed version older than in package.json
					console.log(
						`- %s needs update, version %s to %s`,
						key,
						currentVersion.toString(),
						installedVersion.toString(),
					);
					needsAction = true;
				}
			}

			if (needsAction) {
				update.push(`${key}@${currentVersion.toString()}`);
			}
		}

		if (changed) {
			FileUtils.writeJsonFile(packages, dir, "package.json", true);
		}
		console.log(`... done`);

		if (false && update.length > 0) {
			cd(dir);
			console.log("Installing updates...");
			exec(`npm install ${update.join(" ")}`, { async: false, silent: false });
			cd(cfg.dirMain); // Reset to default
		}
	}
}

export class NodePackage {
	/**
	 * @param {string} version as in package.json
	 */
	constructor(version) {
		/*
			Version numbers by semantic versioner for npm:
				https://github.com/npm/node-semver#versions

			version     Must match version exactly
			>version    Must be greater than version
			>=version   etc
			<version
			<=version
			~version    Approximately equivalent to version
			^version    Compatible with version (default for fresh npm install)
		 */

		// Get comparator
		this.comparator = "";
		while (!StringExt.isNumeric(version[0])) {
			this.comparator += version[0];
			version = version.substring(1);
		}

		let vars = version.split(".");
		this.major = vars[0] ? parseInt(vars[0]) : 0;
		this.minor = vars[1] ? parseInt(vars[1]) : 0;
		this.patch = vars[2] ? parseInt(vars[2]) : 0;
	}

	toString(includingComparator = false) {
		return (
			(includingComparator ? this.comparator : "") +
			this.major.toString() +
			"." +
			this.minor.toString() +
			"." +
			this.patch.toString()
		);
	}

	/**
	 * @param {NodePackage} current
	 * @param {NodePackage} ref
	 * @returns {boolean}
	 */
	static isOlder(current, ref) {
		return current.major < ref.major ||
			current.minor < ref.minor ||
			current.patch < ref.patch
			? true
			: false;
	}
}
