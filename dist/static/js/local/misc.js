"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProject = exports.renderSysTemplate = exports.backupChangedSource = exports.getStamp = exports.generateWeb = void 0;
const path_1 = require("path");
const os_1 = require("os");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const file_diff_1 = require("../lib/file-diff");
const html_1 = require("../lib/html");
const sitemap_1 = require("../lib/sitemap");
const utils_1 = require("../lib/utils");
const babel_1 = require("./babel");
const styling_1 = require("./styling");
const session_1 = require("../sys/session");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance(cfg.options.logging);
function generateColorFiles() {
    if (cfg.isProject &&
        cfg.options.sass.colors.projects.length == 1 &&
        cfg.options.sass.colors.projects["Cookware"]) {
        return;
    }
    let lengthPadding = 30;
    let comment = "\n/".padEnd(lengthPadding, "*") +
        "\n" +
        " * ## \n" +
        " ".padEnd(lengthPadding - 1, "*") +
        "/\n";
    let sass = {
        content: comment.replace("##", "Auto-generated file"),
        outFile: cfg.options.sass.colors.sass
    };
    let src = {
        content: comment.replace("##", "Auto-generated file") + "var colors = {};\n",
        outFile: cfg.options.sass.colors.src
    };
    let keys = Object.keys(cfg.options.sass.colors.projects);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key == "Cookware" && cfg.isProject)
            continue;
        let colors = cfg.options.sass.colors.projects[key];
        for (let c = 0; c < colors.length; c++) {
            if (c == 0) {
                sass.content += comment.replace("##", colors[c].comment);
                src.content += comment.replace("##", colors[c].comment);
                src.content += `colors["${key}"] = {};\n`;
                continue;
            }
            let cmt = colors[c].comment ? " // " + colors[c].comment : "";
            sass.content += `$${colors[c].name}: #${colors[c].hex};${cmt}\n`;
            src.content += `colors["${key}"]["${colors[c].name}"] = "#${colors[c].hex}";${cmt}\n`;
        }
    }
    src.content +=
        comment.replace("##", "Defined looks of project UI") +
            "\nvar looks = " +
            JSON.stringify(cfg.options.sass.looks, null, "\t") +
            ";\n";
    let fullPath = path_1.join(cfg.dirProject, cfg.options.sass.dirs.source, sass.outFile);
    let needsWrite = !shelljs_1.test("-f", fullPath) ||
        lib_1.FileUtils.readFile(fullPath).trim() != sass.content.trim();
    if (needsWrite) {
        lib_1.FileUtils.writeFile(cfg.dirProject, path_1.join(cfg.options.sass.dirs.source, sass.outFile), sass.content, true);
    }
    fullPath = path_1.join(cfg.dirProject, src.outFile);
    needsWrite =
        !shelljs_1.test("-f", fullPath) || lib_1.FileUtils.readFile(fullPath) != src.content;
    if (needsWrite) {
        lib_1.FileUtils.writeFile(cfg.dirProject, src.outFile, src.content, true);
    }
}
function generateWeb(verbose) {
    let session = session_1.SessionVars.getInstance();
    babel_1.compile(verbose);
    generateColorFiles();
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
function getStamp() {
    const frmtr = utils_1.Formatter.getInstance();
    return frmtr.date(new Date(), "YYYYMMDD-HHmm");
}
exports.getStamp = getStamp;
function backupChangedSource(isFirst = false) {
    let name = isFirst ? "first" : "changes";
    let prefix = getStamp();
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
function renderSysTemplate(path, context, content) {
    let cfg = lib_1.AppConfig.getInstance();
    if (!content)
        content = new html_1.Content();
    let session = session_1.SessionVars.getInstance();
    let entry = new file_diff_1.FileStatus(path_1.join(cfg.dirMain, "content"));
    entry.setSoure(path, ".html");
    let data = content.render(entry.dir, entry.source, {
        additionalContext: context,
        useProjectTemplates: false
    });
    content.rendered.forEach(file => {
        session.add(session_1.ProcessingTypes.html, file);
    });
    return data;
}
exports.renderSysTemplate = renderSysTemplate;
function searchProject(searchFor, html) {
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