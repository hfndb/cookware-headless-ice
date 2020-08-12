"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controllers_1 = require("./controllers");
const watches_1 = require("./watches");
const config_1 = require("../lib/config");
const lib_1 = require("../lib");
const express_1 = require("../lib/express");
const misc_1 = require("../local/misc");
const babel_1 = require("../local/babel");
const styling_1 = require("../local/styling");
const session_1 = require("../sys/session");
function gracefulShutdown() {
    let cfg = config_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    if (watches_1.ConfigWatch.instance instanceof Object) {
        watches_1.ConfigWatch.instance.stop();
    }
    if (watches_1.CssWatch.instance instanceof Object) {
        watches_1.CssWatch.instance.stop();
    }
    if (watches_1.SassWatch.instance instanceof Object) {
        watches_1.SassWatch.instance.stop();
    }
    if (watches_1.JsWatch.instance instanceof Object) {
        watches_1.JsWatch.instance.stop();
    }
    let session = session_1.SessionVars.getInstance();
    log.info(session.toString());
    babel_1.compile(false);
    styling_1.SassUtils.compile(false);
    express_1.ExpressUtils.shutdown();
}
exports.gracefulShutdown = gracefulShutdown;
function coatRack() {
    let cfg = config_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    if (cfg.options.server.firstUpdateSources) {
        log.info("Checking (and updating) sources");
        babel_1.compile(false);
        styling_1.SassUtils.compile(false);
        log.info("... done");
    }
    log.shutdown = gracefulShutdown;
    watches_1.ConfigWatch.instance = new watches_1.ConfigWatch(cfg.dirProject, "", "config.json", cfg.options.server.watchTimeout, "application config file (config.json)");
    watches_1.CssWatch.instance = new watches_1.CssWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "plain css files");
    watches_1.SassWatch.instance = new watches_1.SassWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "Sass files");
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
        watches_1.JsWatch.instance = new watches_1.JsWatch(cfg.dirProject, cfg.options.javascript.dirs.source, "", cfg.options.server.watchTimeout, `${type} files`);
    }
    if (cfg.options.server.backupInterval > 0) {
        misc_1.backupChangedSource(true);
        setInterval(misc_1.backupChangedSource, cfg.options.server.backupInterval * 60 * 1000);
    }
    let eu = express_1.ExpressUtils.getInstance(false);
    eu.app.get(/^.*\/$/, controllers_1.controllerContent);
    eu.app.all(/^\/.*.html$/, controllers_1.controllerContent);
    eu.app.get(/^\/.*.md$/, controllers_1.controllerContent);
    eu.app.get(/^\/sys\//, controllers_1.controllerSys);
    if (cfg.isProject && cfg.options.server.staticUrl != "static") {
        eu.app.get(new RegExp(`^\/${cfg.options.server.staticUrl}\/`), controllers_1.controllerStatic);
    }
    eu.app.get(/^\/static\//, controllers_1.controllerStatic);
    eu.app.get(/^\/epub/, controllers_1.controllerStatic);
    eu.app.get(/^\/pdf/, controllers_1.controllerStatic);
    eu.init(gracefulShutdown);
}
exports.coatRack = coatRack;
//# sourceMappingURL=index.js.map