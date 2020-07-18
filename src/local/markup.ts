import { join, dirname } from "path";
import { cd, pwd, rm, test } from "shelljs";
import { AppConfig, FileStatus, FileUtils, Logger } from "../lib";
import { Content } from "../lib/html";

/**
 * For lintFile
 */
interface lintResult {
	type: string;
	line: number;
	column: number;
	message: string;
	rule: string;
	code: string;
}

export class Lint {
	/**
	 * Lint all files in HTML content directory
	 *
	 * @returns data of renderded template, if write2disk = false (for dev server)
	 */
	static content(write2disk: boolean = true): string {
		let cfg = AppConfig.getInstance();
		let content = new Content();
		let log = Logger.getInstance(cfg.options.logging);
		let curDir = pwd();
		let dir = join(cfg.dirProject, cfg.options.html.dirs.content);
		let dirs: string[] = [];
		let files = FileUtils.getFileList(dir, {
			allowedExtensions: [
				".html",
				".njk"
			]
		});
		let output: object[] = [];

		if (process.env.NODE_ENV !== "test") {
			log.info("Linting files...");
		}

		// Collect linting output
		files.forEach((file: string) => {
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
				output: Lint.file(join(dir, file))
			});
		});

		let entry = new FileStatus(join(cfg.dirMain, "content"));
		entry.setSoure("lint.html", ".html");
		let data = content.render(entry.dir, entry.source, false, { files: output });

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
		dirs.forEach((relPath: string) => {
			cd(join(dir, relPath));
			rm(".htmlcsrc");
		});
		cd(curDir);

		return data;
	}

	static file(path: string, cleanup: boolean = false): lintResult[] {
		let cfg = AppConfig.getInstance();
		// let log = Logger.getInstance(cfg.options.logging);
		const htmlcs = require("htmlcs");
		// Config sample:
		// https://github.com/ecomfe/htmlcs/blob/HEAD/lib/default/htmlcsrc

		if (!test("-f", join(dirname(path), ".htmlcsrc"))) {
			FileUtils.writeJsonFile(cfg.options.dependencies.htmlcs.config, dirname(path), ".htmlcsrc", false);
		}

		let result: lintResult[] = htmlcs.hintFile(path);

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
	static getTagContent(data: string, tag: string): string[] {
		let retVal: string[] = [];

		try {
			let regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, "gim");
			let result = data.match(regex);
			if (result) {
				result.map(function(val) {
					let strip = new RegExp(`</?${tag}.*?>`, "gi");
					retVal.push(val.replace(strip, ""));
				});
			}
		} catch (err) {}
		return retVal;
	}
}
