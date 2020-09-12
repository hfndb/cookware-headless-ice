"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateWeb = generateWeb;
exports.backupChangedSource = backupChangedSource;
exports.searchProject = searchProject;

var _path = require("path");

var _os = require("os");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _sitemap = require("../lib/sitemap");

var _utils = require("../lib/utils");

var _babel = require("./babel");

var _html = require("../lib/html");

var _styling = require("./styling");

var _session = require("../sys/session");

let cfg = _lib.AppConfig.getInstance();

let log = _lib.Logger.getInstance(cfg.options.logging);

function generateWeb(verbose) {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance();

  let session = _session.SessionVars.getInstance();

  (0, _babel.compile)(verbose);

  _styling.SassUtils.compile(verbose);

  let dir = (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.content);

  if ((0, _shelljs.test)("-d", dir)) {
    let content = new _html.Content();
    content.renderAll(verbose);
    content.rendered.forEach(file => {
      session.add(_session.ProcessingTypes.html, file);
    });

    _sitemap.Sitemap.generate(verbose);
  } else {
    log.warn(`HTML content directory "${cfg.options.html.dirs.content}" not found, skipping...`);
  }
}

function backupChangedSource(isFirst = false) {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance();

  const frmtr = _utils.Formatter.getInstance();

  let name = isFirst ? "first" : "changes";
  let prefix = frmtr.date(new Date(), "YYYYMMDD-HHmm");
  let arch = (0, _path.join)("backups", `${prefix}-${name}.tgz`);
  let diff = (0, _path.join)("notes", `${prefix}-git.diff`);
  let cmd = "";

  if ((0, _os.platform)() == "win32") {
    cmd = (0, _path.join)(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);

    if (!(0, _shelljs.test)("-e", "bin/backup-source.bat")) {
      log.error("You are trying to run a non existing batch file bin/backup-source.bat.\n\
				 Please write it and then retry. If it actually works, you might consider contrituting it");
      return;
    }
  } else if (["darwin", "freebsd", "linux", "openbsd"].includes((0, _os.platform)())) {
    cmd = (0, _path.join)(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);
  } else {
    log.warn("You are trying to run an external bash script. No can do");
    return;
  }

  try {
    (0, _shelljs.exec)(cmd, {});
  } catch (err) {
    log.error(`Error creating ${arch} ${diff}`, _lib.Logger.error2string(err));
  }
}

function searchProject(searchFor, html) {
  let cfg = _lib.AppConfig.getInstance();

  let retVal = {
    dirs: []
  };
  const dirs = [cfg.options.javascript.dirs.source, cfg.options.sass.dirs.source, cfg.options.html.dirs.content];

  for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
    if (!dirs.includes(cfg.options.html.dirs.templates[i])) {
      dirs.push(cfg.options.html.dirs.templates[i]);
    }
  }

  if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, "notes"))) dirs.push("notes");
  if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, "docs"))) dirs.push("docs");

  function stripHeaders(data) {
    return data.replace(/<h\d>/, "").replace(/<\/h\d>/, "");
  }

  for (let i = 0; i < dirs.length; i++) {
    let dir = dirs[i];

    let files = _lib.FileUtils.getFileList((0, _path.join)(cfg.dirProject, dir), {
      allowedExtensions: [".txt", ".md", ".scss", ".css", ".ts", ".js", ".njk", ".html"]
    });

    let dirContent = {
      name: dir,
      files: []
    };
    files.forEach(file => {
      let fileContent = {
        name: file,
        results: _lib.FileUtils.searchInFile((0, _path.join)(cfg.dirProject, dir, file), searchFor, {
          inverse: false,
          ignoreCase: true,
          markFound: html ? `<span style="color: red;">$</span>` : "",
          processor: stripHeaders
        })
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