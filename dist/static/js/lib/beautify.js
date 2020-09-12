"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Beautify = void 0;

var _lib = require("../lib");

var _path = require("path");

var _shelljs = require("shelljs");

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
      return "";
    }
  }

}

exports.Beautify = Beautify;