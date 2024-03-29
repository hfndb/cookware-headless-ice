"use strict";
import { isAbsolute, join } from "node:path";
import shelljs from "shelljs";
import { AppConfig, FileStatus, FileUtils, Logger } from "../generic/index.mjs";
import { Stripper } from "../generic/source/stripping.mjs";
import { exec, rm, test } from "../generic/sys.mjs";
import { SourceUtils } from "./source.mjs";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);

export class JavascriptUtils {
	/**
	 * Get HTML output directory
	 */
	static getOutputDir() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let outputDir = "";

		if (test("-d", join(cfg.dirProject, cfg.options.javascript.dirs.output))) {
			// In case of relative path
			outputDir = join(cfg.dirProject, cfg.options.javascript.dirs.output);
		} else if (
			isAbsolute(cfg.options.javascript.dirs.output) &&
			test("-d", cfg.options.javascript.dirs.output)
		) {
			// In case of absolute path
			outputDir = cfg.options.javascript.dirs.output;
		} else {
			log.warn("JavaScript output directory couldn't be determined");
		}

		return outputDir;
	}

	/**
	 * Create compressed JavaScript bundles
	 *
	 * @returns array with output files
	 */
	static bundle() {
		let outDir = JavascriptUtils.getOutputDir();
		let nodeExec = join(cfg.dirMain, "node_modules", "node", "bin", "node");
		let execPath = join(cfg.dirMain, "src", "local");
		let lst = [];
		let path;

		// Generate bundles
		Bundle.init();
		for (let i = 0; Bundle.bundles && i < Bundle.bundles.length; i++) {
			let bundle = Bundle.bundles[i];
			Bundle.create(bundle, i == 0);
			lst.push(bundle.output);
		}

		return lst;
	}
}

/**
 * Class to handle JavaScript bundles
 */
export class Bundle {
	static bundles;

	static init() {
		let path;

		if (!Bundle.bundles) {
			path = join(cfg.dirProject, "dev", "bundles.json");
			Bundle.bundles = test("-f", join(path))
				? FileUtils.readJsonFile(path)
				: null;
		}
	}

	/**
	 * Internal method to check need for writing bundle
	 *
	 * @param {Object} bundle
	 * @param {string} outDir
	 */
	static isChanged(bundle, outDir) {
		if (!test("-f", join(outDir, bundle.output))) return true;
		let changed = false;
		let path = join(cfg.dirProject, cfg.options.javascript.dirs.source);
		let last = FileUtils.getLastModified(outDir, bundle.output);

		bundle.source.forEach(item => {
			let srcFile = join(path, item);
			let ths = FileUtils.getLastModified(path, item);
			if (ths > last) {
				changed = true;
			}
		});

		return changed;
	}

	/**
	 * If necessary, write bundle
	 *
	 * @param {Object} bundle
	 * @param {boolean} writeDict
	 */
	static create(bundle, writeDict) {
		let outDir = JavascriptUtils.getOutputDir();
		if (!Bundle.isChanged(bundle, outDir)) return;
		let content = "";
		let dir = join(cfg.dirProject, cfg.options.javascript.dirs.source);
		let toWrite = "";
		let useStrictNeeded = true; // Only use once, at the top

		rm("-f", join(outDir, bundle.output));
		if (bundle.header) {
			toWrite = FileUtils.readFile(join(cfg.dirProject, bundle.header));
			useStrictNeeded = false;
		}

		bundle.source.forEach(item => {
			content = FileUtils.readFile(join(dir, item));
			if (!useStrictNeeded) {
				content = content.replace('"use strict";', "");
			}
			if (bundle.removeImports) {
				content = Stripper.stripImports(content);
			}
			useStrictNeeded = false;
			toWrite += content.trim() + "\n";
		});

		// Write bundle
		let status = new FileStatus(dir);
		status.setSource(bundle.output, ".js");
		status.setTarget(
			join(cfg.dirProject, cfg.options.javascript.dirs.output),
			".js",
		);
		if (SourceUtils.compileFile(status, toWrite, false, bundle)) {
			log.info(`- written Javascript bundle ${bundle.output}`);
		}

		return;
	}

	/**
	 * Detect where a specific source file needs stripping of imports
	 *
	 * @param {string} file
	 */
	static needsStripping(file) {
		let toReturn = false;
		Bundle.init();

		for (
			let i = 0;
			Bundle.bundles && i < Bundle.bundles.length && !toReturn;
			i++
		) {
			let bundle = Bundle.bundles[i];
			if (bundle.source.includes(file) && bundle.removeImports) {
				toReturn = true;
			}
		}

		return toReturn;
	}
}

/**
 * Generate HTML formatted docs from JavaScript sources in src.
 * Uses configuration in settings.json
 */
export function generateJsDocs() {
	// Make paths relative to project directory
	let options = cfg.options.dependencies.jsdoc.config;
	let dir = options.opts.destination;

	options.opts.destination = join(cfg.dirProject, dir);
	for (let i = 0; i < options.source.include.length; i++) {
		options.source.include[i] = join(cfg.dirProject, options.source.include[i]);
	}

	// Write temp version of config
	FileUtils.writeJsonFile(options, cfg.dirTemp, ".jsdoc.json", false);

	// Create or clean output directory
	if (test("-d", options.opts.destination)) {
		rm("-rf", join(options.opts.destination, "*"));
	} else {
		FileUtils.mkdir(options.opts.destination);
	}

	log.info(`Generating API docs of JavaScript files, in ${dir}`);
	exec(`jsdoc --configure ${join(cfg.dirTemp, ".jsdoc.json")}`, { async: true });
}
