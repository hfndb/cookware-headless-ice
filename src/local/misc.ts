import { extname, join } from "path";
import { platform } from "os";
// import { EOL } from 'os'
import { exec, test } from "shelljs";
import { AppConfig, FileUtils, Logger } from "../lib";
import { Sitemap } from "../lib/sitemap";
import { Formatter } from "../lib/utils";
import { compile as compileJs } from "./babel";
import { Content } from "../lib/html";
import { SassUtils } from "./styling";
import { ProcessingTypes, SessionVars } from "../sys/session";
// import { compileTypeScript } from "./typescript";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance(cfg.options.logging);

/**
 * Create local website:
 * - Transcompile changed Scss, Flow and TypeScript
 * - Render changed .html using template engine
 * - Generate Google sitemap
 *
 */
export function generateWeb(verbose: boolean): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance();
	let session = SessionVars.getInstance();

	compileJs(verbose);
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
		log.warn(
			`HTML content directory "${
				cfg.options.html.dirs.content
			}" not found, skipping...`
		);
	}
}

/**
 * Initialization of auto-backup for dev server
 *
 * @param isFirst First file gets another file name
 */
export function backupChangedSource(isFirst: boolean = false): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance();
	const frmtr = Formatter.getInstance();
	let name = isFirst ? "first" : "changes";
	let prefix = frmtr.date(new Date(), "YYYYMMDD-HHmm");

	let arch = join("backups", `${prefix}-${name}.tgz`);
	let diff = join("notes", `${prefix}-git.diff`);
	let cmd = "";

	if (platform() == "win32") {
		cmd = join(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);
		if (!test("-e", "bin/backup-source.bat")) {
			log.error(
				"You are trying to run a non existing batch file bin/backup-source.bat.\n\
				 Please write it and then retry. If it actually works, you might consider contrituting it"
			);
			return;
		}
	} else if (["darwin", "freebsd", "linux", "openbsd"].includes(platform())) {
		cmd = join(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);
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
 * For searchProject()
 */
interface searchFile {
	name: string;
	results: object[];
}

/**
 * For searchProject()
 */
interface searchDir {
	name: string;
	files: searchFile[];
}

/**
 * For searchProject()
 */
interface searchFinal {
	dirs: searchDir[];
}

/**
 * Search project files for a string
 *
 * @param html If true, return HTML code
 * @returns nested object with found entries
 */
export function searchProject(searchFor: string, html: boolean): object {
	let cfg = AppConfig.getInstance();
	let retVal: searchFinal = { dirs: [] };
	const dirs = [
		cfg.options.javascript.dirs.source,
		cfg.options.sass.dirs.source,
		cfg.options.html.dirs.content
	];
	for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
		if (!dirs.includes(cfg.options.html.dirs.templates[i])) {
			dirs.push(cfg.options.html.dirs.templates[i]);
		}
	}
	if (test("-d", join(cfg.dirProject, "notes"))) dirs.push("notes");
	if (test("-d", join(cfg.dirProject, "docs"))) dirs.push("docs");

	function stripHeaders(data: string): string {
		return data.replace(/<h\d>/, "").replace(/<\/h\d>/, "");
	}

	for (let i = 0; i < dirs.length; i++) {
		let dir = dirs[i];
		let files = FileUtils.getFileList(join(cfg.dirProject, dir), {
			allowedExtensions: [
				".txt",
				".md",
				".scss",
				".css",
				".ts",
				".js",
				".njk",
				".html"
			]
		});
		let dirContent: searchDir = {
			name: dir,
			files: []
		};

		files.forEach((file: string) => {
			let fileContent: searchFile = {
				name: file,
				results: FileUtils.searchInFile(
					join(cfg.dirProject, dir, file),
					searchFor,
					{
						inverse: false,
						ignoreCase: true,
						markFound: html ? `<span style="color: red;">$</span>` : "",
						processor: stripHeaders
					}
				)
			};
			if (fileContent.results.length > 0) {
				dirContent.files.push(fileContent);
			}
		});
		if (dirContent.files.length > 0) {
			retVal.dirs.push(dirContent);
		}
	}

	return retVal;
}