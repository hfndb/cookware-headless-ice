import {
	readdirSync,
	readFileSync,
	statSync,
	watch,
	writeFileSync,
	FSWatcher
} from "fs";
import { basename, dirname, extname, join } from "path";
import { mkdir, mv, rm, test, touch } from "shelljs";
import { AppConfig } from "./config";
import { Logger } from "./log";
import { getDirList } from "./dirs";
import { ArrayUtils } from "./object";

/**
 * For FileUtils.searchInFile()
 */
interface searchOptions {
	inverse: boolean;
	ignoreCase: boolean;
	markFound: string;
	processor?: Function;
}

/**
 * For FileUtils.dir()
 */
export interface fileEntry {
	bytes?: number;
	fullPath: string;
	lastModified: Date;
	lastModifiedMs: number;
	type: string;
	needsAction: boolean;
}

/**
 * For FileUtils.getFileList()
 */
export interface fileListOptions {
	allowedExtensions?: string[];
	excludeList?: string[];
	recursive?: boolean;
}

/**
 * Utility class with static utility methods for files and directories
 */
export class FileUtils {
	static ENCODING_UTF8: string = "utf8";

	/**
	 * Method to safely read a json file
	 *
	 * @param path to json file to read
	 * @returns with read json content
	 */
	static readJsonFile(path: string, ignoreErrors: boolean = true): object {
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
	static writeJsonFile(
		content: object,
		dir: string,
		file: string,
		verbose: boolean = true
	): void {
		let data = JSON.stringify(content, null, "\t");
		let log = Logger.getInstance();

		if (
			FileUtils.writeFile(dir, file, data, false) &&
			verbose &&
			process.env.NODE_ENV !== "test"
		) {
			log.info(`Data written to file ${file}`);
		}
	}

	/**
	 * Method to safely read a file.
	 */
	static readFile(path: string): string {
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
	 * Method to safely write to a file.
	 */
	static writeFile(
		dir: string,
		file: string,
		content: string,
		verbose: boolean,
		flag: string = "w"
	): boolean {
		let log = Logger.getInstance();
		let fullPath = join(dir, file);
		let dir4sure = dirname(fullPath);

		if (dir4sure && !test("-d", dir4sure)) {
			FileUtils.mkdir(dir4sure);
		}

		try {
			writeFileSync(fullPath, content, {
				encoding: FileUtils.ENCODING_UTF8,
				flag: flag
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
	static getFileList(path: string, opts: fileListOptions = {}): string[] {
		if (!test("-e", path)) {
			throw new Error("Path " + path + " doesn't exist");
		}

		let allowedExtensions =
			opts.allowedExtensions == undefined ? [] : opts.allowedExtensions;
		let excludeList = opts.excludeList == undefined ? [] : opts.excludeList;
		let recursive = opts.recursive == undefined ? true : opts.recursive;
		let files: string[] = [];

		function addFile(file: string) {
			file = file.substr(path.length + 1);
			if (excludeList.includes(file)) return;
			if (
				allowedExtensions.length == 0 ||
				allowedExtensions.includes(extname(file))
			) {
				files.push(file);
			}
		}
		function addPath(dirname: string) {
			if (excludeList.includes(basename(dirname))) return;

			readdirSync(dirname).forEach((file: string) => {
				const realpath = join(dirname, file);
				if (recursive && test("-d", realpath)) {
					addPath(realpath);
				} else if (test("-f", realpath)) {
					addFile(realpath);
				}
			});
		}

		if (test("-f", path)) {
			addFile(path);
		} else {
			addPath(path);
		}

		return files;
	}

	/**
	 * Comparable with a console dir command to retrieve file names, size in bytes and last modified
	 * Returns object with key/value pairs; name (key), fileEntry (value).
	 */
	static dir(path: string, recursive: boolean = false): Map<string, fileEntry> {
		let lst = new Map();
		let src = FileUtils.getFileList(path, { recursive: recursive });

		for (let i = 0; i < src.length; i++) {
			let file = src[i];
			let fullPath = join(path, file);
			let info = statSync(fullPath);
			let entry: fileEntry = {
				bytes: info.size, // @todo Perhaps package filesize to make this human readable?
				fullPath: fullPath,
				lastModified: info.mtime,
				lastModifiedMs: info.mtimeMs,
				type: extname(file),
				needsAction: false
			};
			lst.set(file, entry);
		}

		return lst;
	}

	/**
	 * @returns Last modified timestamp (mtimeMs)
	 */
	static getLastModified(path: string, file: string): number {
		let fullPath = join(path, file);
		return statSync(fullPath).mtimeMs;
	}

	static getLastChangeInDirectory(
		path: string,
		extensions: string[],
		startAt: number = 0
	): number {
		let retVal = startAt;

		let lst = FileUtils.getFileList(path, { allowedExtensions: extensions });
		lst.forEach((file: string) => {
			retVal = Math.max(retVal, statSync(join(path, file)).mtimeMs);
		});

		return retVal;
	}

	/**
	 * Get a unique filename, provided given file already exists
	 */
	static getUniqueFileName(dir: string, file: string, ext: string): string {
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
	static getTempFileName(lengthSuffix: number): string {
		let begin = parseInt("1".padEnd(lengthSuffix, "0"));
		let end = parseInt("9".padEnd(lengthSuffix, "9"));
		// Make the end exclusive, the beginning inclusive
		let rndm = Math.floor(Math.random() * (end - begin)) + begin;
		// Date.now is updated every millisecond
		return Date.now() + "-" + rndm.toString();
	}

	/**
	 * Search for occurences of a string in a file
	 * In opts.markFound a placeholder $ to insert the search string
	 *
	 * @returns array with arrays; 1st element line #, 2nd element data of line
	 */
	static searchInFile(
		path: string,
		searchFor: string,
		opts: searchOptions
	): object[] {
		const regex = new RegExp(searchFor, opts.ignoreCase ? "i" : undefined);
		if (opts.markFound != "") {
			opts.markFound = opts.markFound.replace("$", searchFor);
		}

		let lr = new LineReader(path);
		let lineNr = 0;
		let retVal: any = [];
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
	static mkdir(path: string) {
		if (!test("-e", path)) {
			mkdir("-p", path);
		}
	}

	/**
	 * Touch all files in a directory resursively.
	 * Default value for opts.resursive = true.
	 */
	static touchRecursive(path: string, opts: fileListOptions) {
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
	private nowChanging: string[] = [];
	private description: string;
	private timeout: number;
	private watchers: FSWatcher[] = [];

	constructor(
		workingDir: string,
		projectDir: string,
		path: string,
		timeout: number,
		description: string,
		verbose: boolean = true
	) {
		this.description = description;
		this.timeout = timeout;
		this.addWatch(workingDir, projectDir, path, verbose);
	}

	private addWatch(
		workingDir: string,
		projectDir: string,
		path: string,
		verbose: boolean = true
	): void {
		let log = Logger.getInstance();
		let fullPath = join(workingDir, projectDir, path);
		if (!test("-e", fullPath)) {
			log.warn(
				`Path ./${join(projectDir, path)} doesn't exist. Request to watch ${
					this.description
				} ignored`
			);
			return;
		}
		let isDir = test("-d", fullPath);

		if (
			isDir &&
			FileUtils.getFileList(fullPath, { recursive: false }).length == 0
		) {
			// To prevent error with dirs which don't contain files
			return;
		} else if (!isDir) {
			fullPath = join(workingDir, projectDir); // Watch directory, not file (workaround for bug in Node.js)
		}

		this.watchers.push(
			watch(
				fullPath,
				{
					persistent: true,
					recursive: false,
					encoding: FileUtils.ENCODING_UTF8
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
				}
			)
		);

		// Unfortunately, recursive watching of subdirs doesn't work (properly) on all platforms
		// Workaround: This method will call itself recursively
		if (isDir) {
			getDirList(join(workingDir, projectDir, path)).forEach((dir: string) => {
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
	public change(event: string, file: string): void {
		// Fool compiler - unused variable
		event;
		file;
	}

	public stop(): void {
		this.watchers.forEach((watcher: FSWatcher) => {
			watcher.close();
		});
	}
}

/**
 * Remove obsolete output files
 *
 * @param removeObsolete settings from config.json
 * @param processed by production of output files
 * @param outputDir
 * @param ext to search for
 */
export function removeObsolete(
	removeObsolete: any,
	processed: string[],
	outputDir: string,
	ext: string
): number {
	if (!removeObsolete.active) return 0;

	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let sources = FileUtils.getFileList(outputDir, {
		allowedExtensions: [ext]
	});

	sources.forEach((file: string) => {
		if (
			!ArrayUtils.inExcludeList(removeObsolete.exclude, file) &&
			!processed.includes(file)
		) {
			// Not in exclude list, not in list of processed files
			let trashFile = join(cfg.dirTemp, file);
			FileUtils.mkdir(dirname(trashFile));
			mv(join(outputDir, file), trashFile);
			if (test("-f", join(outputDir, file, ".map"))) {
				rm(join(outputDir, file, ".map")); // Source map
			}
			if (process.env.NODE_ENV !== "test") {
				log.info(`Moved obsolete file ${file} to ${trashFile} `);
			}
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
	private encoding: string;
	private reader: any;

	constructor(file: string | null = null, encoding: string = "utf8") {
		this.encoding = encoding;
		this.reader = null;
		if (file != null) {
			this.initialize(file);
		}
	}

	initialize(file: string): boolean {
		if (!test("-f", file)) {
			let log = Logger.getInstance();
			log.warn(`File ${file} doesn't exist`);
			return false;
		}
		const lineByLine = require("n-readlines");
		this.reader = new lineByLine(file);
		return true;
	}

	next(): any {
		if (this.reader == null) return false;
		let line: any = this.reader.next();
		return line === false ? false : line.toString(this.encoding);
	}

	stop(): void {
		if (this.reader != null) {
			this.reader.close();
		}
	}
}
