import { basename, dirname, extname, join } from "path";
import shelljs from "shelljs";
import { FileUtils } from "./files.mjs";
import { ArrayUtils } from "./object.mjs";
const { test } = shelljs;

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
		this.source = file;
		this.ext = ext;
		if (test("-e", join(this.dir, this.source))) {
			this.lastModified = FileUtils.getLastModified(this.dir, this.source);
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
		if (flatten) {
			this.target = join(basename(this.source, this.ext).concat(this.targetExt));
		} else {
			this.target = join(
				dirname(this.source),
				basename(this.source, this.ext),
			).concat(this.targetExt);
		}
		if (test("-e", join(this.targetDir, this.target))) {
			this.targetLastModified = FileUtils.getLastModified(
				this.targetDir,
				this.target,
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
		let status = new FileStatus(opts.sourcePath);
		status.setSource(file, extname(file));
		status.setTarget(
			opts.targetPath,
			opts.targetExt,
			opts.flatten != undefined && opts.flatten,
		);
		changes.push(status);
	});
	return changes;
}
