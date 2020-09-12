"use strict";

var _fs = require("fs");

var _path = require("path");

var _os = require("os");

var _shelljs = require("shelljs");

var _lib = require("../lib");

(0, _shelljs.cd)(process.argv[2]);
if (process.argv[4]) process.env.NODE_ENV = "production";

let cfg = _lib.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

let idx = Number.parseInt(process.argv[3]);
let bundle = cfg.options.javascript.apps[idx];
let outDir = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output);
let src = (0, _path.join)(outDir, bundle.source);
let outfile = (0, _path.join)(outDir, bundle.output);

let browserify = require("browserify");

let dir = (0, _path.join)(cfg.dirProject, "node_modules");
let paths = [(0, _path.join)(cfg.dirMain, "node_modules")];
let sep = (0, _os.platform)() == "win32" ? ";" : ":";

if (cfg.isProject && (0, _shelljs.test)("-d", dir)) {
  paths.push(cfg.dirProject);
  paths.push(dir);
}

if (cfg.options.env.node_path && cfg.options.env.node_path.length > 0) {
  paths = paths.concat(cfg.options.env.node_path);
}

process.env.NODE_PATH = paths.join(sep);

require("module").Module._initPaths();

if (process.env.NODE_ENV == "production") {
  browserify(src).external(cfg.options.dependencies.browserify.external).transform("unassertify", {
    global: true
  }).transform("envify", {
    global: true
  }).transform("uglifyify", {
    global: true
  }).plugin("common-shakeify").plugin("browser-pack-flat/plugin").bundle().pipe((0, _fs.createWriteStream)(outfile, {
    encoding: "utf8"
  }));
} else {
  browserify(src).external(cfg.options.dependencies.browserify.external).bundle().pipe((0, _fs.createWriteStream)(outfile, {
    encoding: "utf8"
  }));
}

log.info(`- written Javascript app ${bundle.output} (${process.env.NODE_ENV == "production" ? "compressed" : "plain"}) `);