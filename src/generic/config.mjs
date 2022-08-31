"use strict";
import { Module } from "node:module";
import { homedir, platform, tmpdir } from "node:os";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import deepdiff from "deep-diff";
import { DefaultConfig } from "../default-settings.mjs";
import { Logger } from "./log.mjs";
import { createDirTree } from "./file-system/dirs.mjs";
import { FileUtils } from "./file-system/files.mjs";
import { ObjectUtils } from "./object.mjs";
import { cp, test } from "../generic/sys.mjs";
const { diff } = deepdiff;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration mechanism.
 * <br>Default settings are supposed to be in src/default-settings.js
 * <br>Project setttings override and are in working directory settings.json
 */
/**
 * @class containing configuration settings
 * @property dirHome - Home directory of computer
 * @property dirMain - Directory of cookware-headless-ice
 * @property dirProject - Directory of current project
 * @property isProject - True if working on a project, false if on cookware-headless-ice
 * @property options - Loaded from settings.json in project directory
 */
export class AppConfig {
	static instance = null;

	/**
	 * Initializes properties based on file system, reads settings.json and modifies search path
	 * @param name of project
	 */
	constructor(name) {
		this.dirHome = homedir();
		this.dirTemp = join(tmpdir(), name); // or via package shelljs.tempdir()
		FileUtils.mkdir(this.dirTemp);
		this.dirProject = normalize(process.cwd());
		this.dirMain = normalize(__dirname);
		this.dirMain = AppConfig.getProjectDir(this.dirMain);
		if (process.env.NODE_ENV == "test") {
			// Special case for testing
			this.isProject = false;
			this.dirProject = this.dirMain;
		} else {
			this.isProject = this.dirProject != this.dirMain;
		}
		this.read();

		// Add some paths to NODE_PATH
		let dir = join(this.dirProject, "node_modules");
		let paths = [];
		let sep = platform() == "win32" ? ";" : ":";
		if (this.isProject && test("-d", dir)) {
			paths.push(dir);
		}
		paths.push(join(this.dirMain, "node_modules"));
		if (this.options.env.node_path && this.options.env.node_path.length > 0) {
			paths = paths.concat(this.options.env.node_path);
		}
		process.env.NODE_PATH = paths.join(sep);
		Module._initPaths();
	}

	/**
	 * Override default settings. Object.clone() and mergeWith (loadash) don't do this properly
	 *
	 * @param additional path to config settings to merge into already loaded config
	 */
	mergeInto(additional) {
		let options = FileUtils.readJsonFile(additional, false);
		if (!options || Object.keys(options).length == 0) {
			process.exit(-1);
			return;
		}
		// console.log("\n\nCurrent ", this.options);
		// console.log("\n\nAdditional ", additional, options);
		if (this.options.version != options.version) {
			console.warn(
				`Check and correct your project configuration and documentation about it:\n${join(
					this.dirMain,
					"settings.json",
				)} \n\nDefault settings and project settings aren't the same version\n`,
			);
		}
		ObjectUtils.mergeDeep(this.options, options);
	}

	static getProjectDir(dir) {
		while (dir.length > 2 && !test("-f", join(dir, "settings.json"))) {
			dir = normalize(join(dir, ".."));
		}
		return dir;
	}

	/**
	 * Singleton factory to get instance
	 * @param name of project
	 * @param dirProject set to true in case of call from project middleware.js
	 * @returns {AppConfig}
	 */
	static getInstance(name = "", dirProject = "") {
		if (!AppConfig.instance) {
			if (!name)
				console.log(new Error("AppConfig initialized without project name"));
			let dirMain = normalize(process.cwd());
			if (dirProject) {
				dirProject = AppConfig.getProjectDir(dirProject);
				process.chdir(dirProject);
			}
			AppConfig.instance = new AppConfig(name);
			if (dirProject) {
				process.chdir(dirMain);
			}
		}

		return AppConfig.instance;
	}

	/**
	 * Read src/default-settings.js and then project settings.json
	 */
	read() {
		// Make sure that this.defaults and this.options are 2 seperate objects
		let defaults = JSON.stringify(DefaultConfig);
		this.defaults = JSON.parse(defaults);
		this.options = JSON.parse(defaults);
		if (process.env.isNew != undefined) {
			// // Hack for new project, to prevent passing a var through the call stack
			return this.options;
		}
		let settings = join(this.dirProject, "settings.json");
		if (test("-f", settings)) {
			this.mergeInto(settings);
		} else {
			console.log(`Project settings ${settings} not found (yet)`);
		}
	}

	/**
	 * Log overridden config settings to console
	 */
	static showConfig(options = null) {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let checkProjects = options ? false : true;
		if (!options) options = cfg.defaults;
		let changes = diff(cfg.defaults, cfg.options);
		let cols = [10, 50, 50, 50];
		let line = "".padEnd(cols[0] + cols[1] + cols[2] + cols[3], "-");
		console.log(line);
		console.log("Default configuration settings:");
		console.log(line);
		console.log(ObjectUtils.toString(options, false));
		console.log("");
		console.log(line);
		console.log("Project configuration changes, overrides of default settings:");
		let output = "Kind".padEnd(cols[0], " ");
		output += "Path".padEnd(cols[1], " ");
		output += "Application".padEnd(cols[2], " ");
		output += "Project".padEnd(cols[3], " ");
		console.log(output);
		console.log(line);
		output = "";
		let paths = [];
		Object.values(changes).forEach(value => {
			let isArrayChange = false;
			let path = value.path.join("/");
			if (paths.includes(path)) {
				return;
			} else {
				paths.push(path);
			}
			let present = value.kind;
			if (present == "D") return;
			switch (present) {
				case "N":
					present = "Added";
					break;
				case "A":
					isArrayChange = true;
				case "E":
					present = "Edited";
					break;
			}
			output += present.padEnd(cols[0], " ");
			output += path.padEnd(cols[1], " ");
			function convert(value) {
				let retVal = value;
				if (value == undefined) {
					retVal = "";
				} else if (typeof value == "object" || Array.isArray(value)) {
					retVal = "\n" + JSON.stringify(value, null, 2);
				}
				return String(retVal);
			}
			if (isArrayChange) {
				// output += convert(value.with);
				output += "\n"; // Don't show nature of change. Would distort layout
			} else {
				output += convert(value.lhs).padEnd(cols[2], " ");
				output += convert(value.rhs).padEnd(cols[3], " ") + "\n";
			}
		});
		console.log(output);
		if (!checkProjects) return;
		// Check validity of settings.json structure in all known projects
		// While doing that, check version number
		let project,
			projects = cfg.options.projects,
			saydHello = false;
		for (let i = 0; projects && i < projects.length; i++) {
			project = projects[i];
			let opts = FileUtils.readJsonFile(project, true);
			if (opts.version != undefined && opts.version != options.version) {
				if (!saydHello) {
					log.info(
						`Checking project setting(s).Should be version ${options.version}`,
					);
					saydHello = true;
				}
				log.warn(`- Version number ${opts.version} in ${project}`);
			}
		}

		if (saydHello) {
			log.info("... done");
		}
	}

	/**
	 * Initialize new project
	 */
	static initNewProject() {
		process.env.isNew = "true"; // Hack to prevent passing a var through the call stack
		let cfg = AppConfig.getInstance("cookware-headless-ice");
		let dir = join(cfg.dirMain, "default-project");
		if (!test("-d", dir)) {
			console.error(`Couldn't find directory ${dir}`);
			return;
		}
		console.log("Initializing new project directory");
		cp("-fr", join(dir, sep, "*"), join(cfg.dirProject, sep));
		cfg.read();
		let log = Logger.getInstance(cfg.options.logging);
		process.on("uncaughtException", err => {
			if (!log.isShuttingDown) {
				console.log(Logger.error2string(err));
			}
		});
		createDirTree(cfg.dirProject, cfg.options.newProject.dirStructure, true);
		console.log("... done");
	}
}
