"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateStats = generateStats;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _files = require("../lib/files");

var _object = require("../lib/object");

var _packageJson = require("../lib/package-json");

var _reporting = require("../lib/reporting");

function readFile(dir, file, group, report) {
  let cfg = _lib.AppConfig.getInstance();

  let lr = new _files.LineReader((0, _path.join)(cfg.dirProject, dir, file));
  let item = new _reporting.Item(report, file);
  let isInComment = false;

  do {
    let line = lr.next();
    if (line === false) break;
    isInComment = parseLine(line, item, isInComment);
  } while (true);

  group.addItem(report, item);
}

function parseLine(line, item, isInComment) {
  line = _lib.StringUtils.strip(line, true, true);
  let cmtSingleLine = [];
  let cmtStart = [];
  let cmtEnd = [];
  let ext = (0, _path.extname)(item.description);

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
  } else if (isInComment) {
    item.columns[1]++;

    if (_object.ArrayUtils.endsWith(line, cmtEnd)) {
      isInComment = false;
    }
  } else if (_object.ArrayUtils.startsWith(line, cmtSingleLine)) {
    item.columns[1]++;
  } else {
    if (_object.ArrayUtils.startsWith(line, cmtStart)) {
      newComment = isInComment = true;
      item.columns[1]++;
    }

    if (!isInComment) {
      item.columns[0]++;
    }
  }

  if (newComment && _object.ArrayUtils.endsWith(line, cmtEnd)) {
    isInComment = false;
  }

  return isInComment;
}

function generateStats() {
  let cfg = _lib.AppConfig.getInstance();

  let options = {
    allowedExtensions: [""],
    excludeList: ["dist", "node_modules"],
    recursive: true
  };
  let report = new _reporting.Report(["File", "Code", "Comments", "Empty lines"]);

  function addGroup(report, description, allowedExtensions, dir, skip = "") {
    let group = new _reporting.Group(report, description);
    options.allowedExtensions = allowedExtensions;
    if (!(0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, dir))) return;

    let files = _lib.FileUtils.getFileList((0, _path.join)(cfg.dirProject, dir), options);

    files.forEach(file => {
      let base = (0, _path.basename)(file);
      if (skip && !base.includes(skip)) return;
      if (_object.ArrayUtils.inExcludeList(cfg.options.projectOverview.exclude, file)) return;
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
  Object.assign(report, {
    packages: (0, _packageJson.getPackages)(cfg.dirProject)
  });
  return report;
}
//# sourceMappingURL=overview.js.map