"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateWeb = generateWeb;
exports.backupChangedSource = backupChangedSource;
exports.searchProject = searchProject;

require("source-map-support/register");

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

function generateColorFiles() {
  if (cfg.isProject && cfg.options.sass.colors.projects.length == 1 && cfg.options.sass.colors.projects["Cookware"]) {
    return;
  }

  let lengthPadding = 30;
  let comment = "\n/".padEnd(lengthPadding, "*") + "\n" + " * ## \n" + " ".padEnd(lengthPadding - 1, "*") + "/\n";
  let sass = {
    content: comment.replace("##", "Auto-generated file"),
    outFile: cfg.options.sass.colors.sass
  };
  let src = {
    content: comment.replace("##", "Auto-generated file") + "var colors = {};\n",
    outFile: cfg.options.sass.colors.src
  };
  let keys = Object.keys(cfg.options.sass.colors.projects);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (key == "Cookware" && cfg.isProject) continue;
    let colors = cfg.options.sass.colors.projects[key];

    for (let c = 0; c < colors.length; c++) {
      if (c == 0) {
        sass.content += comment.replace("##", colors[c].comment);
        src.content += comment.replace("##", colors[c].comment);
        src.content += `colors["${key}"] = {};\n`;
        continue;
      }

      let cmt = colors[c].comment ? " // " + colors[c].comment : "";
      sass.content += `$${colors[c].name}: #${colors[c].hex};${cmt}\n`;
      src.content += `colors["${key}"]["${colors[c].name}"] = "#${colors[c].hex}";${cmt}\n`;
    }
  }

  src.content += comment.replace("##", "Defined looks of project UI") + "\nvar looks = " + JSON.stringify(cfg.options.sass.looks, null, "\t") + ";\n";
  let fullPath = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, sass.outFile);
  let needsWrite = !(0, _shelljs.test)("-f", fullPath) || _lib.FileUtils.readFile(fullPath).trim() != sass.content.trim();

  if (needsWrite) {
    _lib.FileUtils.writeFile(cfg.dirProject, (0, _path.join)(cfg.options.sass.dirs.source, sass.outFile), sass.content, true);
  }

  fullPath = (0, _path.join)(cfg.dirProject, src.outFile);
  needsWrite = !(0, _shelljs.test)("-f", fullPath) || _lib.FileUtils.readFile(fullPath) != src.content;

  if (needsWrite) {
    _lib.FileUtils.writeFile(cfg.dirProject, src.outFile, src.content, true);
  }
}

function generateWeb(verbose) {
  let session = _session.SessionVars.getInstance();

  (0, _babel.compile)(verbose);
  generateColorFiles();

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
//# sourceMappingURL=misc.js.map