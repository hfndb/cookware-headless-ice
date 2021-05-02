import { basename, dirname, extname, join, normalize, sep } from "path";
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
 * Safety, used during file watching to block files that are just processed.
 * For principle, see switches and 'contact bounce'
 */
export class Double {
	static _instance: Double;
	static interval = 1 * 1900; // Assume max. 1.9 sec. for processing
	static reg: { [key: string]: number } = {};

	static is(file: string): boolean {
		let now = new Date().getTime();
		let last = Double.reg[file] || now - Double.interval - 10;

		if (now - last > Double.interval) {
			Double.reg[file] = now;
			return false;
		}
		return true;
	}
}

/**
 * Handling of Sass files
 */
export class SassFiles {
	changeList: FileStatus[]; // list of all Sass files
	private deps: Map<string, string[]> = new Map();

	constructor() {
		this.changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.sass.dirs.source),
			targetPath: SassUtils.getOutputDir(),
			sourceExt: [".scss"],
			targetExt: ".css"
		});

		// Read imports
		this.changeList.forEach((entry: FileStatus) => {
			this.read(entry);
		});
	}

	/**
	 * Get an entry in this.changelist based on source file
	 */
	private getEntry(file: string) {
		return this.changeList.find(el => el.source == file);
	}

	/**
	 * Translate an imported name to a file name
	 */
	private getImport(fromDir: string, file: string): string {
		let [d, f] = this.getDirFile(fromDir, file);
		if (!f.startsWith("_")) f = "_" + file;
		if (!f.endsWith(".scss")) f += ".scss";
		return join(d, f);
	}

	/**
	 * @returns {string[]} [dir name, file name]
	 */
	private getDirFile(fromDir: string, file: string): string[] {
		let path = join(fromDir, file);
		let r = ["", path];
		if (path.includes(sep)) {
			r[0] = normalize(dirname(path));
			r[1] = basename(path);
		}
		return r;
	}

	/**
	 * See if file needs transcompiling.
	 *
	 * @param {number} compareWith Highest level last modification
	 * @param {file} file
	 */
	importChanged(compareWith: number, file: string): boolean {
		return compareWith < this.importsLatestChange(file);
	}

	/**
	 * Look for the last modification of an imported file
	 *
	 * Apart from the question 'am I changed?'
	 * look at 'are imported files changed?'
	 * Then dig deeper and look further in the same way.
	 * For each next level of import:
	 * 'Are imported files in imported files changed?'
	 *
	 * Recursive introspection of imports in retrospective 😀
	 *
	 * @param {file} file
	 */
	private importsLatestChange(file: string): number {
		let imports = this.deps.get(file) || [];
		let latest = 0; // latest change of imported file
		for (let i = 0; i < imports.length; i++) {
			// Imports in file
			let im = imports[i];
			let fl = this.getEntry(im);
			if (fl) latest = Math.max(latest, fl.lastModified);
			// Recurse by looking at imported files in file
			latest = Math.max(latest, this.importsLatestChange(im));
		}

		return latest;
	}

	/**
	 * See if a file is an import (prefix _)
	 */
	static isImport(file: string): boolean {
		return basename(file).startsWith("_");
	}

	/**
	 * Extract imports from a file
	 */
	private read(entry: FileStatus): void {
		let fullPath = join(entry.dir, entry.source);
		let result = StringExt.matchAll(
			`@import ["']+(.*)["']+;`,
			FileUtils.readFile(fullPath)
		);
		let [d, f] = this.getDirFile("", entry.source);
		for (let i = 0; i < result.length; i++) {
			let lst = this.deps.get(entry.source) || [];
			let fl = this.getImport(d, result[i][0]);
			lst.push(fl);
			this.deps.set(entry.source, lst);
		}
	}
}

/**
 * Alter content of Sass files, transcompile to CSS
 */
export class SassUtils {
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
	 * Beautify a .scss file. Read from disk and write
	 * @returns {boolean} if any transcompiling error on the way
	 */
	static beautify(entry: FileStatus): boolean {
		let toReturn = true;
		if (
			cfg.options.server.beautify.includes("sass") &&
			entry.source != cfg.options.sass.colors.sass
		) {
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
	 * Transcompile all changed or new Sass files
	 */
	static compile(verbose: boolean, isWatching: boolean = false): void {
		let fls = new SassFiles();
		let outDir = SassUtils.getOutputDir();
		let processed: string[] = [];
		let saydHello = false;

		let path = join(cfg.dirProject, cfg.options.sass.dirs.source);
		if (!test("-e", path)) {
			log.warn(
				`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to transcompile ignored`
			);
			return;
		}

		function write(entry: FileStatus) {
			if (!saydHello && verbose) {
				saydHello = true;
				log.info("Transcompiling Sass");
			}
			SassUtils.compileFile(entry, true);
			processed.push(entry.target);
		}

		fls.changeList.forEach((entry: FileStatus) => {
			if (SassFiles.isImport(entry.source)) return;
			if (isWatching && Double.is(entry.source)) return;
			if (
				entry.isNewOrModified() ||
				fls.importChanged(entry.lastModified, entry.source)
			) {
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
	 * Transcompile Sass file, using the configuration in settings.json
	 *
	 * @returns success
	 */
	static compileFile(entry: FileStatus, verbose: boolean = true): boolean {
		const sass = require("node-sass");
		let options = cfg.options.dependencies.nodeSass.config;
		let session = SessionVars.getInstance();

		if (SassFiles.isImport(entry.source) || !SassUtils.beautify(entry)) {
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
				`- Failed to trancompile file: ${entry.source}`,
				Logger.error2string(err)
			);
			return false;
		}

		return true;
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
}
