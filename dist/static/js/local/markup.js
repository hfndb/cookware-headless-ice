"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Html = exports.Lint = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const html_1 = require("../lib/html");
class Lint {
    static content(write2disk = true) {
        let cfg = lib_1.AppConfig.getInstance();
        let content = new html_1.Content();
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        let curDir = shelljs_1.pwd();
        let dir = path_1.join(cfg.dirProject, cfg.options.html.dirs.content);
        let dirs = [];
        let files = lib_1.FileUtils.getFileList(dir, {
            allowedExtensions: [".html", ".njk"]
        });
        let output = [];
        if (process.env.NODE_ENV !== "test") {
            log.info("Linting files...");
        }
        files.forEach((file) => {
            let relPath = path_1.dirname(file);
            if (relPath && !dirs.includes(relPath)) {
                dirs.push(relPath);
            }
            if (process.env.NODE_ENV !== "test") {
                log.info(`- ${file}`);
            }
            output.push({
                file: file,
                output: Lint.file(path_1.join(dir, file))
            });
        });
        let entry = new lib_1.FileStatus(path_1.join(cfg.dirMain, "content"));
        entry.setSoure("lint.html", ".html");
        let data = content.render(entry.dir, entry.source, {
            additionalContext: { files: output },
            useProjectTemplates: false
        });
        if (write2disk && data) {
            let file = path_1.join("dist", "lint.html");
            lib_1.FileUtils.writeFile(cfg.dirMain, file, data, false);
            data = "";
            log.info(`... done. Output is written to system directory, ${file}`);
        }
        else {
            log.info(`... done.`);
        }
        dirs.forEach((relPath) => {
            shelljs_1.cd(path_1.join(dir, relPath));
            shelljs_1.rm(".htmlcsrc");
        });
        shelljs_1.cd(curDir);
        return data;
    }
    static file(path, cleanup = false) {
        let cfg = lib_1.AppConfig.getInstance();
        const htmlcs = require("htmlcs");
        if (!shelljs_1.test("-f", path_1.join(path_1.dirname(path), ".htmlcsrc"))) {
            lib_1.FileUtils.writeJsonFile(cfg.options.dependencies.htmlcs.config, path_1.dirname(path), ".htmlcsrc", false);
        }
        let result = htmlcs.hintFile(path);
        if (cleanup) {
            shelljs_1.rm(path_1.join(path_1.dirname(path), ".htmlcsrc"));
        }
        return result;
    }
}
exports.Lint = Lint;
class Html {
    static getTagContent(data, tag) {
        let retVal = [];
        try {
            let regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, "gim");
            let result = data.match(regex);
            if (result) {
                result.map(function (val) {
                    let strip = new RegExp(`</?${tag}.*?>`, "gi");
                    retVal.push(val.replace(strip, ""));
                });
            }
        }
        catch (err) { }
        return retVal;
    }
}
exports.Html = Html;
//# sourceMappingURL=markup.js.map