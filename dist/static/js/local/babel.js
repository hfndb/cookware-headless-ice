"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileFile = exports.compile = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const core_1 = require("@babel/core");
const lib_1 = require("../lib");
const beautify_1 = require("../lib/beautify");
const files_1 = require("../lib/files");
const stripping_1 = require("../lib/stripping");
const session_1 = require("../sys/session");
const javascript_1 = require("./javascript");
const tags_1 = require("./tags");
function compile(verbose) {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    let outDir = javascript_1.JavascriptUtils.getOutputDir();
    let processed = [];
    let saydHello = false;
    let session = session_1.SessionVars.getInstance();
    let sourceExt = cfg.options.javascript.compiler == session_1.ProcessingTypes.typescript ? ".ts" : ".js";
    let path = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source);
    if (!shelljs_1.test("-e", path)) {
        log.warn(`Path ./${cfg.options.javascript.dirs.source} doesn't exist. Request to compile ignored`);
        return;
    }
    function write(entry) {
        if (!saydHello && verbose) {
            saydHello = true;
            log.info(`Transcompiling ${cfg.options.javascript.compiler}`);
        }
        compileFile(entry, true);
    }
    let changeList = lib_1.getChangeList({
        sourcePath: path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source),
        targetPath: outDir,
        sourceExt: [sourceExt],
        targetExt: ".js",
        excludeList: cfg.options.javascript.removeObsolete.exclude
    });
    changeList.forEach((entry) => {
        processed.push(entry.target);
        if (entry.isNewOrModified()) {
            session.add(cfg.options.javascript.compiler == "flow"
                ? "javascript"
                : cfg.options.javascript.compiler, entry.source);
            write(entry);
        }
    });
    javascript_1.JavascriptUtils.bundle().forEach((file) => {
        processed.push(file);
    });
    files_1.removeObsolete(cfg.options.javascript.removeObsolete, processed, outDir, ".js");
    if (saydHello && verbose) {
        tags_1.Tags.forProject(cfg.options.javascript.dirs.source);
        changeList.forEach((entry) => {
            if (entry.isNewOrModified()) {
                tags_1.Tags.forFile(path_1.join(cfg.options.javascript.dirs.source, entry.source));
            }
        });
        log.info(`... done`);
    }
    else if (verbose) {
        log.info(`No changed ${cfg.options.javascript.compiler} files found`);
    }
}
exports.compile = compile;
function compileFile(entry, verbose = true) {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    let forBrowser = path_1.dirname(entry.source).includes("browser");
    let fullPath = path_1.join(entry.dir, entry.source);
    let plugins = [
        "@babel/plugin-proposal-class-properties",
        "@babel/proposal-object-rest-spread"
    ];
    let presets = [];
    let source = files_1.FileUtils.readFile(fullPath);
    if (cfg.options.server.beautify.includes("src")) {
        source = beautify_1.Beautify.content(entry.source, source);
        if (!source) {
            return false;
        }
        files_1.FileUtils.writeFile(entry.dir, entry.source, source, false);
        if (forBrowser && cfg.options.javascript.browser.removeImports) {
            source = javascript_1.JavascriptUtils.stripImports(source);
        }
    }
    if (source.includes("antd")) {
        presets.push(["@babel/preset-react"]);
    }
    else if (source.includes('"react')) {
        presets.push(["@babel/preset-react"]);
    }
    if (process.env.NODE_ENV != "production" &&
        !forBrowser &&
        cfg.options.javascript.sourceMapping) {
        plugins.push("source-map-support");
    }
    if (cfg.options.javascript.compiler == "typescript") {
        presets.push("@babel/preset-typescript");
    }
    if (cfg.options.javascript.compiler == "flow") {
        presets.push("@babel/preset-flow");
    }
    if (forBrowser) {
        presets.push([
            "@babel/preset-env",
            {
                targets: cfg.options.javascript.browser.targets
            }
        ]);
    }
    else {
        presets.push([
            "@babel/preset-env",
            {
                targets: {
                    node: cfg.options.javascript.nodeVersion
                }
            }
        ]);
    }
    try {
        let results = core_1.transformSync(source, {
            ast: true,
            comments: false,
            filename: fullPath,
            plugins: plugins,
            presets: presets,
            sourceMaps: true
        });
        if (!results) {
            throw new Error("");
        }
        if (process.env.NODE_ENV == "production") {
            let fl = path_1.join(entry.targetDir, entry.target + ".ast");
            if (shelljs_1.test("-f", fl))
                shelljs_1.rm(fl);
            fl = path_1.join(entry.targetDir, entry.target + ".map");
            if (shelljs_1.test("-f", fl))
                shelljs_1.rm(fl);
        }
        else if (cfg.options.javascript.sourceMapping && !forBrowser) {
            results.code += `\n//# sourceMappingURL=${path_1.basename(entry.target)}.map`;
            files_1.FileUtils.writeFile(entry.targetDir, entry.target + ".map", JSON.stringify(results.map), false);
            if (cfg.options.javascript.ast)
                files_1.FileUtils.writeFile(entry.targetDir, entry.target + ".ast", JSON.stringify(results.ast), false);
        }
        files_1.FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
        if (forBrowser && cfg.options.stripping.auto) {
            let toWrite = stripping_1.stripJs(results.code);
            let file = files_1.FileUtils.getSuffixedFile(entry.target, cfg.options.stripping.suffix);
            files_1.FileUtils.writeFile(entry.targetDir, file, toWrite, false);
        }
    }
    catch (err) {
        log.warn(`- Failed to compile file: ${entry.source}`, lib_1.Logger.error2string(err));
        return false;
    }
    return true;
}
exports.compileFile = compileFile;
//# sourceMappingURL=babel.js.map