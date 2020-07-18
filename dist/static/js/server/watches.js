"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JsWatch = exports.SassWatch = exports.CssWatch = exports.ConfigWatch = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _config = require("../lib/config");

var _babel = require("../local/babel");

var _javascript = require("../local/javascript");

var _styling = require("../local/styling");

var _session = require("../sys/session");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class ConfigWatch extends _lib.FileWatcher {
  change(event, file) {
    let cfg = _config.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    event;
    file;
    cfg.read();
    log.info(`- config.json changed and reloaded`);
  }

}

exports.ConfigWatch = ConfigWatch;

_defineProperty(ConfigWatch, "instance", void 0);

class CssWatch extends _lib.FileWatcher {
  change(event, file) {
    event;

    if ((0, _path.extname)(file) != ".css") {
      return;
    }

    let cfg = _config.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    log.info(`- ${file} changed`);
    (0, _shelljs.cp)((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, file), _styling.SassUtils.getOutputDir());
  }

}

exports.CssWatch = CssWatch;

_defineProperty(CssWatch, "instance", void 0);

class SassWatch extends _lib.FileWatcher {
  change(event, file) {
    let cfg = _config.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    event;

    if ((0, _path.extname)(file) != ".scss") {
      return;
    }

    log.info(`- ${file} changed`);

    let session = _session.SessionVars.getInstance();

    session.add(_session.ProcessingTypes.sass, file);

    if ((0, _path.basename)(file, ".scss").startsWith("_")) {
      _styling.SassUtils.compile(true);
    } else {
      let status = new _lib.FileStatus((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source));
      status.setSoure(file, ".scss");
      status.setTarget(_styling.SassUtils.getOutputDir(), ".css");

      _styling.SassUtils.compileFile(status);
    }
  }

}

exports.SassWatch = SassWatch;

_defineProperty(SassWatch, "instance", void 0);

class JsWatch extends _lib.FileWatcher {
  change(event, file) {
    event;

    if ((0, _path.extname)(file) != ".js" && (0, _path.extname)(file) != ".ts") {
      return;
    }

    let cfg = _config.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    log.info(`- ${file} changed`);
    let isTypescript = (0, _path.extname)(file) == ".ts";
    let status = new _lib.FileStatus((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source));
    status.setSoure(file, isTypescript ? ".ts" : ".js");
    status.setTarget((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");

    switch (cfg.options.javascript.compiler) {
      case "":
        (0, _shelljs.cp)((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source, file), (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, file));

      default:
        let session = _session.SessionVars.getInstance();

        session.add(isTypescript ? _session.ProcessingTypes.typescript : _session.ProcessingTypes.javascript, file);
        (0, _babel.compileFile)(status, true);

        _javascript.JavascriptUtils.bundle();

        break;
    }
  }

}

exports.JsWatch = JsWatch;

_defineProperty(JsWatch, "instance", void 0);
//# sourceMappingURL=watches.js.map