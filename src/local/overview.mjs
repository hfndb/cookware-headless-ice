import { basename, extname, join } from "path";
import shelljs from "shelljs";
import { AppConfig, FileUtils, StringExt } from "../lib/index.mjs";
import { LineReader } from "../lib/files.mjs";
import { Content } from "../lib/html.mjs";
import { getStamp, renderSysTemplate } from "./misc.mjs";
import { ArrayUtils } from "../lib/object.mjs";
import { Packages } from "../lib/package-json.mjs";
import { Item, Group, Report } from "../lib/reporting.mjs";
const { test } = shelljs;

let cfg = AppConfig.getInstance();

function readFile(dir, file, group, report) {
	let lr = new LineReader(join(cfg.dirProject, dir, file));
	let item = new Item(report, file);
	let isInComment = false;
	do {
		let line = lr.next();
		if (line === false) break; // End of file
		isInComment = parseLine(line, item, isInComment);
	} while (true);
	group.addItem(report, item);
}

function parseLine(line, item, isInComment) {
	line = StringExt.strip(line, true, true);
	let cmtSingleLine = []; // Start of single line comments
	let cmtStart = []; // Start of multi-line comments
	let cmtEnd = []; // End of multi-line comments
	let ext = extname(item.description);
	switch (ext) {
		case ".js":
		case ".cjs":
		case ".mjs":
		case ".ts":
		case ".cts":
		case ".mts":
			cmtStart.push("/*");
			cmtEnd.push("*/");
			cmtSingleLine.push("//");
			break;
		case ".css":
		case ".scss":
			cmtStart.push("/*");
			cmtEnd.push("*/");
			cmtSingleLine.push("//");
			break;
		case ".md":
			cmtSingleLine.push("[comment]: <> (");
			break;
		case ".html":
		case ".njk":
			// nunjucks
			cmtStart.push("{#");
			cmtEnd.push("#}");
			// html
			cmtStart.push("<!--");
			cmtEnd.push("-->");
			break;
		case ".sh":
		case ".bat":
			cmtSingleLine.push("#");
	}
	let newComment = false;
	if (line.length == 0) {
		item.columns[2]++; // empty line
	} else if (isInComment) {
		item.columns[1]++; // continuation comment
		if (ArrayUtils.endsWith(line, cmtEnd)) {
			isInComment = false;
		}
	} else if (ArrayUtils.startsWith(line, cmtSingleLine)) {
		item.columns[1]++;
	} else {
		if (ArrayUtils.startsWith(line, cmtStart)) {
			newComment = isInComment = true;
			item.columns[1]++; // begin comment
		}
		if (!isInComment) {
			item.columns[0]++; // code
		}
	}
	if (newComment && ArrayUtils.endsWith(line, cmtEnd)) {
		isInComment = false;
	}
	return isInComment;
}

export function generateStats() {
	let options = {
		allowedExtensions: [""],
		excludeList: ["dist", "node_modules"],
		recursive: true,
	};
	let report = new Report(["File", "Code", "Comments", "Empty lines"]);
	function addGroup(report, description, allowedExtensions, dir, skip = "") {
		let group = new Group(report, description);
		options.allowedExtensions = allowedExtensions;
		if (!test("-d", join(cfg.dirProject, dir))) return; // Directory doesn't exist
		let files = FileUtils.getFileList(join(cfg.dirProject, dir), options);
		files.forEach(file => {
			let base = basename(file);
			if (skip && !base.includes(skip)) return;
			if (ArrayUtils.inExcludeList(cfg.options.projectOverview.exclude, file))
				return;
			readFile(dir, file, group, report);
		});
		report.addGroup(group);
	}
	if (cfg.options.projectOverview.configuration) {
		addGroup(report, "Configuration", [".json"], "", "config");
	}
	if (cfg.options.projectOverview.code) {
		addGroup(
			report,
			"Source Code",
			[".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"],
			cfg.options.javascript.dirs.source,
		);
	}
	if (cfg.options.projectOverview.content) {
		addGroup(report, "Content pages", [".html"], "");
	}
	if (cfg.options.projectOverview.templates) {
		addGroup(report, "Template pages", [".njk"], "");
	}
	if (cfg.options.projectOverview.styling) {
		addGroup(report, "Styling", [".css", ".scss"], "");
	}
	if (cfg.options.projectOverview.documentation) {
		addGroup(report, "Documentation", [".md"], "");
	}
	if (cfg.options.projectOverview.goodies) {
		addGroup(report, "Goodies", [".bat", ".sh"], "");
	}
	Object.assign(report, {
		showPackages: cfg.options.projectOverview.showPackages,
	});
	Object.assign(report, { packages: Packages.getPackages(cfg.dirProject) });
	return report;
}

export function writeStats() {
	// Get data
	let pg = "project-overview.html";
	let context = Content.getDefaultContext(pg);
	context = Object.assign(context, { report: generateStats() });
	let data = renderSysTemplate(pg, context);
	let rootDir = Content.getOutputDir();
	// Correct path of CSS in HTML
	// @todo Works fine in Linux, not in Windows
	data = data.replace(
		new RegExp("/static/sys/css/", "g"),
		join(cfg.dirMain, "dist", "static", "css") + "/",
	);
	// Create dir, if needed
	let dir = join(rootDir, cfg.options.projectOverview.dir);
	FileUtils.mkdir(dir);
	// Write file
	let path = join(cfg.options.projectOverview.dir, getStamp() + ".html");
	FileUtils.writeFile(rootDir, path, data, true);
}
