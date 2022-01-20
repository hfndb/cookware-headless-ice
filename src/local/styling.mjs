import { basename, dirname, join, normalize, sep } from "path";
import autoprefixer from "autoprefixer";
import parcelCss from "@parcel/css";
import postcss from "postcss";
import shelljs from "shelljs";
import { getChangeList, FileStatus, AppConfig, Logger } from "../lib/index.mjs";
import { Beautify } from "../lib/beautify.mjs";
import { FileUtils, removeObsolete } from "../lib/files.mjs";
import { Stripper } from "../lib/stripping.mjs";
import { StringExt } from "../lib/utils.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { Colors } from "./misc.mjs";
const { cp, exec, test } = shelljs;

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);
let colorCfg;

/**
 * Safety, used during file watching to block files that are just processed.
 * For principle, see switches and 'contact bounce'
 */
export class Double {
	/**
	 * @param {string} file
	 */
	static is(file) {
		let now = new Date().getTime();
		let last = Double.reg[file] || now - Double.interval - 10;

		if (now - last > Double.interval) {
			Double.reg[file] = now;
			return false;
		}
		return true;
	}
}
Double.interval = 1 * 1900; // Assume max. 1.9 sec. for processing
Double.reg = {};

/**
 * Handling of Sass files
 *
 * @todo Perhaps implement Rust version of Sass transcompiler - see /docs/languages.md and
 * @see https://www.npmjs.com/package/@connorskees/grass
 * @see https://github.com/kaj/rsass
 */
export class SassFiles {
	constructor() {
		this.deps = new Map();
		let outDir = SassUtils.getOutputDir();
		this.changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.sass.dirs.source),
			targetPath: outDir,
			sourceExt: [".scss"],
			targetExt: ".css",
			excludeList: cfg.options.sass.autoGenerated.exclude,
		});

		// Read imports
		this.changeList.forEach(entry => {
			this.read(entry);
		});
	}

	/**
	 * Get an entry in this.changelist based on source file
	 *
	 * @param {string} file
	 */
	getEntry(file) {
		return this.changeList.find(el => el.source == file);
	}

	/**
	 * Translate an imported name to a file name
	 *
	 * @param {string} fromDir
	 * @param {string} file
	 */
	getImport(fromDir, file) {
		let [d, f] = this.getDirFile(fromDir, file);

		if (!f.startsWith("_")) f = "_" + file;
		if (!f.endsWith(".scss")) f += ".scss";
		return join(d, f);
	}

	/**
	 * @param {string} fromDir
	 * @param {string} file
	 * @returns {string[]} [dir name, file name]
	 */
	getDirFile(fromDir, file) {
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
	 * @param {string} file
	 */
	importChanged(compareWith, file) {
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
	 * @param {string} file
	 */
	importsLatestChange(file) {
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
	 *
	 * @param {string} file
	 */
	static isImport(file) {
		return basename(file).startsWith("_");
	}
	/**
	 * Extract imports from a file
	 *
	 * @param {FileStatus} entry
	 */
	read(entry) {
		let fullPath = join(entry.dir, entry.source);
		let result = StringExt.matchAll(
			`@import ["']+(.*)["']+;`,
			FileUtils.readFile(fullPath),
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
	 * @param {string} content
	 *
	 */
	static addPrefixes(content) {
		let result = postcss([autoprefixer]).process(content);

		result.warnings().forEach(function(warn) {
			log.warn("Warning autoprefixer: " + warn.toString());
		});

		return result.css;
	}

	/**
	 * Beautify a .scss file. Read from disk and write
	 *
	 * @param {FileStatus} entry
	 * @returns {boolean} if any transcompiling error on the way
	 */
	static beautify(entry) {
		let toReturn = true;
		// Auto generated CSS to skip
		if (!colorCfg) colorCfg = Colors.getConfig();
		let skip = !colorCfg || (colorCfg && entry.source == colorCfg.sass);

		if (!skip && cfg.options.server.beautify.includes("sass")) {
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
	 *
	 * @param {boolean} verbose
	 * @param {boolean} isWatching
	 */
	static compile(verbose, isWatching = false) {
		let srcDir = join(cfg.dirProject, cfg.options.sass.dirs.source);
		if (!test("-d", srcDir)) {
			log.info(
				`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`,
			);
			return;
		}
		let fls = new SassFiles();
		let outDir = SassUtils.getOutputDir();
		let processed = [];
		let saydHello = false;
		let path = join(cfg.dirProject, cfg.options.sass.dirs.source);

		if (!test("-e", path)) {
			log.info(
				`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to transcompile ignored`,
			);
			return;
		}

		function write(entry) {
			if (!saydHello && verbose) {
				saydHello = true;
				log.info("Transcompiling Sass");
			}
			SassUtils.compileFile(entry, true);
			processed.push(entry.target);
		}

		fls.changeList.forEach(entry => {
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
			allowedExtensions: [".css"],
		}).forEach(file => {
			let path = join(outDir, file);
			if (!test("-f", path)) {
				cp(join(cfg.dirProject, cfg.options.sass.dirs.source, file), path);
			}
			processed.push(path);
		});

		let ro = Object.assign({}, cfg.options.sass.removeObsolete); // Copy object
		ro.exclude.concat(cfg.options.sass.autoGenerated); // Ignore auto-generated files
		removeObsolete(ro, processed, outDir, ".css");

		if (saydHello && verbose) {
			log.info("... done");
		} else if (verbose) {
			log.info("No changes in Sass files found");
		}
	}

	/**
	 * Transcompile Sass file, using the configuration in settings.json
	 *
	 * @param {FileStatus} entry
	 * @param {boolean} verbose
	 * @returns success
	 *
	 * @see https://parceljs.org/
	 */
	static compileFile(entry, verbose = true) {
		let session = SessionVars.getInstance();

		if (SassFiles.isImport(entry.source) || !SassUtils.beautify(entry)) {
			return false;
		}

		try {
			/**
			 * During transition from node-sass to (Dart) sass,
			 * the node-sass legacy API was implemented. However...
			 * this API will be dropped in version 2.0.0, so
			 * produce a compressed (stripped) version here.
			 *
			 * Further more... the npm package sass is buggy.
			 * Therefore use the dart-sass binary, see README.md
			 */
			let cmd = `${join(cfg.dirMain, "bin", "sass")} ${entry.source}`;
			let sassDir = join(cfg.dirProject, cfg.options.sass.dirs.source);
			let result = exec(`cd ${sassDir}; ${cmd}`, { async: false, silent: true });
			if (result.code != 0) {
				log.warn(result.stderr);
				return;
			}
			let prefixed = SassUtils.addPrefixes(result.stdout);
			FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);
			session.add(ProcessingTypes.sass, entry.target);

			// Also write a stripped version
			let file = FileUtils.getSuffixedFile(
				entry.target,
				cfg.options.stripping.suffix,
			);
			let out = join(entry.targetDir, file);

			switch (cfg.options.sass.stripper) {
				case "parcel-css":
					let { code } = parcelCss.transform({
						filename: out,
						code: Buffer.from(prefixed),
						minify: true,
					});
					FileUtils.writeFile(entry.targetDir, file, code, false);
					break;
				case "stripper":
					// See Node.js bug @ Stripper.stripCss()
					let stripped = Stripper.stripCss(prefixed);
					FileUtils.writeFile(entry.targetDir, file, stripped, false);
					break;
				case "yui-compressor":
					cmd = `yui-compressor --type css -o ${out} ${join(
						entry.targetDir,
						entry.target,
					)}`;
					result = exec(cmd, { async: false, silent: true });
					if (result.code != 0) {
						throw new Error(result.stderr);
					}
					break;
			}
		} catch (err) {
			log.warn(
				`- Failed to trancompile file: ${entry.source}`,
				Logger.error2string(err),
			);
			return false;
		}
		return true;
	}

	/**
	 * Get CSS output directory
	 */
	static getOutputDir() {
		let outputDir = "";
		if (test("-d", join(cfg.dirProject, cfg.options.sass.dirs.output))) {
			// In case of local project
			outputDir = join(cfg.dirProject, cfg.options.sass.dirs.output);
		} else if (test("-d", cfg.options.sass.dirs.output)) {
			// In case of hosting
			outputDir = cfg.options.sass.dirs.output;
		} else {
			log.error("Sass output directory couldn't be determined");
		}
		return outputDir;
	}
}
