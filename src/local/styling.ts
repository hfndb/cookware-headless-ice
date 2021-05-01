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
import { StringExt } from "../lib/utils";
import { ProcessingTypes, SessionVars } from "../sys/session";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);

interface prefixResult {
	warnings: Function;
	css: string;
}

/**
 * Safety for beautifying files. To block files that are just beautified
 */
export class Double {
	static _instance: Double;
	static reg: { [key: string]: number } = {};

	static is(file: string): boolean {
		let interval = 1 * 2000; // Assume max. 2 sec. to beautify
		let now = new Date().getTime();
		let last = Double.reg[file] || now - interval - 10;

		if (now - last > interval) {
			Double.reg[file] = now;
			return false;
		}
		return true;
	}
}

export class SassUtils {
	private changeList: FileStatus[] = []; // list of all Sass files
	private deps: any = {};
	static preventDoubles: string[] = []; // For preventing double transcompiling during watching

	/**
	 * Get an entry in this.changelist based on source file
	 */
	getEntry(file: string) {
		return this.changeList.find(el => el.source == file);
	}

	/**
	 * See if file needs compiling
	 */
	importChanged(entry: FileStatus): boolean {
		let maxImport = 0; // latest change of imported file
		let imports = this.deps[entry.source] || [];
		for (let i = 0; i < imports.length; i++) {
			let im = imports[i];
			if (!im.startsWith("_")) im = "_" + im;
			if (!im.endsWith(".scss")) im += ".scss";
			let file = this.getEntry(im);
			if (file) maxImport = Math.max(maxImport, file.lastModified);
		}
		return entry.targetLastModified < maxImport;
	}

	/**
	 * Extract includes from a file
	 */
	read(entry: FileStatus): void {
		let fullPath = join(entry.dir, entry.source);
		let result = StringExt.matchAll(
			`@import ["']+(.*)["']+;`,
			FileUtils.readFile(fullPath)
		);
		for (let i = 0; i < result.length; i++) {
			if (!this.deps[entry.source]) this.deps[entry.source] = [];
			this.deps[entry.source].push(result[i][0]);
		}
	}

	/**
	 * Beautify a .scss file. Read from disk and write
	 */
	static beautify(entry: FileStatus): boolean {
		let toReturn = true;
		if (cfg.options.server.beautify.includes("sass")) {
			let fullPath = join(entry.dir, entry.source);
			let source = FileUtils.readFile(fullPath);
			source = Beautify.content(entry.source, source);
			if (source) {
				FileUtils.writeFile(entry.dir, entry.source, source, false);
			} else {
				toReturn = false;
			}
		}
		return toReturn;
	}

	/**
	 * See if a file is an import (prefix _)
	 */
	static isImport(file: string): boolean {
		return basename(file).startsWith("_");
	}

	/**
	 * Get CSS output directory
	 */
	static getOutputDir(): string {
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
	static compile(verbose: boolean, isWatching: boolean = false): void {
		let deps = new SassUtils();
		let outDir = SassUtils.getOutputDir();
		let processed: string[] = [];
		let saydHello = false;

		let path = join(cfg.dirProject, cfg.options.sass.dirs.source);
		if (!test("-e", path)) {
			log.warn(
				`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`
			);
			return;
		}

		deps.changeList = getChangeList({
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

		// Read dependencies (imports)
		deps.changeList.forEach((entry: FileStatus) => {
			deps.read(entry);
		});

		deps.changeList.forEach((entry: FileStatus) => {
			if (SassUtils.isImport(entry.source)) return;
			if (isWatching && Double.is(entry.source)) return;
			if (entry.isNewOrModified() || deps.importChanged(entry)) {
				write(entry);
			}
			processed.push(entry.target);
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
		const sass = require("node-sass");
		let options = cfg.options.dependencies.nodeSass.config;
		let session = SessionVars.getInstance();

		if (SassUtils.isImport(entry.source) || !SassUtils.beautify(entry)) {
			return false;
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
