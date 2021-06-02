import { join, sep } from "path";
const { fdir } = require("fdir");
import { test, touch } from "shelljs";
import { FileUtils } from "./files";

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
export function createDirTree(
	rootDir: string,
	tree: object,
	sourceControl: boolean = false
): void {
	Object.entries(tree).forEach((entry: [string, any]) => {
		let key = entry[0];
		if (key == "dirs") {
			let value: string[] = entry[1];
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
			let value: object = entry[1];
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
export function getDirList(path: string, recursive: boolean = true): string[] {
	if (!test("-e", path)) {
		throw new Error(`Path ${path} doesn't exist`);
	}

	let opts = {
		group: true
	};
	if (!recursive) Object.assign(opts, { maxDepth: 0 });
	const fl = new fdir().crawlWithOptions(path, opts).sync();

	let dirs: string[] = [];
	for (let d = 0; d < fl.length; d++) {
		let dir = fl[d].dir;
		dir = dir.substring(path.length + 1);
		if (!dir) continue;
		if (!recursive && dir.includes(sep)) continue;
		dirs.push(dir);
	}

	return dirs;
}
