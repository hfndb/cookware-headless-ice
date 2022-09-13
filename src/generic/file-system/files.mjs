"use strict";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, sep } from "node:path";
import { fdir } from "fdir";
import { AppConfig } from "../config.mjs";
import { Logger } from "../log.mjs";
import { ArrayUtils } from "../object.mjs";
import { mkdir, mv, rm, test, touch } from "../sys.mjs";
import { StringExt } from "../utils.mjs";

/**
 * This file is created for and maintained in cookware-headless-ice
 *
 * @see https://github.com/hfndb/cookware-headless-ice
 * @see src/lib/file-system/files.mjs
 */

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
	 * Method to safely read a json file by importing
	 * Introduced in Node.js v17.5.0, so far experimental.
	 *
	 * @param {string} path to json file to read
	 * @returns {*} object with read json content or null
	 */
	static async importJsonFile(path, ignoreErrors = true) {
		try {
			let rt = await import(path, {
				assert: { type: "json" },
			});
			return rt.default;
		} catch (err) {
			if (ignoreErrors) return null;
			else {
				throw new Error(`Error parsing ${path}\n` + Logger.error2string(err));
			}
		}
	}

	/**
	 * Method to safely read a json file
	 *
	 * @param {string} path to json file to read
	 * @returns {*} with read json content
	 */
	static readJsonFile(path, ignoreErrors = true) {
		let parsed = {};
		if (!test("-f", path)) {
			let fi = FileUtils.getFileInfo("", path);
			let log = Logger.getInstance();
			log.warn(`File ${fi.file.full} not found in directory ${fi.path.full}`);
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
	 * @param {Object} content
	 * @param {string} dir
	 * @param {string} file
	 * @param {boolean} verbose
	 * @param {boolean} [forceWrite]
	 * @returns {boolean} Something was written
	 */
	static writeJsonFile(content, dir, file, verbose = true, forceWrite = false) {
		let data = JSON.stringify(content, null, "\t");
		let log = Logger.getInstance();

		let changed = FileUtils.writeFile(dir, file, data, false, forceWrite);
		if (changed && verbose && process.env.NODE_ENV !== "test") {
			log.info(`- File written: ${file}`);
		}

		return changed;
	}

	/**
	 * Method to safely read a file.
	 *
	 * @param {string} path
	 */
	static readFile(path) {
		let data = "";
		try {
			data = readFileSync(path, {
				encoding: FileUtils.ENCODING_UTF8,
			});
		} catch (err) {
			let log = Logger.getInstance();
			log.error(`Error reading file '${path}'`, Logger.error2string(err));
			throw err;
		}
		return data;
	}

	/**
	 * Replace Carriage Return (CR, \r, on older Macs), CR followed by LF (\r\n, on WinDOS)
	 * with Line Feed (LF, \n, on Unices incl. Linux).
	 *
	 * @param {string} str
	 */
	static stripLineBreaks(str) {
		return str.replace(/\r?\n|\r/g, "\n");
	}

	/**
	 * Method to safely write to a file.
	 *
	 * @param {string} dir
	 * @param {string} file
	 * @param {string} content
	 * @param {boolean} verbose
	 * @param {boolean} [forceWrite]
	 * @param {string} [flag]
	 * @returns {boolean} Something was written
	 */
	static writeFile(dir, file, content, verbose, forceWrite = false, flag = "w") {
		let log = Logger.getInstance(),
			fullPath = join(dir, file);
		let dir4sure = dirname(fullPath);

		if (typeof forceWrite != "boolean")
			log.error(`- Error during refactoring code; flag used`); // TODO remove if

		FileUtils.mkdir(dir4sure);
		if (
			!forceWrite &&
			test("-f", fullPath) &&
			content == FileUtils.readFile(fullPath)
		)
			return false; // No changes since last write

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
	 * Method to create a list of directories within a directory name
	 *
	 * @param {string} path of dir
	 * @returns {string[]} dir list
	 */
	static getDirList(path, recursive = true) {
		if (!test("-e", path)) {
			throw new Error(`Path ${path} doesn't exist`);
		}
		const fl = new fdir()
			.onlyDirs()
			.crawl(path)
			.sync();
		let dirs = [];
		for (let d = 0; d < fl.length; d++) {
			let dir = fl[d];
			if (dir.endsWith(sep)) dir = dir.slice(0, -1); // strip trailing separator
			dir = dir.substring(path.length + 1);
			if (!dir) continue;
			if (!recursive && dir.includes(sep)) continue;
			dirs.push(dir);
		}
		return dirs;
	}

	/**
	 * Method to get a list of file(s) from:
	 * - a single file name
	 * - a directory
	 *
	 * @param {string} path
	 * @param {Object} opts
	 * @returns {string[]}
	 */
	static getFileList(path, opts = {}) {
		if (!test("-e", path)) {
			throw new Error("Path " + path + " doesn't exist");
		}
		let cfg = AppConfig.getInstance();
		const allowedExtensions =
			opts.allowedExtensions == undefined ? [] : opts.allowedExtensions;
		const excludeList = opts.excludeList == undefined ? [] : opts.excludeList;
		const recursive = opts.recursive == undefined ? true : opts.recursive;
		const fl = new fdir()
			.withFullPaths()
			.crawl(path)
			.sync();
		let file,
			files = [];

		for (let d = 0; d < fl.length; d++) {
			file = fl[d];

			if (file.startsWith(cfg.dirProject)) {
				file = file.substring(path.length + 1);
			}

			if ((!recursive && file.includes(sep)) || excludeList.includes(file))
				continue;

			if (
				allowedExtensions.length == 0 ||
				allowedExtensions.includes(extname(file))
			) {
				files.push(file);
			}
		}
		return files;
	}

	/**
	 * Expand a file list by replacing a directory name with all files in that directory
	 *
	 * @param {string} dirBase
	 * @param {string[]} lst
	 * @returns {string[]}
	 */
	static expandFileList(dirBase, files) {
		let lst,
			path,
			rt = [];

		for (let i = 0; i < files.length; i++) {
			path = join(dirBase, files[i]);
			if (!test("-d", path)) {
				rt.push(files[i]); // File
				continue;
			}
			lst = FileUtils.getFileList(path); // Files in directory
			lst.forEach(item => {
				item = item.replace(dirBase + sep, "");
				rt.push(item);
			});
		}

		return rt;
	}

	/**
	 * @param {string} path
	 * @param {string} file
	 * @param {boolean} includeSize
	 */
	static getFileInfo(path, file, includeSize = false) {
		let rt = {
			path: {
				base: path,
				full: "",
				next: "",
			},
			file: {
				ext: "",
				full: file,
				size: 0,
				stem: "",
			},
			full: "",
		};

		if (rt.file.full.includes(sep)) {
			rt.path.next = dirname(file);
			rt.file.full = basename(file);
		}

		if (rt.file.full.includes(".")) {
			rt.file.ext = extname(rt.file.full);
			rt.file.stem = basename(rt.file.full, rt.file.ext);
		} else {
			rt.file.stem = basename(file);
		}

		rt.path.full = join(rt.path.base, rt.path.next);
		rt.full = join(rt.path.full, rt.file.full);

		if (includeSize) {
			rt.file.size = FileUtils.getFileSize(rt.full);
		}

		return rt;
	}

	/**
	 * Get filesize in bytes
	 *
	 * @param {string} file Full path
	 * @returns {number}
	 */
	static getFileSize(file) {
		if (test("-f", file)) {
			let info = statSync(file);
			return info.size;
		} else return -1;
	}

	/**
	 * @param {string} path
	 * @param {string} file
	 * @returns {number} Last modified timestamp
	 */
	static getLastModified(path, file) {
		let fullPath = join(path, file);
		return statSync(fullPath).mtimeMs;
	}

	/**
	 * @param {string} path
	 * @param {string} file
	 * @returns {Date} Last modified
	 */
	static getLastModifiedDate(path, file) {
		let fullPath = join(path, file);
		return statSync(fullPath).mtime;
	}

	/**
	 * Translate a file name to name with suffix
	 * For example: dir/file.txt becomes dir/file-suffix.txt
	 *
	 * @param {string} path
	 * @param {string} suffix
	 * @returns {string}
	 */
	static getSuffixedFile(path, suffix) {
		let dir = path.includes(sep) || path.includes("/") ? dirname(path) : "";
		let fi = FileUtils.getFileInfo("", path);
		return join(fi.path.full, `${fi.file.stem}-${suffix}${fi.file.ext}`);
	}

	/**
	 * Comparable with a console dir command to retrieve file names, size in bytes and last modified
	 * Returns object with key/value pairs; name (key), fileEntry (value).
	 *
	 * @param {string} path
	 * @param {boolean} recursive
	 * @returns {Object}
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
	 * @param {string} path
	 * @param {string[]} string
	 * @param {number} startAt
	 * @returns {number}
	 */
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
	 *
	 * @param {string} dir
	 * @param {string} file
	 * @param {string} ext
	 * @returns {string}
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
	 *
	 * @param {string} lengthSuffix
	 * @returns {string}
	 */
	static getTempFileName(lengthSuffix) {
		// Date.now is updated every millisecond
		return Date.now() + "-" + StringExt.getRandom(lengthSuffix);
	}

	/**
	 * If a directory doesn't exist yet, create
	 *
	 * @param {string} path
	 */
	static mkdir(path) {
		if (!test("-e", path)) {
			mkdir("-p", path);
		}
	}

	/**
	 * Touch all files in a directory resursively.
	 * Default value for opts.resursive = true.
	 *
	 * @param {string} path
	 * @param {Object} opts
	 */
	static touchRecursive(path, opts) {
		if (!opts) opts = {};
		if (opts.filterContains == undefined) opts.filterContains = [];
		if (opts.recursive == undefined) opts.recursive = true;

		let canIgnore = file => {
			if (opts.filterContains.length == 0) return false;
			let e;
			for (let i = 0; i < opts.filterContains.length; i++) {
				e = opts.filterContains[i];
				if (file.includes(e)) return false;
			}
			return true;
		};

		let files = FileUtils.getFileList(path, opts);
		for (let i = 0; i < files.length; i++) {
			if (canIgnore(files[i])) continue;
			touch(join(path, files[i]));
		}
	}
}

/**
 * Remove obsolete output files
 *
 * @param {Object} removeObsolete settings from settings.json
 * @param {string[]} processed by production of output files
 * @param {string} outputDir
 * @param {string} ext to search for
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
		let fi = FileUtils.getFileInfo("", file);
		// In exclude list, in list of processed files, backup file?
		let skip =
			ArrayUtils.inExcludeList(removeObsolete.exclude, file) ||
			processed.includes(file) ||
			fi.file.ext.endsWith("~");
		// Is stripped file?
		skip = skip || (stripped && fi.file.stem.endsWith(stripped));
		if (skip) return;

		let trashFile = join(cfg.dirTemp, file);
		FileUtils.mkdir(dirname(trashFile));
		mv(join(outputDir, file), trashFile);
		FileUtils.rmFile(join(outputDir, file, ".map")); // Source map
		if (process.env.NODE_ENV !== "test") {
			log.info(`Moved obsolete file ${file} to ${trashFile} `);
		}
	});

	return;
}
