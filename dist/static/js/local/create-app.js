"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
shelljs_1.cd(process.argv[2]);
if (process.argv[4])
    process.env.NODE_ENV = "production";
let cfg = lib_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
let idx = Number.parseInt(process.argv[3]);
let bundle = cfg.options.javascript.apps[idx];
let outDir = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output);
let src = path_1.join(outDir, bundle.source);
let outfile = path_1.join(outDir, bundle.output);
let browserify = require("browserify");
let dir = path_1.join(cfg.dirProject, "node_modules");
let paths = [path_1.join(cfg.dirMain, "node_modules")];
let sep = os_1.platform() == "win32" ? ";" : ":";
if (cfg.isProject && shelljs_1.test("-d", dir)) {
    paths.push(cfg.dirProject);
    paths.push(dir);
}
if (cfg.options.env.node_path && cfg.options.env.node_path.length > 0) {
    paths = paths.concat(cfg.options.env.node_path);
}
process.env.NODE_PATH = paths.join(sep);
require("module").Module._initPaths();
if (process.env.NODE_ENV == "production") {
    browserify(src)
        .external(cfg.options.dependencies.browserify.external)
        .transform("unassertify", { global: true })
        .transform("envify", { global: true })
        .transform("uglifyify", { global: true })
        .plugin("common-shakeify")
        .plugin("browser-pack-flat/plugin")
        .bundle()
        .pipe(fs_1.createWriteStream(outfile, {
        encoding: "utf8"
    }));
}
else {
    browserify(src)
        .external(cfg.options.dependencies.browserify.external)
        .bundle()
        .pipe(fs_1.createWriteStream(outfile, {
        encoding: "utf8"
    }));
}
log.info(`- written Javascript app ${bundle.output} (${process.env.NODE_ENV == "production" ? "compressed" : "plain"}) `);
//# sourceMappingURL=create-app.js.map