"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sitemap = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const lib_1 = require("../lib");
const object_1 = require("./object");
const html_1 = require("./html");
const utils_1 = require("./utils");
const shelljs_1 = require("shelljs");
class Sitemap {
    constructor(dir, file, baseUrl) {
        this.baseUrl = baseUrl;
        this.dir = dir;
        this.file = file;
        this.entries = 0;
        shelljs_1.rm("-f", path_1.join(dir, file));
        this.write('<?xml version="1.0" ?>');
        this.write('<urlset xmlns="http://www.google.com/schemas/sitemap/0.84">');
    }
    write(entry) {
        lib_1.FileUtils.writeFile(this.dir, this.file, entry + "\n", false, "a");
    }
    addEntry(entry, lastMod) {
        const frmtr = utils_1.Formatter.getInstance();
        let url = `${this.baseUrl}/${entry}`;
        if (url.endsWith("index.html")) {
            url = url.replace("index.html", "");
        }
        this.write("\t<url>");
        this.write(`\t\t<loc>${url}</loc>`);
        this.write(`\t\t<lastmod>${frmtr.date(lastMod, "YYYY-MM-DD")}</lastmod>`);
        this.write("\t</url>");
        this.entries++;
    }
    finish() {
        this.write("</urlset>");
        return this.entries;
    }
    static generate(verbose) {
        let cfg = lib_1.AppConfig.getInstance();
        if (!cfg.isProject || !cfg.options.sitemap.generate) {
            return;
        }
        let log = lib_1.Logger.getInstance(cfg.options.logging);
        let outputDir = html_1.Content.getOutputDir();
        let html = lib_1.FileUtils.getFileList(outputDir, {
            allowedExtensions: [".html"]
        });
        let outputFile = path_1.join(outputDir, "sitemap.xml");
        let sitemap = new Sitemap(outputDir, "sitemap.xml", cfg.options.domain.url);
        let isNew = shelljs_1.test("-f", outputFile);
        html.forEach((entry) => {
            let source = path_1.join(outputDir, entry);
            let modified = fs_1.statSync(source).mtime;
            if (object_1.ArrayUtils.inExcludeList(cfg.options.sitemap.exclude, entry))
                return;
            sitemap.addEntry(entry, modified);
        });
        sitemap.finish();
        if (isNew && verbose) {
            log.info("Google sitemap generated");
        }
        else if (verbose) {
            log.info("Google sitemap updated");
        }
    }
}
exports.Sitemap = Sitemap;
//# sourceMappingURL=sitemap.js.map