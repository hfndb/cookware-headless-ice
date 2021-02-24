"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coatRack = exports.gracefulShutdown = void 0;
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
    let session = session_1.SessionVars.getInstance();
    watches_1.terminateWatches();
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
    watches_1.initWatches();
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