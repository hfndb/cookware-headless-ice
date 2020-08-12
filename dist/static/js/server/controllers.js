"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("../lib/config");
const express_1 = require("../lib/express");
const file_diff_1 = require("../lib/file-diff");
const html_1 = require("../lib/html");
const package_json_1 = require("../lib/package-json");
const utils_1 = require("../lib/utils");
const markdown_1 = require("../local/markdown");
const markup_1 = require("../local/markup");
const misc_1 = require("../local/misc");
const overview_1 = require("../local/overview");
const session_1 = require("../sys/session");
const date = require("date-and-time");
function controllerSys(req, res, next) {
    let cfg = config_1.AppConfig.getInstance();
    let root = path_1.extname(req.path) == ".md" ? cfg.dirMain : path_1.join(cfg.dirMain, "content");
    controllerGeneric(req, res, next, root, "/sys");
}
exports.controllerSys = controllerSys;
function controllerContent(req, res, next) {
    let cfg = config_1.AppConfig.getInstance();
    let root = path_1.extname(req.path) == ".md"
        ? cfg.dirProject
        : path_1.join(cfg.dirProject, cfg.options.html.dirs.content);
    (async () => {
        controllerGeneric(req, res, next, root, "");
    })();
}
exports.controllerContent = controllerContent;
function controllerStatic(req, res, next) {
    let cfg = config_1.AppConfig.getInstance();
    let file = path_1.basename(req.path);
    let forceMain = false;
    let url = req.path;
    if (url.startsWith("/static/sys")) {
        url = url.replace("/static/sys", "/static");
        forceMain = true;
    }
    let inProject = path_1.join(html_1.Content.getOutputDir(), url);
    let inMain = path_1.join(cfg.dirMain, "dist", url);
    let pdf = path_1.join(cfg.dirProject, cfg.options.pdf.dirs.output, file);
    let ePub = path_1.join(cfg.dirProject, cfg.options.epub.dirs.output, file);
    if (!forceMain && shelljs_1.test("-f", inProject)) {
        res.sendFile(inProject);
    }
    else if (shelljs_1.test("-f", inMain)) {
        res.sendFile(inMain);
    }
    else if (req.path.endsWith(".epub") && shelljs_1.test("-f", ePub)) {
        express_1.ExpressUtils.logRequest(req, res);
        res.sendFile(ePub);
    }
    else if (req.path.endsWith(".pdf") && shelljs_1.test("-f", pdf)) {
        express_1.ExpressUtils.logRequest(req, res);
        res.sendFile(pdf);
    }
    else {
        next();
    }
}
exports.controllerStatic = controllerStatic;
function renderSysTemplate(res, path, context) {
    let cfg = config_1.AppConfig.getInstance();
    let content = new html_1.Content();
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
    res.send(data);
}
async function getCustomContext(req, res, dir, url) {
    let cfg = config_1.AppConfig.getInstance();
    let file = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output, "server", "data-provider.js");
    if (!cfg.isProject)
        return {};
    if (cfg.isProject && !shelljs_1.test("-f", file))
        return {};
    const mw = require(file);
    return await mw.getAdditionalContext(req, res, dir, url, cfg);
}
async function controllerGeneric(req, res, next, dir, prefix) {
    let cfg = config_1.AppConfig.getInstance();
    let content = new html_1.Content();
    let session = session_1.SessionVars.getInstance();
    let additionalContext = [];
    let url = req.path.endsWith("/") ? req.path.concat("index.html") : req.path;
    let ext = path_1.extname(url).toLowerCase();
    if (prefix.length > 0) {
        url = url.substr(prefix.length);
    }
    url = url.substr(1);
    if (prefix == "/sys" && ext == ".html") {
        dir = path_1.join(cfg.dirMain, "content");
    }
    if (!shelljs_1.test("-e", path_1.join(dir, url))) {
        next();
        return;
    }
    if (prefix == "/sys" && url == "index.html") {
        additionalContext = Object.assign(additionalContext, {
            isProject: cfg.isProject,
            systemPackages: package_json_1.getPackageReadmeFiles(true),
            projectPackages: package_json_1.getPackageReadmeFiles(false)
        });
    }
    switch (ext) {
        case ".md":
            let md = markdown_1.renderMarkdownFile(dir, url);
            additionalContext = Object.assign(additionalContext, {
                extractedTitle: md[1],
                rendered: md[0]
            });
            dir = path_1.join(cfg.dirMain, "content");
            url = "markdown.html";
        case ".html":
            let data = "";
            let entry;
            let context = {
                frmt: utils_1.Formatter.getInstance(),
                reqUrl: req.url
            };
            context = Object.assign(context, additionalContext);
            if (ext != ".md" && req.query && req.query.lint) {
                context = Object.assign(context, {
                    files: [
                        {
                            file: url,
                            output: markup_1.Lint.file(path_1.join(cfg.dirProject, cfg.options.html.dirs.content, url), true)
                        }
                    ]
                });
                renderSysTemplate(res, "lint.html", context);
            }
            else if (url == "todo.html") {
                context = Object.assign(context, misc_1.searchProject("todo", true));
                renderSysTemplate(res, "todo.html", context);
            }
            else if (url == "project-overview.html") {
                context = Object.assign(context, { report: overview_1.generateStats() });
                renderSysTemplate(res, "project-overview.html", context);
            }
            else {
                let tmp = await getCustomContext(req, res, dir, url);
                if (tmp == null) {
                    express_1.ExpressUtils.logRequest(req, res);
                    return;
                }
                context = Object.assign(context, tmp);
                let lastModified = date.format(new Date(), "ddd, DD MMM YYYY hh:mm:00 [GMT]");
                res.set({
                    Pragma: "public",
                    "Last-Modified": lastModified,
                    Expires: "Mon, 26 Jul 1997 05:00:00 GMT",
                    "Cache-Control": "no-cache, no-store, must-revalidate, post-check=0, pre-check=0, private"
                });
                entry = new file_diff_1.FileStatus(dir);
                entry.setSoure(url, ".html");
                data = content.render(entry.dir, entry.source, {
                    additionalContext: context,
                    useProjectTemplates: ext != ".md" && prefix != "/sys"
                });
                content.rendered.forEach(file => {
                    session.add(session_1.ProcessingTypes.html, file);
                });
                res.send(data);
                break;
            }
    }
    next();
}
//# sourceMappingURL=controllers.js.map