"use strict";
import { basename, dirname, join } from "node:path";
import { Beautify } from "../generic/beautify.mjs";
import { getChangeList, AppConfig, Logger } from "../generic/index.mjs";
import { FileUtils, removeObsolete } from "../generic/file-system/files.mjs";
import { FileStatus } from "../generic/file-system/diff.mjs";
import { Shrinker } from "../generic/source/shrinking.mjs";
import { Stripper } from "../generic/source/stripping.mjs";
import { cp, exec, test } from "../generic/sys.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { compileFile } from "./babel.mjs";
import { JavascriptUtils } from "./javascript.mjs";
import { Tags } from "./tags.mjs";

/**
 * Class to handle JavaScript, Flow and TypeScript source
 */
export class SourceUtils {
	static debug = false; // Debug mode

	/**
	 * Main function to compile all source in ./src
	 *
	 * @param {boolean} verbose
	 */
	static compile(verbose) {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		let outDir = JavascriptUtils.getOutputDir();
		if (!outDir) return;

		/**
		 * @type {string[]}
		 */
		let processed = [];
		let saydHello = false;
		let session = SessionVars.getInstance();
		let sourceExt =
			cfg.options.javascript.compiler == ProcessingTypes.typescript
				? [".ts", ".cts"]
				: [".js", ".cjs", ".mjs"];
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
		let write = entry => {
			if (!saydHello && verbose) {
				saydHello = true;
				log.info(`Transcompiling ${cfg.options.javascript.compiler}`);
			}
			if (entry.source.endsWith(".mjs")) {
				SourceUtils.stripModule(entry, true);
			} else {
				SourceUtils.compileFile(entry, "", true);
			}
		};

		let ro = Object.assign({}, cfg.options.javascript.removeObsolete); // Copy object
		ro.exclude = ro.exclude.concat(cfg.options.javascript.autoGenerated); // Ignore auto-generated files
		let changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.javascript.dirs.source),
			targetPath: outDir,
			sourceExt: sourceExt,
			targetExt: ".js",
			excludeList: ro.exclude,
			correctMjs: true,
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
		removeObsolete(ro, processed, outDir, ".mjs");

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
	 * @param {Object} [bundle]
	 */
	static compileFile(entry, source, verbose = true, bundle) {
		let cfg = AppConfig.getInstance(),
			file = FileUtils.getSuffixedFile(entry.target, cfg.options.stripping.suffix),
			log = Logger.getInstance(),
			forBrowser = dirname(entry.target).includes("browser"),
			isBundle = false,
			orgSource = source;

		if (bundle) {
			forBrowser = isBundle = true;
		}
		let output = join(entry.targetDir, entry.target);
		if (!source)
			source = orgSource = FileUtils.readFile(join(entry.dir, entry.source));

		// First beautify
		if (!isBundle && cfg.options.server.beautify.includes("src")) {
			source = Beautify.content(entry.source, source);
			if (!source) return false; // Error during beautify
			if (source != orgSource)
				FileUtils.writeFile(entry.dir, entry.source, source, false, true);
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
		if (!source) return false;

		let written = FileUtils.writeFile(
			entry.targetDir,
			entry.target,
			source,
			true,
		);

		if (!forBrowser) return written;
		// ------------------------------------------------------
		// For browser from here
		// ------------------------------------------------------
		let shr = Shrinker.getInstance(),
			tmpFile = join(cfg.dirTemp, "temp.js");

		// First shorten
		source = shr.shrinkFile(entry.source, source);

		// Then shrink aka compress
		if (cfg.options.javascript.verbose.stripping)
			log.info(`- Stripping ${entry.source}`);
		switch (cfg.options.javascript.stripper) {
			case "stripper":
				source = Stripper.stripJs(source);
				break;
			case "yui-compressor":
				FileUtils.writeFile("", tmpFile, source, false);

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
		written = FileUtils.writeFile(entry.targetDir, file, source, false);

		if (isBundle && bundle.copyTo) {
			// Make extra copy
			cp("-fu", output, bundle.copyTo);
			let stripped = FileUtils.getSuffixedFile(
				bundle.copyTo,
				cfg.options.stripping.suffix,
			);
			cp(
				"-fu",
				join(entry.targetDir, file),
				join(dirname(bundle.copyTo), basename(stripped)),
			);
		}

		return written;
	}

	/**
	 * Special treatment for .mjs files:
	 * - Beautify and rewrite source
	 * - Remove all comments, indenting and write to output dir,
	 *     thus compacting & preserving line numbering for debugging
	 */
	static stripModule(entry, verbose = true) {
		let cfg = AppConfig.getInstance(),
			dir = join(cfg.dirProject, cfg.options.javascript.dirs.output),
			fi = FileUtils.getFileInfo(entry.dir, entry.source);
		let source = FileUtils.readFile(fi.full);
		let orgSource = source;

		source = Beautify.content(entry.source, source);
		if (!source) return; // Error during beautify
		if (source == orgSource) false;

		if (source != orgSource)
			FileUtils.writeFile(entry.dir, entry.source, source, false, true);

		if (fi.file.ext == ".mjs") {
			source = Stripper.stripJs(source, true);
			FileUtils.writeFile(entry.targetDir, entry.target, source, true);
		}
	}
}
