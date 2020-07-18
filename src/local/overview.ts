import { basename, extname, join } from "path";
import { test } from "shelljs";
import { fileListOptions, AppConfig, FileUtils, StringUtils } from "../lib";
import { LineReader } from "../lib/files";
import { ArrayUtils } from "../lib/object";
import { getPackages } from "../lib/package-json";
import { Item, Group, Report } from "../lib/reporting";

function readFile(dir: string, file: string, group: Group, report: Report) {
	let cfg = AppConfig.getInstance();
	let lr = new LineReader(join(cfg.dirProject, dir, file));

	let item: Item = new Item(report, file);
	let isInComment = false;
	do {
		let line = lr.next();
		if (line === false) break; // End of file
		isInComment = parseLine(line, item, isInComment);
	} while (true);
	group.addItem(report, item);
}

function parseLine(line: string, item: Item, isInComment: boolean): boolean {
	line = StringUtils.strip(line, true, true);

	let cmtSingleLine: string[] = []; // Start of single line comments
	let cmtStart: string[] = []; // Start of multi-line comments
	let cmtEnd: string[] = []; // End of multi-line comments
	let ext = extname(item.description);

	switch (ext) {
		case ".js":
		case ".ts":
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

export function generateStats(): Report {
	let cfg = AppConfig.getInstance();
	let options: fileListOptions = {
		allowedExtensions: [
			""
		],
		excludeList: [
			"dist",
			"node_modules"
		],
		recursive: true
	};
	let report = new Report([
		"File",
		"Code",
		"Comments",
		"Empty lines"
	]);

	function addGroup(report: Report, description: string, allowedExtensions: string[], dir: string, skip: string = "") {
		let group = new Group(report, description);
		options.allowedExtensions = allowedExtensions;
		if (!test("-d", join(cfg.dirProject, dir))) return; // Directory doesn't exist
		let files = FileUtils.getFileList(join(cfg.dirProject, dir), options);
		files.forEach((file: string) => {
			let base = basename(file);
			if (skip && !base.includes(skip)) return;
			if (ArrayUtils.inExcludeList(cfg.options.projectOverview.exclude, file)) return;
			readFile(dir, file, group, report);
		});
		report.addGroup(group);
	}

	if (cfg.options.projectOverview.configuration) {
		addGroup(
			report,
			"Configuration",
			[
				".json"
			],
			"",
			"config"
		);
	}

	if (cfg.options.projectOverview.code) {
		addGroup(
			report,
			"Source Code",
			[
				".js",
				".ts"
			],
			cfg.options.javascript.dirs.source
		);
	}

	if (cfg.options.projectOverview.content) {
		addGroup(
			report,
			"Content pages",
			[
				".html"
			],
			""
		);
	}

	if (cfg.options.projectOverview.templates) {
		addGroup(
			report,
			"Template pages",
			[
				".njk"
			],
			""
		);
	}

	if (cfg.options.projectOverview.styling) {
		addGroup(
			report,
			"Styling",
			[
				".css",
				".scss"
			],
			""
		);
	}

	if (cfg.options.projectOverview.documentation) {
		addGroup(
			report,
			"Documentation",
			[
				".md"
			],
			""
		);
	}

	if (cfg.options.projectOverview.goodies) {
		addGroup(
			report,
			"Goodies",
			[
				".bat",
				".sh"
			],
			""
		);
	}

	Object.assign(report, { showPackages: cfg.options.projectOverview.showPackages });
	Object.assign(report, { packages: getPackages(cfg.dirProject) });

	return report;
}
