"use strict";
import { join, dirname } from "node:path";
import htmlcs from "htmlcs";
import { AppConfig, FileStatus, FileUtils, Logger } from "../generic/index.mjs";
import { Content } from "../generic/html.mjs";
import { cd, pwd, rm, test } from "../generic/sys.mjs";

export class Lint {
	/**
	 * Lint all files in HTML content directory
	 *
	 * @returns data of renderded template, if write2disk = false (for dev server)
	 */
	static content(write2disk = true) {
		let cfg = AppConfig.getInstance();
		let content = new Content();
		let log = Logger.getInstance(cfg.options.logging);
		let curDir = pwd();
		let dir = join(cfg.dirProject, cfg.options.html.dirs.content);
		let dirs = [];
		let files = FileUtils.getFileList(dir, {
			allowedExtensions: [".html", ".njk"],
		});
		let output = [];
		if (process.env.NODE_ENV !== "test") {
			log.info("Linting files...");
		}
		// Collect linting output
		files.forEach(file => {
			let relPath = dirname(file);
			if (relPath && !dirs.includes(relPath)) {
				/// Remember directory, since lintHtmFilel() will write a temp config file there
				dirs.push(relPath);
			}
			if (process.env.NODE_ENV !== "test") {
				log.info(`- ${file}`);
			}
			output.push({
				file: file,
				output: Lint.file(join(dir, file)),
			});
		});
		let entry = new FileStatus(join(cfg.dirMain, "content"));
		entry.setSource("lint.html", ".html");
		let data = content.render(entry.dir, entry.source, {
			additionalContext: { files: output },
			useProjectTemplates: false,
		});
		if (write2disk && data) {
			// Write linting output to file
			let file = join("dist", "lint.html");
			FileUtils.writeFile(cfg.dirMain, file, data, false);
			data = "";
			log.info(`... done. Output is written to system directory, ${file}`);
		} else {
			log.info(`... done.`);
		}
		// Cleanup config files written by lintHtmFilel()
		dirs.forEach(relPath => {
			cd(join(dir, relPath));
			rm(".htmlcsrc");
		});
		cd(curDir);
		return data;
	}

	static file(path, cleanup = false) {
		let cfg = AppConfig.getInstance();
		// let log = Logger.getInstance(cfg.options.logging);

		// Config sample:
		// https://github.com/ecomfe/htmlcs/blob/HEAD/lib/default/htmlcsrc
		if (!test("-f", join(dirname(path), ".htmlcsrc"))) {
			FileUtils.writeJsonFile(
				cfg.options.dependencies.htmlcs.config,
				dirname(path),
				".htmlcsrc",
				false,
			);
		}
		let result = htmlcs.hintFile(path);
		if (cleanup) {
			rm(join(dirname(path), ".htmlcsrc"));
		}
		return result;
	}
}

export class Html {
	/**
	 * Get the content between a HTML opening and closing tag
	 */
	static getTagContent(data, tag) {
		let retVal = [];
		try {
			let regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, "gim");
			let result = data.match(regex);
			if (result) {
				result.map(val => {
					let strip = new RegExp(`</?${tag}.*?>`, "gi");
					retVal.push(val.replace(strip, ""));
				});
			}
		} catch (err) {}
		return retVal;
	}
}
