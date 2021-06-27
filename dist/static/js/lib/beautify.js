"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Beautify = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _sys = require("../lib/sys");

let cfg = _lib.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

class Beautify {
  static standAlone(path) {
    if (path.endsWith("/")) path = path.substr(0, path.length - 1);
    let pathIsDir = (0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, path));
    let files = pathIsDir ? _lib.FileUtils.getFileList((0, _path.join)(cfg.dirProject, path)) : [path];
    if (!pathIsDir) path = "";

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      let content = _lib.FileUtils.readFile((0, _path.join)(cfg.dirProject, path, file));

      let data = Beautify.content(file, content);

      if (data) {
        _lib.FileUtils.writeFile(cfg.dirProject, (0, _path.join)(path, file), data, false);
      }
    }
  }

  static content(file, content) {
    let cfg = _lib.AppConfig.getInstance();

    let ext = (0, _path.extname)(file);
    let options = cfg.options.dependencies.prettier.config;
    let parser = "";

    const prettier = require("prettier");

    switch (ext) {
      case ".css":
        parser = "css";
        break;

      case ".scss":
        parser = "css";
        break;

      case ".html":
        parser = "html";
        break;

      case ".js":
        parser = "babel";
        break;

      case ".ts":
        parser = "typescript";
        break;

      default:
        return "";
    }

    Object.assign(options, {
      filepath: file,
      parser: parser
    });

    try {
      let data = prettier.format(content, options || undefined);
      log.info(`- Beautyfied ${file}`);
      return data;
    } catch (err) {
      log.warn(`- Failed to render file ${file} `, _lib.Logger.error2string(err));

      switch (parser) {
        case "css":
          if (cfg.options.sys.notifications.compileIssue.sass) _sys.SysUtils.notify("Sass issue");
          break;

        case "html":
          if (cfg.options.sys.notifications.compileIssue.html) _sys.SysUtils.notify("Html issue");
          break;

        case "babel":
        case "typescript":
          if (cfg.options.sys.notifications.compileIssue.code) _sys.SysUtils.notify("Code issue");
          break;
      }

      return "";
    }
  }

}

exports.Beautify = Beautify;
//# sourceMappingURL=beautify.js.map