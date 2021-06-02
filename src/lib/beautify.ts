import { extname, join } from "path";
import { test } from "shelljs";
import { AppConfig, FileUtils, Logger } from "../lib";
import { SysUtils } from "../lib/sys";

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);

export class Beautify {
	/**
	 * Stand-alone version to beautify a file or directory with content
	 */
	static standAlone(path: string): void {
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
	 * Uses configuration in config.json
	 *
	 * @param file name
	 * @param content of file
	 */
	static content(file: string, content: string): string {
		let cfg = AppConfig.getInstance();
		let ext = extname(file);
		let options = cfg.options.dependencies.prettier.config;
		let parser = ""; // See https://prettier.io/docs/en/options.html#parser
		const prettier = require("prettier");

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
				parser = "babel";
				break;
			case ".ts":
				parser = "typescript";
				break;
			default:
				return "";
		}

		Object.assign(options, {
			filepath: file,
			parser: parser
		});

		try {
			let data = prettier.format(content, options || undefined);
			log.info(`- Beautyfied ${file}`);
			return data;
		} catch (err) {
			log.warn(`- Failed to render file ${file} `, Logger.error2string(err));
			switch (parser) {
				case "css":
					if (cfg.options.sys.notifications.compileIssue.sass)
						SysUtils.notify("Sass issue");
					break;
				case "html":
					if (cfg.options.sys.notifications.compileIssue.html)
						SysUtils.notify("Html issue");
					break;
				case "babel":
				case "typescript":
					if (cfg.options.sys.notifications.compileIssue.code)
						SysUtils.notify("Code issue");
					break;
			}
			return "";
		}
	}
}
