"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const files_1 = require("../lib/files");
const session_1 = require("../sys/session");
const javascript_1 = require("./javascript");
function compileTypeScript() {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    let session = session_1.SessionVars.getInstance();
    let changeList = lib_1.getChangeList({
        sourcePath: path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source),
        targetPath: path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output),
        sourceExt: [".ts"],
        targetExt: ".js"
    });
    let processed = [];
    lib_1.FileUtils.getFileList(path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source), {
        allowedExtensions: [".js"]
    }).forEach((file) => {
        let path = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output, file);
        if (!shelljs_1.test("-f", path)) {
            shelljs_1.cp(path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source, file), path);
        }
        processed.push(path_1.join(cfg.options.javascript.dirs.output, file));
    });
    if (!lib_1.FileStatus.containsChange(changeList)) {
        log.info("No changes in TypeScript files found");
        return;
    }
    changeList.forEach((entry) => {
        processed.push(entry.target);
        session.add(session_1.ProcessingTypes.typescript, entry.source);
    });
    log.info("Transcompiling Typescript");
    try {
        shelljs_1.exec(`cd ${cfg.dirProject}; tsc -b`, { async: true });
        javascript_1.JavascriptUtils.bundle().forEach((file) => {
            processed.push(file);
        });
        files_1.removeObsolete(cfg.options.javascript.removeObsolete, processed, path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");
    }
    catch (err) {
        log.error(`- Transcompile failed: `, lib_1.Logger.error2string(err));
    }
    log.info("... Typescript transcompiled");
}
exports.compileTypeScript = compileTypeScript;
function watchTypeScript() {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    let blockOutput = true;
    let timeOut = setTimeout(() => {
        blockOutput = false;
        clearTimeout(timeOut);
    }, 1 * 60 * 1000);
    shelljs_1.exec(`cd ${cfg.dirProject}; tsc -b -w`, function (code, stdout, stderr) {
        if (blockOutput)
            return;
        if (code != 0) {
            log.error("Exit code:", code);
        }
        if (stdout) {
            log.info("Program output:", stdout);
        }
        if (stderr) {
            log.error("Program stderr:", stderr);
        }
    });
}
exports.watchTypeScript = watchTypeScript;
function generateTsDocs() {
    let cfg = lib_1.AppConfig.getInstance();
    let dir = path_1.join(cfg.dirProject, cfg.options.dependencies.typedoc.output);
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    if (!dir) {
        log.error("Output dir for typedoc not found in config.json");
        return;
    }
    if (shelljs_1.test("-d", dir)) {
        shelljs_1.rm("-rf", path_1.join(dir, "*"));
    }
    else {
        lib_1.FileUtils.mkdir(dir);
    }
    let options = cfg.options.dependencies.typedoc.config;
    Object.assign(options, {
        tsconfig: "tsconfig.json"
    });
    try {
        const typedoc = require("typedoc");
        const app = new typedoc.Application(options);
        const src = app.expandInputFiles([path_1.join(cfg.dirProject, "src")]);
        log.info(`Generating API docs of TypeScript files, in ${dir}`);
        app.generateDocs(src, dir);
        if (app.logger.hasErrors()) {
            log.error("There were errors generating TypeDoc output, see above.");
        }
    }
    catch (err) {
        log.error("Failed to generate load TypeDoc project.", lib_1.Logger.error2string(err));
    }
}
exports.generateTsDocs = generateTsDocs;
//# sourceMappingURL=typescript.js.map