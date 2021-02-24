"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SassUtils = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const beautify_1 = require("../lib/beautify");
const files_1 = require("../lib/files");
const session_1 = require("../sys/session");
class SassUtils {
    static getOutputDir() {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        let outputDir = "";
        if (shelljs_1.test("-d", path_1.join(cfg.dirProject, cfg.options.sass.dirs.output))) {
            outputDir = path_1.join(cfg.dirProject, cfg.options.sass.dirs.output);
        }
        else if (shelljs_1.test("-d", cfg.options.sass.dirs.output)) {
            outputDir = cfg.options.sass.dirs.output;
        }
        else {
            log.error("JavaScript output directory couldn't be determined");
        }
        return outputDir;
    }
    static addPrefixes(content) {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        const autoprefixer = require("autoprefixer");
        const postcss = require("postcss");
        let result = postcss([autoprefixer]).process(content);
        result.warnings().forEach(function (warn) {
            log.warn("Warning autoprefixer: " + warn.toString());
        });
        return result.css;
    }
    static compile(verbose) {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        let outDir = SassUtils.getOutputDir();
        let processed = [];
        let saydHello = false;
        let path = path_1.join(cfg.dirProject, cfg.options.sass.dirs.source);
        if (!shelljs_1.test("-e", path)) {
            log.warn(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`);
            return;
        }
        let changeList = lib_1.getChangeList({
            sourcePath: path_1.join(cfg.dirProject, cfg.options.sass.dirs.source),
            targetPath: outDir,
            sourceExt: [".scss"],
            targetExt: ".css"
        });
        function write(entry) {
            if (!saydHello && verbose) {
                saydHello = true;
                log.info("Transcompiling Sass");
            }
            SassUtils.compileFile(entry, true);
            processed.push(entry.target);
        }
        let maxMixin = 0;
        let maxSass = 0;
        changeList.forEach((entry) => {
            let isMixin = path_1.basename(entry.source).startsWith("_");
            if (isMixin) {
                maxMixin = Math.max(maxMixin, entry.lastModified);
            }
            else {
                maxSass = Math.max(maxSass, entry.targetLastModified);
            }
            if (!isMixin && entry.isNewOrModified()) {
                write(entry);
            }
        });
        changeList.forEach((entry) => {
            if (path_1.basename(entry.source).startsWith("_") || entry.isNewOrModified()) {
                return;
            }
            if (maxMixin > maxSass) {
                write(entry);
                shelljs_1.touch(path_1.join(entry.dir, entry.source));
            }
            else {
                processed.push(entry.target);
            }
        });
        lib_1.FileUtils.getFileList(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source), {
            allowedExtensions: [".css"]
        }).forEach((file) => {
            let path = path_1.join(outDir, file);
            if (!shelljs_1.test("-f", path)) {
                shelljs_1.cp(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source, file), path);
            }
            processed.push(path);
        });
        files_1.removeObsolete(cfg.options.sass.removeObsolete, processed, outDir, ".css");
        if (saydHello && verbose) {
            log.info("... done");
        }
        else if (verbose) {
            log.info("No changes in Sass files found");
        }
    }
    static compileFile(entry, verbose = true) {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        const sass = require("node-sass");
        let options = cfg.options.dependencies.nodeSass.config;
        let session = session_1.SessionVars.getInstance();
        if (path_1.basename(entry.source).startsWith("_")) {
            return false;
        }
        let fullPath = path_1.join(entry.dir, entry.source);
        let source = lib_1.FileUtils.readFile(fullPath);
        if (cfg.options.server.beautify.includes("sass")) {
            source = beautify_1.Beautify.content(entry.source, source);
            if (source) {
                lib_1.FileUtils.writeFile(entry.dir, entry.source, source, false);
            }
            else {
                return false;
            }
        }
        Object.assign(options, {
            file: path_1.join(entry.dir, entry.source),
            outFile: path_1.join(entry.targetDir, entry.target),
            sourceMap: entry.target.concat(".map")
        });
        try {
            let result = sass.renderSync(options);
            if (!result) {
                throw new Error("");
            }
            let prefixed = SassUtils.addPrefixes(result.css);
            lib_1.FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);
            session.add(session_1.ProcessingTypes.sass, entry.target);
        }
        catch (err) {
            log.warn(`- Failed to compile file: ${entry.source}`, lib_1.Logger.error2string(err));
            return false;
        }
        return true;
    }
}
exports.SassUtils = SassUtils;
//# sourceMappingURL=styling.js.map