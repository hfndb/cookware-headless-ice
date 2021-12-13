"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeStats = exports.generateStats = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const files_1 = require("../lib/files");
const html_1 = require("../lib/html");
const misc_1 = require("./misc");
const object_1 = require("../lib/object");
const package_json_1 = require("../lib/package-json");
const reporting_1 = require("../lib/reporting");
let cfg = lib_1.AppConfig.getInstance();
function readFile(dir, file, group, report) {
    let lr = new files_1.LineReader(path_1.join(cfg.dirProject, dir, file));
    let item = new reporting_1.Item(report, file);
    let isInComment = false;
    do {
        let line = lr.next();
        if (line === false)
            break;
        isInComment = parseLine(line, item, isInComment);
    } while (true);
    group.addItem(report, item);
}
function parseLine(line, item, isInComment) {
    line = lib_1.StringExt.strip(line, true, true);
    let cmtSingleLine = [];
    let cmtStart = [];
    let cmtEnd = [];
    let ext = path_1.extname(item.description);
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
            cmtStart.push("{#");
            cmtEnd.push("#}");
            cmtStart.push("<!--");
            cmtEnd.push("-->");
            break;
        case ".sh":
        case ".bat":
            cmtSingleLine.push("#");
    }
    let newComment = false;
    if (line.length == 0) {
        item.columns[2]++;
    }
    else if (isInComment) {
        item.columns[1]++;
        if (object_1.ArrayUtils.endsWith(line, cmtEnd)) {
            isInComment = false;
        }
    }
    else if (object_1.ArrayUtils.startsWith(line, cmtSingleLine)) {
        item.columns[1]++;
    }
    else {
        if (object_1.ArrayUtils.startsWith(line, cmtStart)) {
            newComment = isInComment = true;
            item.columns[1]++;
        }
        if (!isInComment) {
            item.columns[0]++;
        }
    }
    if (newComment && object_1.ArrayUtils.endsWith(line, cmtEnd)) {
        isInComment = false;
    }
    return isInComment;
}
function generateStats() {
    let options = {
        allowedExtensions: [""],
        excludeList: ["dist", "node_modules"],
        recursive: true
    };
    let report = new reporting_1.Report(["File", "Code", "Comments", "Empty lines"]);
    function addGroup(report, description, allowedExtensions, dir, skip = "") {
        let group = new reporting_1.Group(report, description);
        options.allowedExtensions = allowedExtensions;
        if (!shelljs_1.test("-d", path_1.join(cfg.dirProject, dir)))
            return;
        let files = lib_1.FileUtils.getFileList(path_1.join(cfg.dirProject, dir), options);
        files.forEach((file) => {
            let base = path_1.basename(file);
            if (skip && !base.includes(skip))
                return;
            if (object_1.ArrayUtils.inExcludeList(cfg.options.projectOverview.exclude, file))
                return;
            readFile(dir, file, group, report);
        });
        report.addGroup(group);
    }
    if (cfg.options.projectOverview.configuration) {
        addGroup(report, "Configuration", [".json"], "", "config");
    }
    if (cfg.options.projectOverview.code) {
        addGroup(report, "Source Code", [".js", ".ts"], cfg.options.javascript.dirs.source);
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
        showPackages: cfg.options.projectOverview.showPackages
    });
    Object.assign(report, { packages: package_json_1.Packages.getPackages(cfg.dirProject) });
    return report;
}
exports.generateStats = generateStats;
function writeStats() {
    let pg = "project-overview.html";
    let context = html_1.Content.getDefaultContext(pg);
    context = Object.assign(context, { report: generateStats() });
    let data = misc_1.renderSysTemplate(pg, context);
    let rootDir = html_1.Content.getOutputDir();
    data = data.replace(new RegExp("/static/sys/css/", "g"), path_1.join(cfg.dirMain, "dist", "static", "css") + "/");
    let dir = path_1.join(rootDir, cfg.options.projectOverview.dir);
    lib_1.FileUtils.mkdir(dir);
    let path = path_1.join(cfg.options.projectOverview.dir, misc_1.getStamp() + ".html");
    lib_1.FileUtils.writeFile(rootDir, path, data, true);
}
exports.writeStats = writeStats;
//# sourceMappingURL=overview.js.map