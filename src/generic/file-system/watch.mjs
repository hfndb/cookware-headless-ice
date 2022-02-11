"use strict";
import { watch } from "fs";
import shelljs from "shelljs";
import { join } from "path";
import { Logger } from "../log.mjs";
import { FileUtils } from "./files.mjs";
import { getDirList } from "./dirs.mjs";
const { test } = shelljs;

let log = Logger.getInstance();


/** @typedef WatchOptions
 * @property {string} workingDir
 * @property {string} path
 * @property {string} description
 * @property {number} timeout
 * @property {boolean} [verbose] Default true
 * @property {boolean} [forceDirWatch] Default false
 */

/**
 * Class to organize file watching
 */
export class FileWatcher {
	/**
	 * @param {WatchOptions} opts
	 */
	constructor(opts) {
		if (opts.verbose == undefined) opts.verbose = true;
		if (opts.forceDirWatch == undefined) opts.forceDirWatch = false;

		this.files = {};
		this.file = opts.file = "";
		this.watchers = [];
		this.workingDir = opts.workingDir;

		if (!test("-e", this.workingDir)) {
			log.info(
				`Path ${opts.path} doesn't exist. Request to watch ${
					this.description
				} ignored`,
			);
			return;
		}

		this.isFile = test("-f", this.workingDir);
		if (this.isFile) {
			opts.file = opts.path;
			opts.path = "";
		}

		// Unfortunately, recursive watching of subdirs doesn't work (properly) on all platforms
		// Workaround: Watch for all files in directory.
		let fullPath = join(opts.workingDir, opts.path, opts.file);
		if (!this.isFile && !opts.forceDirWatch && test("-d", fullPath)) {
			let files = FileUtils.getFileList(fullPath);
			for (let i = 0; i < files.length; i++) {
				let tmp = Object.assign({}, opts);
				tmp.file = files[i];
				tmp.verbose = false;
				this.addWatch(tmp);
			}
			if (opts.verbose) {
				log.info(`Watching ${opts.description} for changes`);
			}
			return;
		} else {
			this.addWatch(opts);
		}
	}

	addWatch(settings) {
		this.watchers.push(
			watch(
				join(settings.workingDir, settings.path, settings.file),
				{
					persistent: true,
					recursive: false,
					encoding: FileUtils.ENCODING_UTF8,
				},
				(event, file) => {
					if (!file || file.endsWith("swp")) return;
					let fileChanged = settings.file;
					//log.debug(event, this.workingDir, settings.path, fileChanged);

					if (!test("-f", join(this.workingDir, settings.path, fileChanged))) {
						// File deleted. The 'rename' event occurs when:
						// - a new file is added,
						// - a file is deleted,
						// - buffer file is deleted - some text editor don't simply overwrite
						// log.warn(`File ./${join(opts.workingDir, file)} is deleted`);
						return;
					}

					// Delaying mechanisme to prevent a phenomenon like "contact bounce"
					// https://en.wikipedia.org/wiki/Switch#Contact_bounce
					if (this.files[fileChanged] && (Date.now() - this.files[fileChanged]) >  settings.timeout) {
						return;
					}
					this.files[fileChanged] = Date.now();

					this.change(event, fileChanged);
				}
			),
		);

		if (settings.verbose) {
			log.info(`Watching ${settings.description} for changes`);
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
