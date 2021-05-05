"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const files_1 = require("./files");
const nunjucks_1 = require("./nunjucks");
const stripping_1 = require("./stripping");
const utils_1 = require("./utils");
function* counter(value) {
    let step;
    while (true) {
        step = yield ++value;
        if (step) {
            value += step;
        }
    }
}
class Content {
    constructor() {
        this.rendered = [];
        this.saydHello = false;
    }
    static getOutputDir() {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        let outputDir = "";
        if (shelljs_1.test("-d", path_1.join(cfg.dirProject, cfg.options.html.dirs.output))) {
            outputDir = path_1.join(cfg.dirProject, cfg.options.html.dirs.output);
        }
        else if (shelljs_1.test("-d", cfg.options.html.dirs.output)) {
            outputDir = cfg.options.html.dirs.output;
        }
        else {
            log.error("HTML output directory couldn't be determined");
        }
        return outputDir;
    }
    writeOutput(entry, data, verbose = true) {
        if (data) {
            let log = lib_1.Logger.getInstance();
            if (!this.saydHello && verbose) {
                this.saydHello = true;
                log.info("Rendering HTML content");
            }
            lib_1.FileUtils.writeFile(entry.targetDir, entry.target, data, true);
        }
    }
    getCustomContext(dir, url) {
        let cfg = lib_1.AppConfig.getInstance();
        let file = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output, "local", "data-provider.js");
        if (!shelljs_1.test("-f", file))
            return {};
        const mw = require(file);
        return mw.getAdditionalContext(dir, url, cfg);
    }
    execHook(type) {
        let cfg = lib_1.AppConfig.getInstance();
        let dir = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output, "local");
        let file = "";
        switch (type) {
            case 1:
                file = "render-before.js";
                break;
            case 2:
                file = "render-after.js";
                break;
            default:
                return;
                break;
        }
        if (!shelljs_1.test("-f", path_1.join(dir, file)))
            return;
        const resolved = require.resolve(path_1.join(dir, file));
        const mw = require(resolved);
        return mw.main(cfg);
    }
    renderAll(verbose = true, additionalContext) {
        let cfg = lib_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        let nj;
        let opts = { additionalContext: additionalContext };
        let outputDir = Content.getOutputDir();
        if (cfg.options.html.caching.engine == "nunjucks") {
            nj = new nunjucks_1.NunjucksUtils();
        }
        else {
            log.error(`Unkown template engine ${cfg.options.html.caching.engine}`);
        }
        let processed = [];
        this.rendered = [];
        let changeList = lib_1.getChangeList({
            sourcePath: path_1.join(cfg.dirProject, cfg.options.html.dirs.content),
            targetPath: outputDir,
            sourceExt: [".html", ".njk"],
            targetExt: ".html",
            excludeList: cfg.options.html.caching.exclude
        });
        this.execHook(1);
        if (changeList.length > 0) {
            let content;
            let maxHtml = 0;
            changeList.forEach((entry) => {
                maxHtml = Math.max(maxHtml, entry.targetLastModified);
                processed.push(entry.source);
                if (!entry.isNewOrModified() &&
                    cfg.options.html.caching.engine == "nunjucks" &&
                    nj.isChanged(entry.dir, entry.source, entry.lastModified)) {
                    entry.status = "modified";
                    shelljs_1.touch(path_1.join(entry.dir, entry.source));
                }
                if (entry.isNewOrModified()) {
                    content = this.render(entry.dir, entry.source, opts);
                    this.writeOutput(entry, content, verbose);
                    this.rendered.push(entry.source);
                }
            });
        }
        this.execHook(2);
        files_1.removeObsolete(cfg.options.html.caching.removeObsolete, processed, outputDir, ".html");
        if (this.saydHello && verbose) {
            log.info("... HTML done");
        }
        else if (verbose) {
            log.info("No changes in HTML files found");
        }
    }
    render(dir, file, opts) {
        let cfg = lib_1.AppConfig.getInstance();
        let retVal = "";
        if (!opts)
            opts = {};
        let templateDir;
        if (opts.templateDir) {
            templateDir = opts.templateDir;
        }
        else if (opts.useProjectTemplates) {
            templateDir = path_1.join(cfg.dirProject, cfg.options.html.dirs.templates[0]);
        }
        else {
            templateDir = path_1.join(cfg.dirMain, "templates");
        }
        let context = Content.getDefaultContext(file);
        if (opts.additionalContext) {
            Object.assign(context, opts.additionalContext);
        }
        Object.assign(context, this.getCustomContext(dir, file));
        switch (cfg.options.html.caching.engine) {
            case "nunjucks":
                retVal = nunjucks_1.NunjucksUtils.renderFile(dir, file, context, templateDir);
        }
        retVal = stripping_1.stripHtml(retVal);
        return retVal;
    }
    static getDefaultContext(url) {
        let cfg = lib_1.AppConfig.getInstance();
        const frmtr = utils_1.Formatter.getInstance();
        let levelNum = utils_1.StringExt.occurrences(url, "/");
        let levelStr = "";
        for (let i = 0; i < levelNum; i++) {
            levelStr = levelStr + "../";
        }
        return {
            counter: counter(-1),
            createdDate: frmtr.date(new Date()),
            createdDateTime: frmtr.datetime(new Date()),
            createdTime: frmtr.time(new Date()),
            description: cfg.options.domain.description,
            environment: process.env.NODE_ENV,
            frmt: frmtr,
            level: levelStr,
            path: url,
            url: cfg.options.domain.url
        };
    }
}
exports.Content = Content;
//# sourceMappingURL=html.js.map