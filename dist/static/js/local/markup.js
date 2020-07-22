"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Html = exports.Lint = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _html = require("../lib/html");

class Lint {
  static content(write2disk = true) {
    let cfg = _lib.AppConfig.getInstance();

    let content = new _html.Content();

    let log = _lib.Logger.getInstance(cfg.options.logging);

    let curDir = (0, _shelljs.pwd)();
    let dir = (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.content);
    let dirs = [];

    let files = _lib.FileUtils.getFileList(dir, {
      allowedExtensions: [".html", ".njk"]
    });

    let output = [];

    if (process.env.NODE_ENV !== "test") {
      log.info("Linting files...");
    }

    files.forEach(file => {
      let relPath = (0, _path.dirname)(file);

      if (relPath && !dirs.includes(relPath)) {
        dirs.push(relPath);
      }

      if (process.env.NODE_ENV !== "test") {
        log.info(`- ${file}`);
      }

      output.push({
        file: file,
        output: Lint.file((0, _path.join)(dir, file))
      });
    });
    let entry = new _lib.FileStatus((0, _path.join)(cfg.dirMain, "content"));
    entry.setSoure("lint.html", ".html");
    let data = content.render(entry.dir, entry.source, {
      additionalContext: {
        files: output
      },
      useProjectTemplates: false
    });

    if (write2disk && data) {
      let file = (0, _path.join)("dist", "lint.html");

      _lib.FileUtils.writeFile(cfg.dirMain, file, data, false);

      data = "";
      log.info(`... done. Output is written to system directory, ${file}`);
    } else {
      log.info(`... done.`);
    }

    dirs.forEach(relPath => {
      (0, _shelljs.cd)((0, _path.join)(dir, relPath));
      (0, _shelljs.rm)(".htmlcsrc");
    });
    (0, _shelljs.cd)(curDir);
    return data;
  }

  static file(path, cleanup = false) {
    let cfg = _lib.AppConfig.getInstance();

    const htmlcs = require("htmlcs");

    if (!(0, _shelljs.test)("-f", (0, _path.join)((0, _path.dirname)(path), ".htmlcsrc"))) {
      _lib.FileUtils.writeJsonFile(cfg.options.dependencies.htmlcs.config, (0, _path.dirname)(path), ".htmlcsrc", false);
    }

    let result = htmlcs.hintFile(path);

    if (cleanup) {
      (0, _shelljs.rm)((0, _path.join)((0, _path.dirname)(path), ".htmlcsrc"));
    }

    return result;
  }

}

exports.Lint = Lint;

class Html {
  static getTagContent(data, tag) {
    let retVal = [];

    try {
      let regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, "gim");
      let result = data.match(regex);

      if (result) {
        result.map(function (val) {
          let strip = new RegExp(`</?${tag}.*?>`, "gi");
          retVal.push(val.replace(strip, ""));
        });
      }
    } catch (err) {}

    return retVal;
  }

}

exports.Html = Html;
//# sourceMappingURL=markup.js.map