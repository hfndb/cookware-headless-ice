"use strict";
import { join } from "node:path";
import { platform } from "node:os";
// import { EOL } from 'node:os'
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { FileStatus } from "../generic/file-system/diff.mjs";
import { Git as GitGeneric } from "../generic/git.mjs";
import { Content } from "../generic/html.mjs";
import { Sitemap } from "../generic/sitemap.mjs";
import { exec, test, SysUtils } from "../generic/sys.mjs";
import { Formatter } from "../generic/utils.mjs";
import { SourceUtils } from "./source.mjs";
import { SassUtils } from "./styling.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);

/**
 * Class to facilitate color system, which auto generates CSS and JavaScript
 */
export class Colors {
	static getConfig() {
		let path = join(cfg.dirProject, "dev", "colors.json");
		let go = test("-f", join(path));
		return go ? FileUtils.readJsonFile(path) : null;
	}

	/**
	 * Write .js and .sass related to colors as defined in project config
	 */
	static generate() {
		let json = Colors.getConfig();
		if (!json || !json.active) {
			log.info("Colors not used in this project");
			return;
		}
		let lengthPadding = 30;
		let comment =
			"\n/".padEnd(lengthPadding, "*") +
			"\n" +
			" * ## \n" +
			" ".padEnd(lengthPadding - 1, "*") +
			"/\n";
		let sass = {
			content: comment.replace("##", "Auto-generated file"),
			outFile: json.sass,
		};
		let src = {
			content: comment.replace("##", "Auto-generated file") + "var colors = {};\n",
			outFile: json.src,
		};
		let keys = Object.keys(json.projects);

		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];

			if (key == "Cookware" && cfg.isProject) continue;
			let colors = json.projects[key];

			for (let c = 0; c < colors.length; c++) {
				if (c == 0) {
					// Project header
					sass.content += comment.replace("##", colors[c].comment);
					src.content += comment.replace("##", colors[c].comment);
					src.content += `colors["${key}"] = {};\n`;
					continue;
				}

				// Color
				let cmt = colors[c].comment ? " // " + colors[c].comment : "";
				sass.content += `$${colors[c].name}: #${colors[c].hex};${cmt}\n`;
				src.content += `colors["${key}"]["${colors[c].name}"] = "#${colors[c].hex}";${cmt}\n`;
			}
		}

		// Add looks
		src.content +=
			comment.replace("##", "Defined looks of project UI") +
			"\nvar looks = " +
			JSON.stringify(cfg.options.sass.looks, null, "\t") +
			";\n";

		// See if files need to be written, if so do do
		let fullPath = join(
			cfg.dirProject,
			cfg.options.sass.dirs.source,
			sass.outFile,
		);

		let needsWrite =
			!test("-f", fullPath) ||
			FileUtils.readFile(fullPath).trim() != sass.content.trim();
		if (needsWrite) {
			FileUtils.writeFile(
				cfg.dirProject,
				join(cfg.options.sass.dirs.source, sass.outFile),
				sass.content,
				true,
			);
		}

		fullPath = join(cfg.dirProject, src.outFile);
		needsWrite =
			!test("-f", fullPath) || FileUtils.readFile(fullPath) != src.content;

		if (needsWrite) {
			FileUtils.writeFile(cfg.dirProject, src.outFile, src.content, true);
		}
	}
}

export class Git {
	/**
	 * @param {string} file
	 */
	static read(file) {
		let gt = new GitGeneric();
		if (file) gt.file = file;
		gt.readCommits();
	}

	/**
	 * @param {string} file
	 */
	static list(file) {
		let gt = new GitGeneric();
		gt.list(file);
	}

	/**
	 * @param {string} hash
	 */
	static show(hash) {
		let gt = new GitGeneric();
		gt.show(hash);
	}
}

export class Misc {
	/**
	 * Create local website:
	 * - Transcompile changed Scss, JavaScript, Flow and TypeScript
	 * - Render changed .html using template engine
	 * - Generate Google sitemap
	 *
	 */
	static generateWeb(verbose) {
		let session = SessionVars.getInstance();
		SourceUtils.compile(verbose);
		SassUtils.compile(verbose);
		let dir = join(cfg.dirProject, cfg.options.html.dirs.content);

		if (test("-d", dir)) {
			let content = new Content();
			content.renderAll(verbose);
			content.rendered.forEach(file => {
				session.add(ProcessingTypes.html, file);
			});
			Sitemap.generate(verbose);
		} else {
			log.info(
				`Path ./${cfg.options.html.dirs.content} doesn't exist. Request to render ignored`,
			);
		}
	}

	static getStamp() {
		const frmtr = Formatter.getInstance();
		return frmtr.date(new Date(), "YYYYMMDD-HHmm");
	}

	/**
	 * Initialization of auto-backup for dev server
	 *
	 * @param {boolean} isFirst First file gets another file name
	 */
	static backupChangedSource(isFirst = false) {
		let name = isFirst ? "first" : "changes";
		let prefix = Misc.getStamp();
		let arch = join("backups", `${prefix}-${name}.tgz`);
		let diff = join("notes", `${prefix}-git.diff`);
		let cmd = "";

		if (platform() == "win32") {
			cmd = join(cfg.dirMain, "bin", "backup-source.sh").concat(
				` ${arch} ${diff}`,
			);
			if (!test("-e", "bin/backup-source.bat")) {
				log.error(
					"You are trying to run a non existing batch file bin/backup-source.bat.\n\
					Please write it and then retry. If it actually works, you might consider contrituting it",
				);
				return;
			}
		} else if (["darwin", "freebsd", "linux", "openbsd"].includes(platform())) {
			cmd = join(cfg.dirMain, "bin", "backup-source.sh").concat(
				` ${arch} ${diff}`,
			);
		} else {
			log.warn("You are trying to run an external bash script. No can do");
			return;
		}
		try {
			exec(cmd, {});
		} catch (err) {
			log.error(`Error creating ${arch} ${diff}`, Logger.error2string(err));
		}
	}

	/**
	 * Render a system template in the content dir
	 */
	static renderSysTemplate(path, context, content) {
		let cfg = AppConfig.getInstance();
		if (!content) content = new Content();
		let session = SessionVars.getInstance();

		let entry = new FileStatus(join(cfg.dirMain, "content"));
		entry.setSource(path, ".html");

		let data = content.render(entry.dir, entry.source, {
			additionalContext: context,
			useProjectTemplates: false,
		});

		content.rendered.forEach(file => {
			session.add(ProcessingTypes.html, file);
		});

		return data;
	}
}
