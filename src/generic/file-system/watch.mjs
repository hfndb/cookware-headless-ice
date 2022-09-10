"use strict";
import { watch } from "node:fs";
import { join } from "node:path";
import { Logger } from "../log.mjs";
import { test } from "../sys.mjs";
import { FileUtils } from "./files.mjs";
import { getDirList } from "./dirs.mjs";

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
		let log = Logger.getInstance();
		if (opts.verbose == undefined) opts.verbose = true;
		if (opts.forceDirWatch == undefined) opts.forceDirWatch = false;

		this.files = {};
		this.file = opts.file = "";
		this.watchers = [];
		this.workingDir = opts.workingDir;

		if (!test("-e", this.workingDir)) {
			log.info(
				`Path ${opts.path} doesn't exist. Request to watch ${this.description} ignored`,
			);
			return;
		}

		this.isFile = test("-f", this.workingDir);
		if (this.isFile) {
			opts.file = opts.path;
			opts.path = "";
		}

		this.addWatch(opts);

		// Unfortunately, recursive watching of subdirs doesn't work (properly) on all platforms
		// Workaround: Watch for all files in directory.
		let fullPath = join(opts.workingDir, opts.path, opts.file);
		if (!test("-f", fullPath)) {
			let dirs = getDirList(fullPath);
			for (let i = 0; i < dirs.length; i++) {
				let tmp = Object.assign({}, opts);
				tmp.file = dirs[i];
				tmp.verbose = false;
				this.addWatch(tmp);
			}
		}
	}

	addWatch(settings) {
		let log = Logger.getInstance();
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
					let changed, fullPath, tmp;

					let scenario = ["", settings.file, join(settings.file, file)];

					for (let i = 0; !fullPath && i < scenario.length; i++) {
						tmp = join(this.workingDir, settings.path, scenario[i]);
						if (test("-f", tmp)) {
							if (scenario[i]) {
								// Scenario of dir watch
								changed = scenario[i];
								fullPath = join(this.workingDir, settings.path, changed);
							} else {
								// Scenario of file watch
								changed = settings.path;
								fullPath = join(this.workingDir, changed);
							}
						}
					}

					if (!fullPath || !test("-f", fullPath)) {
						// File couldn't be found or is deleted.
						// The 'rename' event occurs when:
						// - a new file is added,
						// - a file is deleted,
						// - buffer file is deleted - some text editor don't simply overwrite
						// log.warn(`File ./${join(opts.workingDir, file)} is deleted`);
						return;
					}

					// Delaying mechanisme to prevent a phenomenon like "contact bounce"
					// https://en.wikipedia.org/wiki/Switch#Contact_bounce
					if (this.files[changed]) {
						if (Date.now() - this.files[changed] < settings.timeout) {
							return;
						}
					}
					this.files[changed] = Date.now();

					this.change(event, changed);
				},
			),
		);

		if (settings.verbose) {
			log.success(`Watching ${settings.description} for changes`);
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
