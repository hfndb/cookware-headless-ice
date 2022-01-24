"use strict";

import { dirname, join } from "path";
import shelljs from "shelljs";
import { Beautify } from "../lib/beautify.mjs";
import { getChangeList, AppConfig, Logger } from "../lib/index.mjs";
import { FileUtils, removeObsolete } from "../lib/files.mjs";
import { FileStatus } from "../lib/file-diff.mjs";
import { Shrinker, Stripper } from "../lib/stripping.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { compileFile } from "./babel.mjs";
import { JavascriptUtils } from "./javascript.mjs";
import { Tags } from "./tags.mjs";
const { exec, test } = shelljs;

/**
 * Class to handle JavaScript, Flow and TypeScript source
 */
export class SourceUtils {
	/**
	 * Main function to compile all source in ./src
	 *
	 * @param {boolean} verbose
	 */
	static compile(verbose) {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		let outDir = JavascriptUtils.getOutputDir();
		/**
		 * @type {string[]}
		 */
		let processed = [];
		let saydHello = false;
		let session = SessionVars.getInstance();
		let sourceExt =
			cfg.options.javascript.compiler == ProcessingTypes.typescript
				? [".ts", ".cts"]
				: [".js", ".cjs"];
		let path = join(cfg.dirProject, cfg.options.javascript.dirs.source);
		if (!test("-e", path)) {
			log.info(
				`Path ./${cfg.options.javascript.dirs.source} doesn't exist. Request to compile ignored`,
			);
			return;
		}

		/**
		 * @param {FileStatus} entry
		 */
		function write(entry) {
			if (!saydHello && verbose) {
				saydHello = true;
				log.info(`Transcompiling ${cfg.options.javascript.compiler}`);
			}
			SourceUtils.compileFile(entry, "", true);
		}

		let ro = Object.assign({}, cfg.options.javascript.removeObsolete); // Copy object
		ro.exclude = ro.exclude.concat(cfg.options.javascript.autoGenerated); // Ignore auto-generated files
		let changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.javascript.dirs.source),
			targetPath: outDir,
			sourceExt: sourceExt,
			targetExt: ".js",
			excludeList: ro.exclude,
		});

		changeList.forEach(entry => {
			processed.push(entry.target);
			if (entry.isNewOrModified()) {
				session.add(
					cfg.options.javascript.compiler == "flow"
						? "javascript"
						: cfg.options.javascript.compiler,
					entry.source,
				);
				write(entry);
			}
		});

		JavascriptUtils.bundle().forEach(file => {
			processed.push(file);
		});

		removeObsolete(ro, processed, outDir, ".js");

		if (saydHello && verbose) {
			Tags.forProject(cfg.options.javascript.dirs.source);
			changeList.forEach(entry => {
				if (entry.isNewOrModified()) {
					Tags.forFile(join(cfg.options.javascript.dirs.source, entry.source));
				}
			});
			log.info(`... done`);
		} else if (verbose) {
			log.info(`No changed ${cfg.options.javascript.compiler} files found`);
		}
	}

	/**
	 * Compile one file
	 *
	 * @param {FileStatus} entry
	 * @param {string} source
	 * @param {boolean} verbose
	 * @param {boolean} isBundle
	 */
	static compileFile(entry, source, verbose = true, isBundle = false) {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let forBrowser = dirname(entry.target).includes("browser") || isBundle;
		if (!source) source = FileUtils.readFile(join(entry.dir, entry.source));

		// First beautify
		if (!isBundle && cfg.options.server.beautify.includes("src")) {
			source = Beautify.content(entry.source, source);
			if (!source) {
				return false;
			}
			FileUtils.writeFile(entry.dir, entry.source, source, false);
		}

		// In case file is browser related and removeImports is set to true...
		if (!isBundle && forBrowser && cfg.options.javascript.browser.removeImports) {
			// Compiled file doesn't need imports
			source = Stripper.stripImports(source);
		}

		// Transcompile source
		switch (cfg.options.javascript.transcompiler) {
			case "babel":
				source = compileFile(entry, source, forBrowser, verbose);
				break;
		}
		if (!source) {
			return false;
		}

		// Write a stripped version or else... write
		if (isBundle || forBrowser) {
			let file = FileUtils.getSuffixedFile(
				entry.target,
				cfg.options.stripping.suffix,
			);
			let shr = new Shrinker();
			let tmpFile = join(cfg.dirTemp, "temp.js");

			// First shrink aka shorten
			source = shr.shrinkFile(source, false);

			// The shrink aka compress
			switch (cfg.options.javascript.stripper) {
				case "stripper":
					source = Stripper.stripJs(source);
					FileUtils.writeFile(entry.targetDir, file, source, false);
					break;
				case "yui-compressor":
					FileUtils.writeFile("", tmpFile, source, false);

					let output = join(entry.targetDir, entry.target);
					let cmd = `yui-compressor --type js -o ${output} ${tmpFile}`;
					let result = exec(cmd, { async: false, silent: true });
					if (result.code != 0) {
						log.warn(result.stderr);
						return false;
					}
					source = FileUtils.readFile(output);
					break;
				default:
					return false; // Unknown
			}
		} else {
			// Not for a browser, write transcompiled code
			FileUtils.writeFile(entry.targetDir, entry.target, source, false);
		}
		return true;
	}
}
