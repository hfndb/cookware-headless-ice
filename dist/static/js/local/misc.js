"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const os_1 = require("os");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const sitemap_1 = require("../lib/sitemap");
const utils_1 = require("../lib/utils");
const babel_1 = require("./babel");
const html_1 = require("../lib/html");
const styling_1 = require("./styling");
const session_1 = require("../sys/session");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance(cfg.options.logging);
function generateWeb(verbose) {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance();
    let session = session_1.SessionVars.getInstance();
    babel_1.compile(verbose);
    styling_1.SassUtils.compile(verbose);
    let dir = path_1.join(cfg.dirProject, cfg.options.html.dirs.content);
    if (shelljs_1.test("-d", dir)) {
        let content = new html_1.Content();
        content.renderAll(verbose);
        content.rendered.forEach(file => {
            session.add(session_1.ProcessingTypes.html, file);
        });
        sitemap_1.Sitemap.generate(verbose);
    }
    else {
        log.warn(`HTML content directory "${cfg.options.html.dirs.content}" not found, skipping...`);
    }
}
exports.generateWeb = generateWeb;
function backupChangedSource(isFirst = false) {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance();
    const frmtr = utils_1.Formatter.getInstance();
    let name = isFirst ? "first" : "changes";
    let prefix = frmtr.date(new Date(), "YYYYMMDD-HHmm");
    let arch = path_1.join("backups", `${prefix}-${name}.tgz`);
    let diff = path_1.join("notes", `${prefix}-git.diff`);
    let cmd = "";
    if (os_1.platform() == "win32") {
        cmd = path_1.join(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);
        if (!shelljs_1.test("-e", "bin/backup-source.bat")) {
            log.error("You are trying to run a non existing batch file bin/backup-source.bat.\n\
				 Please write it and then retry. If it actually works, you might consider contrituting it");
            return;
        }
    }
    else if (["darwin", "freebsd", "linux", "openbsd"].includes(os_1.platform())) {
        cmd = path_1.join(cfg.dirMain, "bin", "backup-source.sh").concat(` ${arch} ${diff}`);
    }
    else {
        log.warn("You are trying to run an external bash script. No can do");
        return;
    }
    try {
        shelljs_1.exec(cmd, {});
    }
    catch (err) {
        log.error(`Error creating ${arch} ${diff}`, lib_1.Logger.error2string(err));
    }
}
exports.backupChangedSource = backupChangedSource;
function searchProject(searchFor, html) {
    let cfg = lib_1.AppConfig.getInstance();
    let retVal = { dirs: [] };
    const dirs = [
        cfg.options.javascript.dirs.source,
        cfg.options.sass.dirs.source,
        cfg.options.html.dirs.content
    ];
    for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
        if (!dirs.includes(cfg.options.html.dirs.templates[i])) {
            dirs.push(cfg.options.html.dirs.templates[i]);
        }
    }
    if (shelljs_1.test("-d", path_1.join(cfg.dirProject, "notes")))
        dirs.push("notes");
    if (shelljs_1.test("-d", path_1.join(cfg.dirProject, "docs")))
        dirs.push("docs");
    function stripHeaders(data) {
        return data.replace(/<h\d>/, "").replace(/<\/h\d>/, "");
    }
    for (let i = 0; i < dirs.length; i++) {
        let dir = dirs[i];
        let files = lib_1.FileUtils.getFileList(path_1.join(cfg.dirProject, dir), {
            allowedExtensions: [
                ".txt",
                ".md",
                ".scss",
                ".css",
                ".ts",
                ".js",
                ".njk",
                ".html"
            ]
        });
        let dirContent = {
            name: dir,
            files: []
        };
        files.forEach((file) => {
            let fileContent = {
                name: file,
                results: lib_1.FileUtils.searchInFile(path_1.join(cfg.dirProject, dir, file), searchFor, {
                    inverse: false,
                    ignoreCase: true,
                    markFound: html ? `<span style="color: red;">$</span>` : "",
                    processor: stripHeaders
                })
            };
            if (fileContent.results.length > 0) {
                dirContent.files.push(fileContent);
            }
        });
        if (dirContent.files.length > 0) {
            retVal.dirs.push(dirContent);
        }
    }
    return retVal;
}
exports.searchProject = searchProject;
//# sourceMappingURL=misc.js.map