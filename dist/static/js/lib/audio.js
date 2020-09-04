"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AudioUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("./config");

var _log = require("./log");

class AudioUtils {
  static async playFile(file) {
    let cfg = _config.AppConfig.getInstance();

    let fullPath = (0, _path.join)(cfg.dirMain, file);

    if (!(0, _shelljs.test)("-f", fullPath)) {
      throw new Error(`File ${file} doesn't exist. Current working directory: ${process.cwd()}`);
    }

    try {
      (0, _shelljs.exec)(`${cfg.options.audio.player} ${fullPath}`, {
        async: true,
        silent: true
      });
    } catch (error) {
      let log = _log.Logger.getInstance();

      log.warn(error);
    }
  }

}

exports.AudioUtils = AudioUtils;
//# sourceMappingURL=audio.js.map