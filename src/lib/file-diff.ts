import { statSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { test } from "shelljs";
import { FileUtils } from "./files";
import { ArrayUtils } from "./object";

/**
 * For getChangeList()
 */
export interface ChangeList {
	sourcePath: string;
	targetPath: string;
	sourceExt: string[];
	targetExt: string;
	excludeList?: string[];
	flatten?: boolean;
}

/**
 * Utility class to get file info and compare files
 */
export class FileStatus {
	lastModified: number = 0;
	source: string = "";
	dir: string;
	status: string = ""; // can be unknown, unchanged, new or modified
	target: string = "";
	targetDir: string = "";
	targetLastModified: number = 0;

	private ext: string = "";
	private targetExt: string = "";

	/**
	 * Sets source file
	 * @param path to base directory
	 */
	constructor(path: string) {
		this.dir = path;
	}

	/**
	 * Check array of FileStatus for isNewOrModified()
	 */
	static containsChange(list: FileStatus[]): boolean {
		let changeFound = false;
		list.forEach((entry: FileStatus) => {
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
	public setSoure(file: string, ext: string) {
		this.source = file;
		this.ext = ext;
		this.lastModified = FileUtils.getLastModified(this.dir, this.source);
		this.status = "unknown";
	}

	/**
	 * Secondary file
	 * @param path
	 * @param ext
	 * @param flatten ignore relative path in this.source
	 */
	public setTarget(path: string, ext: string, flatten: boolean = false) {
		this.targetDir = path;
		this.targetExt = ext;
		if (flatten) {
			this.target = join(basename(this.source, this.ext).concat(this.targetExt));
		} else {
			this.target = join(dirname(this.source), basename(this.source, this.ext)).concat(this.targetExt);
		}

		if (test("-e", join(this.targetDir, this.target))) {
			this.targetLastModified = FileUtils.getLastModified(this.targetDir, this.target);
			this.status = this.lastModified > this.targetLastModified ? "modified" : "unchanged";
		} else {
			this.status = "new";
		}
	}

	/**
	 * Check soure file status
	 */
	public isNewOrModified(): boolean {
		return this.status == "new" || this.status == "modified";
	}
}

/**
	 * Get an array of (un)modified or new files
	 */
export function getChangeList(opts: ChangeList): FileStatus[] {
	let changes: FileStatus[] = [];
	let sources = FileUtils.getFileList(opts.sourcePath, { allowedExtensions: opts.sourceExt });

	sources.forEach((file: string) => {
		if (ArrayUtils.inExcludeList(opts.excludeList || [], file)) return;

		let status = new FileStatus(opts.sourcePath);
		status.setSoure(file, extname(file));
		status.setTarget(opts.targetPath, opts.targetExt, opts.flatten != undefined && opts.flatten);
		changes.push(status);
	});

	return changes;
}
