"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance(cfg.options.logging);
class JavascriptUtils {
    static getOutputDir() {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        let outputDir = "";
        if (shelljs_1.test("-d", path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output))) {
            outputDir = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output);
        }
        else if (shelljs_1.test("-d", cfg.options.javascript.dirs.output)) {
            outputDir = cfg.options.javascript.dirs.output;
        }
        else {
            log.error("JavaScript output directory couldn't be determined");
        }
        return outputDir;
    }
    static bundle() {
        let outDir = JavascriptUtils.getOutputDir();
        let nodeExec = path_1.join(cfg.dirMain, "node_modules", "node", "bin", "node");
        let execPath = path_1.join(cfg.dirMain, "dist", "static", "js", "local");
        let lst = [];
        if (cfg.options.javascript.bundles.length == 0 &&
            cfg.options.javascript.apps.length == 0) {
            return lst;
        }
        for (let i = 0; i < cfg.options.javascript.bundles.length; i++) {
            let bundle = cfg.options.javascript.bundles[i];
            Bundle.create(bundle);
            lst.push(bundle.output);
        }
        for (let i = 0; i < cfg.options.javascript.apps.length; i++) {
            let bundle = cfg.options.javascript.apps[i];
            let outfile = path_1.join(outDir, bundle.output);
            lst.push(bundle.output);
            shelljs_1.rm("-f", outfile);
            let cmd = `${nodeExec} ${path_1.join(execPath, "create-app.js")} ${cfg.dirProject}` +
                ` ${i}`;
            if (process.env.NODE_ENV == "production") {
                cmd += " 1";
            }
            shelljs_1.exec(cmd);
            for (let i = 0; bundle.cleanup && i < bundle.cleanup.length; i++) {
                let file = path_1.join(outDir, bundle.cleanup[i]);
                if (shelljs_1.test("-e", file))
                    shelljs_1.rm("-rf", file);
                file += ".map";
                if (shelljs_1.test("-e", file))
                    shelljs_1.rm(file);
            }
        }
        return lst;
    }
}
exports.JavascriptUtils = JavascriptUtils;
class Bundle {
    static isChanged(bundle, outDir) {
        if (!shelljs_1.test("-f", path_1.join(outDir, bundle.output)))
            return true;
        let changed = false;
        let path = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source);
        let last = lib_1.FileUtils.getLastModified(outDir, bundle.output);
        bundle.source.forEach((item) => {
            let srcFile = path_1.join(path, item);
            let ths = lib_1.FileUtils.getLastModified(path, item);
            if (ths > last) {
                changed = true;
            }
        });
        return changed;
    }
    static create(bundle) {
        let outDir = JavascriptUtils.getOutputDir();
        if (!Bundle.isChanged(bundle, outDir))
            return;
        let items = [];
        let outfile = path_1.join(outDir, bundle.output);
        shelljs_1.rm("-f", outfile);
        bundle.source.forEach((item) => {
            items.push(path_1.join(outDir, item));
        });
        shelljs_1.cat(items).to(outfile);
        log.info(`- written Javascript bundle ${bundle.output}`);
        return;
    }
}
function generateJsDocs() {
    let options = cfg.options.dependencies.jsdoc.config;
    let dir = options.opts.destination;
    options.opts.destination = path_1.join(cfg.dirProject, dir);
    for (let i = 0; i < options.source.include.length; i++) {
        options.source.include[i] = path_1.join(cfg.dirProject, options.source.include[i]);
    }
    lib_1.FileUtils.writeJsonFile(options, cfg.dirTemp, ".jsdoc.json", false);
    if (shelljs_1.test("-d", options.opts.destination)) {
        shelljs_1.rm("-rf", path_1.join(options.opts.destination, "*"));
    }
    else {
        lib_1.FileUtils.mkdir(options.opts.destination);
    }
    log.info(`Generating API docs of JavaScript files, in ${dir}`);
    shelljs_1.exec(`jsdoc --configure ${path_1.join(cfg.dirTemp, ".jsdoc.json")}`, { async: true });
}
exports.generateJsDocs = generateJsDocs;
//# sourceMappingURL=javascript.js.map