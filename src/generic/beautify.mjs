"use strict";
import { extname, join } from "path";
import shelljs from "shelljs";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { SysUtils } from "../generic/sys.mjs";
import prettier from "prettier";
const { test } = shelljs;

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);

export class Beautify {
	/**
	 * Stand-alone version to beautify a file or directory with content
	 *
	 * @param {string} path
	 */
	static standAlone(path) {
		if (path.endsWith("/")) path = path.substr(0, path.length - 1);
		let pathIsDir = test("-d", join(cfg.dirProject, path));
		let files = pathIsDir
			? FileUtils.getFileList(join(cfg.dirProject, path))
			: [path];
		if (!pathIsDir) path = "";
		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			let content = FileUtils.readFile(join(cfg.dirProject, path, file));
			let data = Beautify.content(file, content);
			if (data) {
				FileUtils.writeFile(cfg.dirProject, join(path, file), data, false);
			}
		}
	}

	/**
	 * Beautify html, js, ts or scss file(s)
	 * Uses configuration in settings.json
	 *
	 * @param {string} file name
	 * @param {string} content of file
	 *
	 * @todo Implement Rust version, faster - see /docs/languages.md
	 */
	static content(file, content) {
		let cfg = AppConfig.getInstance();
		let ext = extname(file);
		let options = cfg.options.dependencies.prettier.config;
		let parser = ""; // See https://prettier.io/docs/en/options.html#parser
		switch (ext) {
			case ".css":
				parser = "css";
				break;
			case ".scss":
				parser = "css"; // postcss is deprecated
				break;
			case ".html":
				parser = "html";
				break;
			case ".js":
			case ".cjs":
			case ".mjs":
				parser = "babel";
				break;
			case ".ts":
			case ".cts":
			case ".mts":
				parser = "typescript";
				break;
			default:
				return "";
		}
		Object.assign(options, {
			filepath: file,
			parser: parser,
		});
		try {
			let data = prettier.format(content, options || undefined);
			log.info(`- Beautyfied ${file}`);
			return data;
		} catch (err) {
			log.warn(`- Failed to render file ${file} `, Logger.error2string(err));
			SysUtils.notifyCode(parser);
			return "";
		}
	}
}
