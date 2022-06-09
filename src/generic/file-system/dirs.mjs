"use strict";
import { join, sep } from "node:path";
import { fdir } from "fdir";
import { test, touch } from "../sys.mjs";
import { FileUtils } from "./files.mjs";

/**
 * Create a directory tree.
 *
 * Usage:
 *
 * 	const tree = {
 *		"dirs": ["backups", "notes", "sass"],
 *		"content": {
 *			"dirs": ["includes", "tmeplates"]
 *		},
 *		"dist": {
 *			"static": {
 *				"dirs": ["css", "img"],
 *				"js": {
 *					"dirs": ["browser", "local", "test"],
 *					"server": {
 *						"dirs": ["controllers", "views"]
 *					}
 *				}
 *			}
 *		},
 *		"src": {
 *			"dirs": ["browser", "local", "test"],
 *			"server": {
 *				"dirs": ["controllers", "views"]
 *			}
 *		}
 *	};
 *
 *	createDirTree("/tmp/test", tree);
 *
 * Creates directory structure:
 *
 * - /tmp/test/backups
 * - /tmp/test/notes
 * - /tmp/test/sass
 * - /tmp/test/content/includes
 * - /tmp/test/content/tmeplates
 * - /tmp/test/dist/static/css
 * - /tmp/test/dist/static/img
 * - /tmp/test/dist/static/js/browser
 * - /tmp/test/dist/static/js/local
 * - /tmp/test/dist/static/js/test
 * - /tmp/test/dist/static/js/server/controllers
 * - /tmp/test/dist/static/js/server/views
 * - /tmp/test/src/browser
 * - /tmp/test/src/local
 * - /tmp/test/src/test
 * - /tmp/test/src/server/controllers
 * - /tmp/test/src/server/views
 *
 * @param rootDir
 * @param tree object with definition
 * @param sourceControl in case of Source Controle, touch a delete-me.txt file
 */
export function createDirTree(rootDir, tree, sourceControl = false) {
	Object.entries(tree).forEach(entry => {
		let key = entry[0];
		if (key == "dirs") {
			let value = entry[1];
			for (let i = 0; i < value.length; i++) {
				FileUtils.mkdir(join(rootDir, value[i]));
				if (sourceControl) {
					touch(join(rootDir, value[i], "delete-me.txt"));
				}
			}
		} else if (key != "length") {
			if (join(rootDir, key).includes("length")) {
				throw new Error("test error");
			}
			let value = entry[1];
			FileUtils.mkdir(join(rootDir, key));
			createDirTree(join(rootDir, key), value, sourceControl);
		}
	});
}

/**
 * Method to create a list of directories within a directory name
 *
 * @param path of dir
 * @returns array with dir list
 */
export function getDirList(path, recursive = true) {
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
