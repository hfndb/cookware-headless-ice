"use strict";
import { basename, extname, join } from "path";
import shelljs from "shelljs";
import { AppConfig, FileUtils, StringExt } from "../generic/index.mjs";
import { Content } from "../generic/html.mjs";
import { Misc } from "./misc.mjs";
import { ArrayUtils } from "../generic/object.mjs";
import { Packages } from "../generic/package-json.mjs";
import { Ascii } from "../generic/reporting/ascii.mjs";
import { Item, Group, Report } from "../generic/reporting/index.mjs";
const { test } = shelljs;

let cfg = AppConfig.getInstance();

function readFile(dir, file, group, report) {
	let src = FileUtils.readFile(join(cfg.dirProject, dir, file));
	let lines = src.split(/\r?\n/);
	let item = new Item(report, file);
	let isInComment = false;

	for (let i = 0; i < lines.length; i++) {
		isInComment = parseLine(lines[i], item, isInComment);
	}

	group.addItem(report, item);
}

function parseLine(line, item, isInComment) {
	line = StringExt.strip(line, true, true);
	let cmtSingleLine = []; // Start of single line comments
	let cmtStart = []; // Start of multi-line comments
	let cmtEnd = []; // End of multi-line comments
	let ext = extname(item.description);
	let newComment = false;

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
	let report = new Report(["Code", "Comments", "Empty lines"]);
	report.description = "File"; // Utter left column

	function addGroup(report, description, allowedExtensions, dir, skip = "") {
		if (!test("-d", join(cfg.dirProject, dir))) return; // Directory doesn't exist
		options.allowedExtensions = allowedExtensions;

		let group = new Group(report, description);
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
	let rprt = generateStats();
	rprt.finalize();

	// ---------------------------------------------------------
	// Produce HTML output
	// ---------------------------------------------------------
	let context = Content.getDefaultContext(pg);
	context = Object.assign(context, { report: rprt });

	let data = Misc.renderSysTemplate(pg, context);

	// Correct path of CSS in HTML for offline usage
	data = data.replace(
		new RegExp("/static/sys/css/", "g"),
		join(cfg.dirMain, "dist", "static", "css") + "/",
	);

	// Write HTML file
	let file = join(cfg.options.projectOverview.dir, Misc.getStamp());
	FileUtils.writeFile(Content.getOutputDir(), file + ".html", data, true);

	// ---------------------------------------------------------
	// Produce TSV output for usage in for example spreadsheet
	// ---------------------------------------------------------
	let sc = new Ascii({
		autoWidth: true, // Aka no ascii fixed length
		columns: [
			{
				caption: "Code",
				type: "int",
			},
			{
				caption: "Comments",
				type: "int",
			},
			{
				caption: "Empty lines",
				type: "int",
			},
		],
		columnSeparator: "\t",
	});
	data = Ascii.get(rprt, sc);

	FileUtils.writeFile(Content.getOutputDir(), file + ".tsv", data, true);
}
