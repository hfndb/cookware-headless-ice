"use strict";
import { join } from "node:path";
import { platform } from "node:os";
// import { EOL } from 'node:os'
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { FileStatus } from "../generic/file-system/diff.mjs";
import { Git as GitGeneric } from "../generic/git.mjs";
import { Content } from "../generic/html.mjs";
import { Sitemap } from "../generic/sitemap.mjs";
import { exec, test, touch, SysUtils } from "../generic/sys.mjs";
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
	 * @param {string} what What exactly to generate, comma-delimited list, one or more of content,sass,src
	 * @param {boolean} verbose
	 */
	static generateWeb(what, verbose) {
		let session = SessionVars.getInstance();
		if (what) {
			// Specific instruction
			what = what.split(",");
		} else {
			// Default
			what = ["content", "sass", "src"];
		}

		if (what.includes("src")) {
			SourceUtils.compile(verbose);
		}
		if (what.includes("sass")) {
			SassUtils.compile(verbose);
		}
		let dir = join(cfg.dirProject, cfg.options.html.dirs.content);

		if (!what.includes("content")) {
			return;
		}

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
	createDirTree(rootDir, tree, sourceControl = false) {
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
				Misc.createDirTree(join(rootDir, key), value, sourceControl);
			}
		});
	}

	/**
	 * Initialize new project
	 */
	static initNewProject() {
		process.env.isNew = "true"; // Hack to prevent passing a var through the call stack
		let cfg = AppConfig.getInstance("cookware-headless-ice");
		let dir = join(cfg.dirMain, "default-project");
		if (!test("-d", dir)) {
			console.error(`Couldn't find directory ${dir}`);
			return;
		}
		console.log("Initializing new project directory");
		cp("-fr", join(dir, sep, "*"), join(cfg.dirProject, sep));
		cfg.read();
		let log = Logger.getInstance(cfg.options.logging);
		process.on("uncaughtException", err => {
			if (!log.isShuttingDown) {
				console.log(Logger.error2string(err));
			}
		});
		Misc.createDirTree(cfg.dirProject, cfg.options.newProject.dirStructure, true);
		console.log("... done");
	}
}
