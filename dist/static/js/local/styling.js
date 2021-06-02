"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SassUtils = exports.SassFiles = exports.Double = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const beautify_1 = require("../lib/beautify");
const files_1 = require("../lib/files");
const utils_1 = require("../lib/utils");
const session_1 = require("../sys/session");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance(cfg.options.logging);
class Double {
    static is(file) {
        let now = new Date().getTime();
        let last = Double.reg[file] || now - Double.interval - 10;
        if (now - last > Double.interval) {
            Double.reg[file] = now;
            return false;
        }
        return true;
    }
}
exports.Double = Double;
Double.interval = 1 * 1900;
Double.reg = {};
class SassFiles {
    constructor() {
        this.deps = new Map();
        this.changeList = lib_1.getChangeList({
            sourcePath: path_1.join(cfg.dirProject, cfg.options.sass.dirs.source),
            targetPath: SassUtils.getOutputDir(),
            sourceExt: [".scss"],
            targetExt: ".css"
        });
        this.changeList.forEach((entry) => {
            this.read(entry);
        });
    }
    getEntry(file) {
        return this.changeList.find(el => el.source == file);
    }
    getImport(fromDir, file) {
        let [d, f] = this.getDirFile(fromDir, file);
        if (!f.startsWith("_"))
            f = "_" + file;
        if (!f.endsWith(".scss"))
            f += ".scss";
        return path_1.join(d, f);
    }
    getDirFile(fromDir, file) {
        let path = path_1.join(fromDir, file);
        let r = ["", path];
        if (path.includes(path_1.sep)) {
            r[0] = path_1.normalize(path_1.dirname(path));
            r[1] = path_1.basename(path);
        }
        return r;
    }
    importChanged(compareWith, file) {
        return compareWith < this.importsLatestChange(file);
    }
    importsLatestChange(file) {
        let imports = this.deps.get(file) || [];
        let latest = 0;
        for (let i = 0; i < imports.length; i++) {
            let im = imports[i];
            let fl = this.getEntry(im);
            if (fl)
                latest = Math.max(latest, fl.lastModified);
            latest = Math.max(latest, this.importsLatestChange(im));
        }
        return latest;
    }
    static isImport(file) {
        return path_1.basename(file).startsWith("_");
    }
    read(entry) {
        let fullPath = path_1.join(entry.dir, entry.source);
        let result = utils_1.StringExt.matchAll(`@import ["']+(.*)["']+;`, files_1.FileUtils.readFile(fullPath));
        let [d, f] = this.getDirFile("", entry.source);
        for (let i = 0; i < result.length; i++) {
            let lst = this.deps.get(entry.source) || [];
            let fl = this.getImport(d, result[i][0]);
            lst.push(fl);
            this.deps.set(entry.source, lst);
        }
    }
}
exports.SassFiles = SassFiles;
class SassUtils {
    static addPrefixes(content) {
        const autoprefixer = require("autoprefixer");
        const postcss = require("postcss");
        let result = postcss([autoprefixer]).process(content);
        result.warnings().forEach(function (warn) {
            log.warn("Warning autoprefixer: " + warn.toString());
        });
        return result.css;
    }
    static beautify(entry) {
        let toReturn = true;
        if (cfg.options.server.beautify.includes("sass") &&
            entry.source != cfg.options.sass.colors.sass) {
            let fullPath = path_1.join(entry.dir, entry.source);
            let source = files_1.FileUtils.readFile(fullPath);
            source = beautify_1.Beautify.content(entry.source, source);
            if (source) {
                files_1.FileUtils.writeFile(entry.dir, entry.source, source, false);
            }
            else {
                toReturn = false;
            }
        }
        return toReturn;
    }
    static compile(verbose, isWatching = false) {
        let fls = new SassFiles();
        let outDir = SassUtils.getOutputDir();
        let processed = [];
        let saydHello = false;
        let path = path_1.join(cfg.dirProject, cfg.options.sass.dirs.source);
        if (!shelljs_1.test("-e", path)) {
            log.warn(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to transcompile ignored`);
            return;
        }
        function write(entry) {
            if (!saydHello && verbose) {
                saydHello = true;
                log.info("Transcompiling Sass");
            }
            SassUtils.compileFile(entry, true);
            processed.push(entry.target);
        }
        fls.changeList.forEach((entry) => {
            if (SassFiles.isImport(entry.source))
                return;
            if (isWatching && Double.is(entry.source))
                return;
            if (entry.isNewOrModified() ||
                fls.importChanged(entry.lastModified, entry.source)) {
                write(entry);
            }
            processed.push(entry.target);
        });
        files_1.FileUtils.getFileList(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source), {
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
        const sass = require("node-sass");
        let options = cfg.options.dependencies.nodeSass.config;
        let session = session_1.SessionVars.getInstance();
        if (SassFiles.isImport(entry.source) || !SassUtils.beautify(entry)) {
            return false;
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
            files_1.FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);
            session.add(session_1.ProcessingTypes.sass, entry.target);
            Object.assign(options, {
                indentedSyntax: true,
                outputStyle: "compressed",
                sourceMap: undefined
            });
            result = sass.renderSync(options);
            if (!result) {
                throw new Error("");
            }
            prefixed = SassUtils.addPrefixes(result.css);
            let file = files_1.FileUtils.getSuffixedFile(entry.target, cfg.options.stripping.suffix);
            files_1.FileUtils.writeFile(entry.targetDir, file, prefixed, false);
        }
        catch (err) {
            log.warn(`- Failed to trancompile file: ${entry.source}`, lib_1.Logger.error2string(err));
            return false;
        }
        return true;
    }
    static getOutputDir() {
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
}
exports.SassUtils = SassUtils;
//# sourceMappingURL=styling.js.map