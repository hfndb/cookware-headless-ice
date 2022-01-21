"use strict";

import { join } from "path";
import { AppConfig, FileUtils, Logger } from "../lib/index.mjs";
import { Beautify } from "../lib/beautify.mjs";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);

export class PhpUtils {
	/**
	 * Beautify a .scss file. Read from disk and write
	 * @returns {boolean} if any transcompiling error on the way
	 */
	static beautify(entry) {
		let toReturn = true;
		if (cfg.options.server.beautify.includes("php")) {
			let fullPath = join(entry.dir, entry.source);
			let source = FileUtils.readFile(fullPath);
			source = Beautify.content(entry.source, source);
			if (source) {
				FileUtils.writeFile(entry.dir, entry.source, source, false);
			} else {
				toReturn = false;
			}
		}
		return toReturn;
	}
}
