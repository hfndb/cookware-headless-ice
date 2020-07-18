"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.gracefulShutdown = gracefulShutdown;
exports.coatRack = coatRack;

require("source-map-support/register");

var _controllers = require("./controllers");

var _watches = require("./watches");

var _config = require("../lib/config");

var _lib = require("../lib");

var _express = require("../lib/express");

var _misc = require("../local/misc");

var _babel = require("../local/babel");

var _styling = require("../local/styling");

var _session = require("../sys/session");

function gracefulShutdown() {
  let cfg = _config.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  if (_watches.ConfigWatch.instance instanceof Object) {
    _watches.ConfigWatch.instance.stop();
  }

  if (_watches.CssWatch.instance instanceof Object) {
    _watches.CssWatch.instance.stop();
  }

  if (_watches.SassWatch.instance instanceof Object) {
    _watches.SassWatch.instance.stop();
  }

  if (_watches.JsWatch.instance instanceof Object) {
    _watches.JsWatch.instance.stop();
  }

  let session = _session.SessionVars.getInstance();

  log.info(session.toString());
  (0, _babel.compile)(false);

  _styling.SassUtils.compile(false);

  _express.ExpressUtils.shutdown();
}

function coatRack() {
  let cfg = _config.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  if (cfg.options.server.firstUpdateSources) {
    log.info("Checking (and updating) sources");
    (0, _babel.compile)(false);

    _styling.SassUtils.compile(false);

    log.info("... done");
  }

  log.shutdown = gracefulShutdown;
  _watches.ConfigWatch.instance = new _watches.ConfigWatch(cfg.dirProject, "", "config.json", cfg.options.server.watchTimeout, "application config file (config.json)");
  _watches.CssWatch.instance = new _watches.CssWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "plain css files");
  _watches.SassWatch.instance = new _watches.SassWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "Sass files");

  if (cfg.options.javascript.useWatch) {
    let type = "JavaScript";

    switch (cfg.options.javascript.compiler) {
      case "flow":
        type = "Flow";
        break;

      case "typescript":
        type = "TypeScript";
        break;
    }

    _watches.JsWatch.instance = new _watches.JsWatch(cfg.dirProject, cfg.options.javascript.dirs.source, "", cfg.options.server.watchTimeout, `${type} files`);
  }

  if (cfg.options.server.backupInterval > 0) {
    (0, _misc.backupChangedSource)(true);
    setInterval(_misc.backupChangedSource, cfg.options.server.backupInterval * 60 * 1000);
  }

  let eu = _express.ExpressUtils.getInstance(false);

  eu.app.get(/^.*\/$/, _controllers.controllerContent);
  eu.app.all(/^\/.*.html$/, _controllers.controllerContent);
  eu.app.get(/^\/.*.md$/, _controllers.controllerContent);
  eu.app.get(/^\/sys\//, _controllers.controllerSys);

  if (cfg.isProject && cfg.options.server.staticUrl != "static") {
    eu.app.get(new RegExp(`^\/${cfg.options.server.staticUrl}\/`), _controllers.controllerStatic);
  }

  eu.app.get(/^\/static\//, _controllers.controllerStatic);
  eu.app.get(/^\/epub/, _controllers.controllerStatic);
  eu.app.get(/^\/pdf/, _controllers.controllerStatic);
  eu.init(gracefulShutdown);
}
//# sourceMappingURL=index.js.map