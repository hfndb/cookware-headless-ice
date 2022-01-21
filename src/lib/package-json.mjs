"use strict";

import { join } from "path";
import shelljs from "shelljs";
import { AppConfig } from "./config.mjs";
import { FileUtils } from "./files.mjs";
import { Logger } from "./log.mjs";
const { cd, exec, test } = shelljs;

/**
 * Class as namespace, to work with packages.json
 */
export class Packages {
	/**
	 * Get a list of installed packages, excluding those starting with @types
	 * Used in UI of dev server
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
	 * Get a list of README.md files in installed packages
	 * Used in UI of dev server
	 */
	static getPackageReadmeFiles(sys) {
		let cfg = AppConfig.getInstance();
		let dir = sys ? cfg.dirMain : cfg.dirProject;
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
	 * Compare ref from project package.json with val from installed package
	 */
	static isOlder(ref, val) {
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
		if (ref.startsWith("^")) {
			ref = ref.substring(1);
		}
		// Type any to ignore fucking strong typing 😀
		let vrsRef = ref.split(".");
		let vrsVal = val.split(".");
		// Convert chars to numbers, assume same lenghts of arrays
		for (let i = 0; i < vrsRef.length; i++) {
			vrsRef[i] = parseInt(vrsRef[i]);
			vrsVal[i] = parseInt(vrsVal[i]);
		}
		let toReturn = false;
		for (let i = 0; !toReturn && i < vrsRef.length; i++) {
			if (vrsVal[i] < vrsRef[i]) toReturn = true;
		}
		return toReturn;
	}

	/**
	 * Install missing packages, incremental update installed packages if needed
	 */
	static updatePackages(sys) {
		let cfg = AppConfig.getInstance();
		let dir = sys ? cfg.dirMain : cfg.dirProject;
		let log = Logger.getInstance(cfg.options.logging);
		let update = [];
		// Switch logging to file off
		cfg.options.logging.transports.file.active = false;
		let file = join(dir, "package.json");
		if (!test("-f", file)) return;
		log.info(`Checking ${sys ? "system" : "project"} packages`);
		let packages = FileUtils.readJsonFile(file, true);
		let deps = Object.entries(packages.dependencies);
		for (let i = 0; i < deps.length; i++) {
			let key = deps[i][0];
			let version = deps[i][1];
			let pkgDir = join(dir, "node_modules", key);
			let pkgFile = join(dir, "node_modules", key, "package.json");
			let needsAction = false;
			if (!test("-d", pkgDir)) {
				log.info(`Package ${key} not installed yet`);
				needsAction = true;
			} else if (!test("-f", pkgFile)) {
				log.info(`Package ${key} incorrectly installed`);
				needsAction = true;
			}
			if (!needsAction) {
				let pkgInf = FileUtils.readJsonFile(pkgFile, true);
				if (Packages.isOlder(version, pkgInf.version)) {
					log.info(
						`Package ${key} needs update, version ${pkgInf.version} to ${version}`,
					);
					needsAction = true;
				}
			}
			if (needsAction) {
				update.push(`${key}@${version}`);
			}
		}
		if (update.length > 0) {
			cd(dir);
			log.info("Installing updates...");
			exec(`npm install ${update.join(" ")}`, { async: false, silent: false });
			cd(cfg.dirMain); // Reset to default
		}
	}
}
