"use strict";
import { basename, dirname, extname, join } from "node:path";
import { ArrayUtils } from "../object.mjs";
import { test } from "../sys.mjs";
import { FileUtils } from "./files.mjs";

/**
 * Utility class to get file info and compare files
 */
export class FileStatus {
	/**
	 * Sets source file
	 * @param path to base directory
	 */
	constructor(path) {
		this.lastModified = 0;
		this.source = "";
		this.status = ""; // can be unknown, unchanged, new or modified
		this.target = "";
		this.targetDir = "";
		this.targetLastModified = 0;
		this.ext = "";
		this.targetExt = "";
		this.dir = path;
	}

	/**
	 * Check array of FileStatus for isNewOrModified()
	 */
	static containsChange(list) {
		let changeFound = false;
		list.forEach(entry => {
			if (entry.isNewOrModified()) {
				changeFound = true;
			}
		});
		return changeFound;
	}

	/**
	 * Primary file
	 * @param file relative to base directory
	 * @param ext
	 */
	setSource(file, ext) {
		let fi = FileUtils.getFileInfo(this.dir, file);
		this.source = join(fi.path.next, fi.file.full);
		this.ext = ext;
		if (test("-e", fi.full)) {
			this.lastModified = FileUtils.getLastModified(fi.path.full, fi.file.full);
		}
		this.status = "unknown";
	}

	/**
	 * Secondary file
	 * @param path
	 * @param ext
	 * @param flatten ignore relative path in this.source
	 */
	setTarget(path, ext, flatten = false) {
		this.targetDir = path;
		this.targetExt = ext;
		let fi = FileUtils.getFileInfo(this.dir, this.source);

		if (flatten) {
			this.target = fi.file.stem.concat(this.targetExt);
		} else {
			this.target = join(fi.path.next, fi.file.stem).concat(this.targetExt);
		}
		fi = FileUtils.getFileInfo(this.targetDir, this.target);
		if (test("-e", fi.full)) {
			this.targetLastModified = FileUtils.getLastModified(
				fi.path.full,
				fi.file.full,
			);
			this.status =
				this.lastModified > this.targetLastModified ? "modified" : "unchanged";
		} else {
			this.status = "new";
		}
	}

	/**
	 * Check soure file status
	 */
	isNewOrModified() {
		return this.status == "new" || this.status == "modified";
	}
}

/**
 * Get an array of (un)modified or new files
 */
export function getChangeList(opts) {
	let changes = [];
	let sources = FileUtils.getFileList(opts.sourcePath, {
		allowedExtensions: opts.sourceExt,
	});

	sources.forEach(file => {
		if (ArrayUtils.inExcludeList(opts.excludeList || [], file)) return;
		let ext = {
			src: extname(file),
			tar: opts.targetExt,
		};
		if (opts.correctMjs && ext.src == ".mjs") {
			ext.tar = ".mjs";
		}
		let status = new FileStatus(opts.sourcePath);

		status.setSource(file, ext.src);
		status.setTarget(
			opts.targetPath,
			ext.tar,
			opts.flatten != undefined && opts.flatten,
		);
		changes.push(status);
	});
	return changes;
}
