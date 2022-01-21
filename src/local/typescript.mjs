"use strict";

import { join } from "path";
import shelljs from "shelljs";
import {
	getChangeList,
	AppConfig,
	FileStatus,
	FileUtils,
	Logger,
} from "../lib/index.mjs";
import typedoc from "typedoc";
import { removeObsolete } from "../lib/files.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { JavascriptUtils } from "./javascript.mjs";
const { cp, exec, rm, test } = shelljs;

/**
 * Generate HTML formatted docs from TypeScript sources in src.
 * Uses configuration in settings.json
 *
 * @todo plugin for markdown output? https://github.com/tgreyuk/typedoc-plugin-markdown
 */
export function generateTsDocs() {
	// Create or clean output directory
	let cfg = AppConfig.getInstance();
	let dir = join(cfg.dirProject, cfg.options.dependencies.typedoc.output);
	let log = Logger.getInstance(cfg.options.logging);
	if (!dir) {
		log.error("Output dir for typedoc not found in settings.json");
		return;
	}
	if (test("-d", dir)) {
		rm("-rf", join(dir, "*"));
	} else {
		FileUtils.mkdir(dir);
	}
	let options = cfg.options.dependencies.typedoc.config;
	Object.assign(options, {
		tsconfig: "tsconfig.json",
	});
	try {
		const app = new typedoc.Application(options);
		const src = app.expandInputFiles([join(cfg.dirProject, "src")]);
		log.info(`Generating API docs of TypeScript files, in ${dir}`);
		// log.info("Might generate an error, see https://github.com/TypeStrong/typedoc/issues/438");
		// log.info(
		// 	"Fixed by commit, see https://github.com/true-myth/true-myth/commit/7836c259722a916b34c5be8a7218bd8b8a44c6cf:"
		// );
		app.generateDocs(src, dir);
		// app.generateJson(src, json);
		if (app.logger.hasErrors()) {
			log.error("There were errors generating TypeDoc output, see above.");
		}
	} catch (err) {
		log.error(
			"Failed to generate load TypeDoc project.",
			Logger.error2string(err),
		);
	}
}
