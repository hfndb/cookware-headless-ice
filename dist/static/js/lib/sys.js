"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SysUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("./config");

var _log = require("./log");

class SysUtils {
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

  static notify(msg) {
    let cfg = _config.AppConfig.getInstance();

    if (!cfg.options.notifications.command) return;
    let cmd = cfg.options.notifications.command + ' "' + msg + '" ' + cfg.options.notifications.timeout.toString() + ' "' + cfg.options.notifications.title + '"';
    (0, _shelljs.exec)(cmd, {
      async: true
    });
  }

}

exports.SysUtils = SysUtils;
//# sourceMappingURL=sys.js.map