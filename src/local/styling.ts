import { basename, join } from "path";
import { cp, test, touch } from "shelljs";
import {
	getChangeList,
	AppConfig,
	FileStatus,
	FileUtils,
	Logger
} from "../lib";
import { Beautify } from "../lib/beautify";
import { removeObsolete } from "../lib/files";
import { ProcessingTypes, SessionVars } from "../sys/session";

interface prefixResult {
	warnings: Function;
	css: string;
}

export class SassUtils {
	/**
	 * Get CSS output directory
	 */
	static getOutputDir(): string {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let outputDir = "";
		if (test("-d", join(cfg.dirProject, cfg.options.sass.dirs.output))) {
			// In case of local project
			outputDir = join(cfg.dirProject, cfg.options.sass.dirs.output);
		} else if (test("-d", cfg.options.sass.dirs.output)) {
			// In case of hosting
			outputDir = cfg.options.sass.dirs.output;
		} else {
			log.error("JavaScript output directory couldn't be determined");
		}

		return outputDir;
	}

	/**
	 * Auto-prefix CSS with vendor specifics
	 *
	 */
	static addPrefixes(content: string): string {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);

		const autoprefixer = require("autoprefixer");
		const postcss = require("postcss");
		let result: prefixResult = postcss([autoprefixer]).process(content);
		result.warnings().forEach(function(warn: string) {
			log.warn("Warning autoprefixer: " + warn.toString());
		});
		return result.css;
	}

	/**
	 * Compile all changed or new Sass files
	 */
	static compile(verbose: boolean): void {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		let outDir = SassUtils.getOutputDir();
		let processed: string[] = [];
		let saydHello = false;

		let path = join(cfg.dirProject, cfg.options.sass.dirs.source);
		if (!test("-e", path)) {
			log.warn(
				`Path ./${
					cfg.options.sass.dirs.source
				} doesn't exist. Request to compile ignored`
			);
			return;
		}

		let changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.sass.dirs.source),
			targetPath: outDir,
			sourceExt: [".scss"],
			targetExt: ".css"
		});

		function write(entry: FileStatus) {
			if (!saydHello && verbose) {
				saydHello = true;
				log.info("Transcompiling Sass");
			}
			SassUtils.compileFile(entry, true);
			processed.push(entry.target);
		}

		let maxMixin = 0; // to get the latest modified mixin
		let maxSass = 0; // to get the latest modified other sass file
		changeList.forEach((entry: FileStatus) => {
			let isMixin = basename(entry.source).startsWith("_");
			if (isMixin) {
				maxMixin = Math.max(maxMixin, entry.lastModified);
			} else {
				maxSass = Math.max(maxSass, entry.lastModified);
			}

			if (!isMixin && entry.isNewOrModified()) {
				write(entry);
			}
		});

		// if (maxMixin > maxSass) {
		// 	console.log(`Mixin changed`);
		// } else if (maxMixin < maxSass) {
		// 	console.log(new Date(maxMixin), new Date(maxSass));
		// }

		changeList.forEach((entry: FileStatus) => {
			if (basename(entry.source).startsWith("_") || entry.isNewOrModified()) {
				return;
			}
			if (maxMixin > maxSass) {
				// Mixin changed, also compile remaining sass files
				write(entry);
				touch(join(entry.dir, entry.source)); // In order to prevent this from happening again
			} else {
				processed.push(entry.target);
			}
		});

		// Before removing obsolete css, look at plain css that belongs in output directory
		FileUtils.getFileList(join(cfg.dirProject, cfg.options.sass.dirs.source), {
			allowedExtensions: [".css"]
		}).forEach((file: string) => {
			let path = join(outDir, file);
			if (!test("-f", path)) {
				cp(join(cfg.dirProject, cfg.options.sass.dirs.source, file), path);
			}
			processed.push(path);
		});

		removeObsolete(cfg.options.sass.removeObsolete, processed, outDir, ".css");

		if (saydHello && verbose) {
			log.info("... done");
		} else if (verbose) {
			log.info("No changes in Sass files found");
		}
	}

	/**
	 * Compile Sass file, using the configuration in config.json
	 *
	 * @returns success
	 */
	static compileFile(entry: FileStatus, verbose: boolean = true): boolean {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		const sass = require("node-sass");
		let options = cfg.options.dependencies.nodeSass.config;
		let session = SessionVars.getInstance();

		if (basename(entry.source).startsWith("_")) {
			return false;
		}

		let fullPath = join(entry.dir, entry.source);
		let source = FileUtils.readFile(fullPath);

		if (cfg.options.server.beautify.includes("sass")) {
			source = Beautify.content(entry.source, source);
			if (source) {
				FileUtils.writeFile(entry.dir, entry.source, source, false);
			} else {
				return false;
			}
		}
		Object.assign(options, {
			file: join(entry.dir, entry.source),
			outFile: join(entry.targetDir, entry.target),
			sourceMap: entry.target.concat(".map")
		});

		try {
			let result = sass.renderSync(options);
			if (!result) {
				throw new Error("");
			}
			let prefixed = SassUtils.addPrefixes(result.css);
			FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);
			session.add(ProcessingTypes.sass, entry.target);
		} catch (err) {
			log.warn(
				`- Failed to compile file: ${entry.source}`,
				Logger.error2string(err)
			);
			return false;
		}

		return true;
	}
}
