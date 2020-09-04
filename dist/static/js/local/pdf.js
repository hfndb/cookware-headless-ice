"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const files_1 = require("../lib/files");
const html_1 = require("../lib/html");
const pgp_1 = require("../lib/pgp");
const session_1 = require("../sys/session");
const babel_1 = require("./babel");
const styling_1 = require("./styling");
function renderPdf() {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    if (cfg.options.pdf.firstUpdateWeb) {
        log.info("Checking (and updating) sources and content");
        babel_1.compile(false);
        styling_1.SassUtils.compile(false);
        let content = new html_1.Content();
        content.renderAll(false);
        log.info("... done");
    }
    let processed = [];
    lib_1.FileUtils.mkdir(path_1.join(cfg.dirProject, cfg.options.pdf.dirs.output));
    let changeList = lib_1.getChangeList({
        sourcePath: html_1.Content.getOutputDir(),
        targetPath: path_1.join(cfg.dirProject, cfg.options.pdf.dirs.output),
        sourceExt: [".html"],
        targetExt: ".pdf",
        excludeList: cfg.options.pdf.rendering.exclude,
        flatten: true
    });
    if (changeList.length == 0)
        return;
    let saydHello = false;
    changeList.forEach((entry) => {
        if (entry.isNewOrModified()) {
            if (!saydHello) {
                saydHello = true;
                log.info("Rendering PDF files");
            }
            renderPdfFile(entry);
        }
        processed.push(path_1.basename(entry.target));
    });
    files_1.removeObsolete(cfg.options.pdf.rendering.removeObsolete, processed, path_1.join(cfg.dirProject, cfg.options.pdf.dirs.output), ".pdf");
    if (saydHello) {
        log.info("... PDF done");
    }
    else {
        log.info("No changes in PDF files found");
    }
}
exports.renderPdf = renderPdf;
function renderPdfFile(fileStatus) {
    if (!fileStatus.isNewOrModified()) {
        return true;
    }
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    let retVal = true;
    let session = session_1.SessionVars.getInstance();
    let cmd = "wkhtmltopdf -q -s A4 -L "
        .concat(cfg.options.pdf.rendering.marginLeft.toString())
        .concat("mm -R ")
        .concat(cfg.options.pdf.rendering.marginRight.toString())
        .concat('mm --print-media-type --header-right "[page] / [toPage]" ')
        .concat(path_1.join(fileStatus.dir, fileStatus.source))
        .concat(" ")
        .concat(path_1.join(fileStatus.targetDir, fileStatus.target));
    try {
        let r = shelljs_1.exec(cmd, {});
        if (r.stderr) {
            log.warn(`- Failed to render file: ${fileStatus.target}`);
            return false;
        }
        log.info(`- File written: ${fileStatus.target}`);
        session.add(session_1.ProcessingTypes.pdf, fileStatus.target);
        if (cfg.options.pdf.rendering.sign) {
            pgp_1.signFile(path_1.join(cfg.dirProject, fileStatus.target));
        }
    }
    catch (err) {
        retVal = false;
    }
    return retVal;
}
//# sourceMappingURL=pdf.js.map