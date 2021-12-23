import { readFileSync, statSync, watch, writeFileSync } from "fs";
import { basename, dirname, extname, join, sep } from "path";
import { fdir } from "fdir";
import lineByLine from "n-readlines";
import shelljs from "shelljs";
import { AppConfig } from "./config.mjs";
import { getDirList } from "./dirs.mjs";
import { Logger } from "./log.mjs";
import { ArrayUtils } from "./object.mjs";
import { StringExt } from "./utils.mjs";
const { mkdir, mv, rm, test, touch } = shelljs;

/**
 * Utility class with static utility methods for files and directories
 */
export class FileUtils {
	static ENCODING_UTF8 = "utf8";

	/**
	 * Method to safely remove a file
	 *
	 * @param path to json file to read
	 */
	static rmFile(path) {
		if (test("-f", path)) rm(path);
	}

	/**
	 * Method to safely read a json file
	 *
	 * @param path to json file to read
	 * @returns with read json content
	 */
	static readJsonFile(path, ignoreErrors = true) {
		let parsed = {};
		let file = basename(path);
		if (!test("-f", path)) {
			let log = Logger.getInstance();
			log.warn(`File ${file} not found in directory ${dirname(path)}`);
			return {};
		}
		let data = FileUtils.readFile(path);
		if (data) {
			try {
				parsed = JSON.parse(data);
			} catch (err) {
				console.error(`Error parsing ${path}\n`, Logger.error2string(err));
				console.error(`\

The structure of this file is invalid, meaning, messed up.
`);
			}
		} else if (!ignoreErrors)
			throw new Error(`No data retured whle reading ${file}`);
		return parsed;
	}

	/**
	 * Method to safely write a json file. Overwrites existing file
	 *
	 * @param content for json file to write
	 * @param path of file
	 */
	static writeJsonFile(content, dir, file, verbose = true) {
		let data = JSON.stringify(content, null, "\t");
		let log = Logger.getInstance();
		if (
			FileUtils.writeFile(dir, file, data, false) &&
			verbose &&
			process.env.NODE_ENV !== "test"
		) {
			log.info(`File written: ${file}`);
		}
	}

	/**
	 * Method to safely read a file.
	 */
	static readFile(path) {
		let data = "";
		try {
			data = readFileSync(path, FileUtils.ENCODING_UTF8);
		} catch (err) {
			let log = Logger.getInstance();
			log.error(`Error reading ${path}`, Logger.error2string(err));
			throw err;
		}
		return data;
	}

	/**
	 * Replace Carriage Return (CR, \r, on older Macs), CR followed by LF (\r\n, on WinDOS)
	 * with Line Feed (LF, \n, on Unices incl. Linux).
	 */
	static stripLineBreaks(str) {
		return str.replace(/\r?\n|\r/g, "\n");
	}

	/**
	 * Method to safely write to a file.
	 */
	static writeFile(dir, file, content, verbose, flag = "w") {
		let log = Logger.getInstance();
		let fullPath = join(dir, file);
		let dir4sure = dirname(fullPath);
		if (dir4sure && !test("-d", dir4sure)) {
			FileUtils.mkdir(dir4sure);
		}
		try {
			writeFileSync(fullPath, content, {
				encoding: FileUtils.ENCODING_UTF8,
				flag: flag,
			});
			if (verbose && process.env.NODE_ENV !== "test") {
				log.info(`- File written: ${file}`);
			}
		} catch (err) {
			log.error(`- Failed to write file ${fullPath}`, Logger.error2string(err));
			throw err;
		}
		return true;
	}

	/**
	 * Method to get a list of file(s) from:
	 * - a single file name
	 * - a directory
	 */
	static getFileList(path, opts = {}) {
		if (!test("-e", path)) {
			throw new Error("Path " + path + " doesn't exist");
		}
		let cfg = AppConfig.getInstance();
		let allowedExtensions =
			opts.allowedExtensions == undefined ? [] : opts.allowedExtensions;
		let excludeList = opts.excludeList == undefined ? [] : opts.excludeList;
		let recursive = opts.recursive == undefined ? true : opts.recursive;
		let files = [];
		let tns = {
			group: true,
		};
		if (!recursive) Object.assign(tns, { maxDepth: 0 }); // No effect
		const fl = new fdir().crawlWithOptions(path, tns).sync();
		for (let d = 0; d < fl.length; d++) {
			let dir = fl[d].dir;
			if (dir.startsWith(cfg.dirProject)) {
				dir = dir.substring(path.length + 1);
			}
			if (!recursive && dir.length > 0) continue;
			for (let f = 0; f < fl[d].files.length; f++) {
				let file = fl[d].files[f];
				if (excludeList.includes(file)) continue;
				if (
					allowedExtensions.length == 0 ||
					allowedExtensions.includes(extname(file))
				) {
					files.push(join(dir, file));
				}
			}
		}
		return files;
	}

	static getFileSize(file) {
		let info = statSync(file);
		return info.size;
	}

	/**
	 * Translate a file name to name with suffix
	 * For example: dir/file.txt becomes dir/file-suffix.txt
	 */
	static getSuffixedFile(path, suffix) {
		let dir = path.includes(sep) || path.includes("/") ? dirname(path) : "";
		let file = basename(path);
		let ext = extname(file); // Including dot
		file = basename(file, ext); // forget source file name and get stem only
		return join(dir, `${file}-${suffix}${ext}`);
	}

	/**
	 * Comparable with a console dir command to retrieve file names, size in bytes and last modified
	 * Returns object with key/value pairs; name (key), fileEntry (value).
	 */
	static dir(path, recursive = false) {
		let lst = new Map();
		let src = FileUtils.getFileList(path, { recursive: recursive });
		for (let i = 0; i < src.length; i++) {
			let file = src[i];
			let fullPath = join(path, file);
			let info = statSync(fullPath);
			let entry = {
				bytes: info.size,
				fullPath: fullPath,
				lastModified: info.mtime,
				lastModifiedMs: info.mtimeMs,
				type: extname(file),
				needsAction: false,
			};
			lst.set(file, entry);
		}
		return lst;
	}

	/**
	 * @returns Last modified timestamp
	 */
	static getLastModified(path, file) {
		let fullPath = join(path, file);
		return statSync(fullPath).mtimeMs;
	}

	/**
	 * @returns Last modified
	 */
	static getLastModifiedDate(path, file) {
		let fullPath = join(path, file);
		return statSync(fullPath).mtime;
	}

	static getLastChangeInDirectory(path, extensions, startAt = 0) {
		let retVal = startAt;
		let lst = FileUtils.getFileList(path, { allowedExtensions: extensions });
		lst.forEach(file => {
			retVal = Math.max(retVal, statSync(join(path, file)).mtimeMs);
		});
		return retVal;
	}

	/**
	 * Get a unique filename, provided given file already exists
	 */
	static getUniqueFileName(dir, file, ext) {
		let orgFile = file;
		let i = 1;
		while (test("-f", join(dir, file + ext))) {
			file = orgFile + "-" + i.toString().padStart(2, "0");
			i++;
		}
		return file + ext;
	}

	/**
	 * Get a temp filename, without directory or extension.
	 * Composed of Date.now() and random numerical suffix, with hyphen in between
	 * If called more than 1 millisecond apart, 100% unique.
	 */
	static getTempFileName(lengthSuffix) {
		// Date.now is updated every millisecond
		return Date.now() + "-" + StringExt.getRandom(lengthSuffix);
	}

	/**
	 * Search for occurences of a string in a file
	 * In opts.markFound a placeholder $ to insert the search string
	 *
	 * @returns array with arrays; 1st element line #, 2nd element data of line
	 */
	static searchInFile(path, searchFor, opts) {
		const regex = new RegExp(searchFor, opts.ignoreCase ? "i" : undefined);
		if (opts.markFound != "") {
			opts.markFound = opts.markFound.replace("$", searchFor);
		}
		let lr = new LineReader(path);
		let lineNr = 0;
		let retVal = [];
		do {
			let line = lr.next();
			if (line === false) break; // End of file
			lineNr++;
			let matched = line.match(regex);
			if ((opts.inverse && !matched) || (!opts.inverse && matched)) {
				if (opts.markFound != "") {
					line = line.replace(regex, opts.markFound);
				}
				if (opts.processor != undefined) {
					line = opts.processor(line);
				}
				retVal.push([lineNr, line.replace("\t", "")]);
			}
		} while (true);
		return retVal;
	}

	/**
	 * If a directory doesn't exist yet, create
	 */
	static mkdir(path) {
		if (!test("-e", path)) {
			mkdir("-p", path);
		}
	}

	/**
	 * Touch all files in a directory resursively.
	 * Default value for opts.resursive = true.
	 */
	static touchRecursive(path, opts) {
		if (!opts) opts = {};
		if (opts.recursive == undefined) opts.recursive = true;
		let files = FileUtils.getFileList(path, opts);
		for (let i = 0; i < files.length; i++) {
			touch(join(path, files[i]));
		}
	}
}

/**
 * Class to organize file watching
 */
export class FileWatcher {
	constructor(
		workingDir,
		projectDir,
		path,
		timeout,
		description,
		verbose = true,
	) {
		this.nowChanging = [];
		this.watchers = [];
		this.description = description;
		this.timeout = timeout;
		this.addWatch(workingDir, projectDir, path, verbose);
	}

	addWatch(workingDir, projectDir, path, verbose = true) {
		let log = Logger.getInstance();
		let fullPath = join(workingDir, projectDir, path);
		if (!test("-e", fullPath)) {
			log.info(
				`Path ./${join(projectDir, path)} doesn't exist. Request to watch ${
					this.description
				} ignored`,
			);
			return;
		}
		let isDir = test("-d", fullPath);
		if (!isDir) {
			fullPath = join(workingDir, projectDir); // Watch directory, not file (workaround for bug in Node.js)
		}
		this.watchers.push(
			watch(
				fullPath,
				{
					persistent: true,
					recursive: false,
					encoding: FileUtils.ENCODING_UTF8,
				},
				(event, filename) => {
					if (!filename) return;
					let file = isDir ? filename.toString() : path;
					if (isDir && !test("-f", join(fullPath, file))) {
						// File deleted. The 'rename' event occurs when:
						// - a new file is added,
						// - a file is deleted,
						// - buffer file is deleted - some text editor don't simply overwrite
						// log.warn(`File ./${join(fullPath, file)} is deleted`);
						return;
					} else if (isDir) {
						file = join(path, file); // Example: files.ts becomes lib/files.ts
					} else if (!isDir && filename != path) {
						// Seems to be a buffer file
						return;
					}
					// Delaying mechanisme to prevent a phenomenon like "contact bounce"
					// https://en.wikipedia.org/wiki/Switch#Contact_bounce
					if (this.nowChanging.includes(file)) return;
					let recycle = this.nowChanging.indexOf("-");
					if (recycle >= 0) {
						this.nowChanging[recycle] = file;
					} else {
						this.nowChanging.push(file);
					}
					// Bug in node.js (respond time)
					// See https://github.com/gruntjs/grunt-contrib-watch/issues/13
					setTimeout(() => {
						this.nowChanging[this.nowChanging.indexOf(file)] = "-"; // ready for recycling
						this.change(event, file);
					}, this.timeout);
				},
			),
		);
		// Unfortunately, recursive watching of subdirs doesn't work (properly) on all platforms
		// Workaround: This method will call itself recursively
		if (isDir) {
			getDirList(join(workingDir, projectDir, path)).forEach(dir => {
				this.addWatch(workingDir, projectDir, join(path, dir), false);
			});
		}
		if (verbose) {
			log.info(`Watching ${this.description} for changes`);
		}
	}

	/**
	 * Method to overwrite
	 */
	change(event, file) {
		// Fool compiler - unused variable
		event;
		file;
	}

	stop() {
		this.watchers.forEach(watcher => {
			watcher.close();
		});
	}
}

/**
 * Remove obsolete output files
 *
 * @param removeObsolete settings from settings.json
 * @param processed by production of output files
 * @param outputDir
 * @param ext to search for
 */
export function removeObsolete(removeObsolete, processed, outputDir, ext) {
	if (!removeObsolete.active) return 0;
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let sources = FileUtils.getFileList(outputDir, {
		allowedExtensions: [ext],
	});
	let stripped =
		cfg.options.stripping && cfg.options.stripping.suffix
			? cfg.options.stripping.suffix
			: "";
	sources.forEach(file => {
		let ext = extname(file);
		let fl = basename(file, ext);
		// In exclude list, in list of processed files, backup file?
		let skip =
			ArrayUtils.inExcludeList(removeObsolete.exclude, file) ||
			processed.includes(file) ||
			ext.endsWith("~");
		// Is stripped file?
		skip = skip || (stripped && fl.endsWith(stripped));
		if (skip) return;
		let trashFile = join(cfg.dirTemp, file);
		FileUtils.mkdir(dirname(trashFile));
		mv(join(outputDir, file), trashFile);
		FileUtils.rmFile(join(outputDir, file, ".map")); // Source map
		if (process.env.NODE_ENV !== "test") {
			log.info(`Moved obsolete file ${file} to ${trashFile} `);
		}
	});
	return 1;
}

/**
 * Read lines in a file synchronously, for strictly sequential parsing.
 *
 * Usage of this class:
 *
 * ```
 * let lr = new LineReader("example.txt");
 * do {
 *     let line = lr.next(); // Returns array: [ line number,  ]
 *     if (line[1] === false) break; // End of file
 *     if ( <some condition> ) {
 *         lr.stop();
 *         break;
 *     }
 * } while (true);
 * ```
 *
 * In case of loops with multiple files to read:
 *
 * ```
 * let lr = new LineReader();
 * // begin loop files
 * if (lr.initialize(path)) {
 *     // Loop lines
 * }
 * // end loop files
 * ```
 *
 * @see FileUtils.searchInFile() in this file for implementation example
 *
 * Notes:
 *
 * + Using a Transform stream seems overkill. The package n-readlines follows the
 * [KISS principle](https://en.wikipedia.org/wiki/KISS_principle)
 *
 * + [Example](https://medium.com/@wietsevenema/node-js-using-for-await-to-read-lines-from-a-file-ead1f4dd8c6f)
 * of workaround for old Node.js callback in createInterface(), using async, await and Transform Stream.
 *
 *
 */
export class LineReader {
	constructor(file = null, encoding = "utf8") {
		this.encoding = encoding;
		this.reader = null;
		if (file != null) {
			this.initialize(file);
		}
	}

	initialize(file) {
		if (!test("-f", file)) {
			let log = Logger.getInstance();
			log.warn(`File ${file} doesn't exist`);
			return false;
		}
		this.reader = new lineByLine(file);
		return true;
	}

	next() {
		if (this.reader == null) return false;
		let line = this.reader.next();
		return line === false ? false : line.toString(this.encoding);
	}

	stop() {
		if (this.reader != null) {
			this.reader.close();
		}
	}
}
