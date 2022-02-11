"use strict";
import { watch } from "fs";
import shelljs from "shelljs";
import { join } from "path";
import { Logger } from "../log.mjs";
import { FileUtils } from "./files.mjs";
import { getDirList } from "./dirs.mjs";
const { test } = shelljs;

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
