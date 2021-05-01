"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initWatches = initWatches;
exports.terminateWatches = terminateWatches;

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

let cfg = _config.AppConfig.getInstance();

let log = _lib.Logger.getInstance();

class ConfigWatch extends _lib.FileWatcher {
  change(event, file) {
    event;
    file;
    cfg.read();
    log.info(`- settings.json changed and reloaded`);
  }

}

_defineProperty(ConfigWatch, "instance", void 0);

class CssWatch extends _lib.FileWatcher {
  change(event, file) {
    event;

    if ((0, _path.extname)(file) != ".css") {
      return;
    }

    log.info(`- ${file} changed`);
    (0, _shelljs.cp)((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, file), _styling.SassUtils.getOutputDir());
  }

}

_defineProperty(CssWatch, "instance", void 0);

class SassWatch extends _lib.FileWatcher {
  change(event, file) {
    event;

    if ((0, _path.extname)(file) != ".scss") {
      return;
    }

    if (_styling.Double.is(file)) return;
    log.info(`- ${file} changed`);

    let session = _session.SessionVars.getInstance();

    session.add(_session.ProcessingTypes.sass, file);
    let status = new _lib.FileStatus((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source));
    status.setSoure(file, ".scss");
    status.setTarget(_styling.SassUtils.getOutputDir(), ".css");

    if (_styling.SassUtils.isImport(file)) {
      _styling.SassUtils.beautify(status);

      _styling.SassUtils.compile(true, true);
    } else {
      _styling.SassUtils.compileFile(status);
    }
  }

}

_defineProperty(SassWatch, "instance", void 0);

class JsWatch extends _lib.FileWatcher {
  change(event, file) {
    event;

    if ((0, _path.extname)(file) != ".js" && (0, _path.extname)(file) != ".ts") {
      return;
    }

    if (_styling.Double.is(file)) return;
    log.info(`- ${file} changed`);
    let dir = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source);
    let isTypescript = (0, _path.extname)(file) == ".ts";
    let status = new _lib.FileStatus(dir);
    status.setSoure(file, isTypescript ? ".ts" : ".js");
    status.setTarget((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");

    switch (cfg.options.javascript.compiler) {
      case "":
        (0, _shelljs.cp)((0, _path.join)(dir, file), (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, file));

      default:
        let session = _session.SessionVars.getInstance();

        session.add(isTypescript ? _session.ProcessingTypes.typescript : _session.ProcessingTypes.javascript, file);
        (0, _babel.compileFile)(status, true);

        _javascript.JavascriptUtils.bundle();

        if (cfg.options.javascript.generateTags) {
          (0, _shelljs.exec)(`ctags-exuberant --fields=nksSaf --file-scope=yes -R  ${(0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source)}`, {
            async: true
          });
        }

    }
  }

}

_defineProperty(JsWatch, "instance", void 0);

function initWatches() {
  ConfigWatch.instance = new ConfigWatch(cfg.dirProject, "", "settings.json", cfg.options.server.watchTimeout, "project settings file (settings.json)");
  CssWatch.instance = new CssWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "plain css files");
  SassWatch.instance = new SassWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "Sass files");

  if (cfg.options.javascript.useWatch) {
    let tp = "JavaScript";

    switch (cfg.options.javascript.compiler) {
      case "flow":
        tp = "Flow";
        break;

      case "typescript":
        tp = "TypeScript";
        break;
    }

    JsWatch.instance = new JsWatch(cfg.dirProject, cfg.options.javascript.dirs.source, "", cfg.options.server.watchTimeout, `${tp} files`);
  }
}

function terminateWatches() {
  if (ConfigWatch.instance instanceof Object) {
    ConfigWatch.instance.stop();
  }

  if (CssWatch.instance instanceof Object) {
    CssWatch.instance.stop();
  }

  if (SassWatch.instance instanceof Object) {
    SassWatch.instance.stop();
  }

  if (JsWatch.instance instanceof Object) {
    JsWatch.instance.stop();
  }
}
//# sourceMappingURL=watches.js.map