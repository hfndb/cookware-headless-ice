"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
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
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        let nodeExec = path_1.join(cfg.dirMain, "node_modules", "node", "bin", "node");
        let execPath = path_1.join(cfg.dirMain, "dist", "static", "js", "local");
        let outDir = JavascriptUtils.getOutputDir();
        let retVal = [];
        if (cfg.options.javascript.bundles.length == 0 &&
            cfg.options.javascript.apps.length == 0) {
            return retVal;
        }
        for (let i = 0; i < cfg.options.javascript.bundles.length; i++) {
            let bundle = cfg.options.javascript.apps[i];
            let items = [];
            let outfile = path_1.join(outDir, bundle.output);
            retVal.push(bundle.output);
            shelljs_1.rm("-f", outfile);
            bundle.source.forEach((item) => {
                items.push(path_1.join(outDir, item));
            });
            shelljs_1.cat(items).to(outfile);
            log.info(`Written Javascript bundle ${bundle.output}`);
        }
        for (let i = 0; i < cfg.options.javascript.apps.length; i++) {
            let bundle = cfg.options.javascript.apps[i];
            let outfile = path_1.join(outDir, bundle.output);
            retVal.push(bundle.output);
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
        return retVal;
    }
}
exports.JavascriptUtils = JavascriptUtils;
function generateJsDocs() {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
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