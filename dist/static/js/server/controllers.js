"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.controllerSys = controllerSys;
exports.controllerContent = controllerContent;
exports.controllerStatic = controllerStatic;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("../lib/config");

var _express = require("../lib/express");

var _fileDiff = require("../lib/file-diff");

var _html = require("../lib/html");

var _packageJson = require("../lib/package-json");

var _markdown = require("../local/markdown");

var _markup = require("../local/markup");

var _misc = require("../local/misc");

var _overview = require("../local/overview");

var _session = require("../sys/session");

const date = require("date-and-time");

function controllerSys(req, res, next) {
  let cfg = _config.AppConfig.getInstance();

  let root = (0, _path.extname)(req.path) == ".md" ? cfg.dirMain : (0, _path.join)(cfg.dirMain, "content");
  controllerGeneric(req, res, next, root, false, "/sys");
}

function controllerContent(req, res, next) {
  let cfg = _config.AppConfig.getInstance();

  let root = (0, _path.extname)(req.path) == ".md" ? cfg.dirProject : (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.content);

  (async () => {
    controllerGeneric(req, res, next, root, true, "");
  })();
}

function controllerStatic(req, res, next) {
  let cfg = _config.AppConfig.getInstance();

  let file = (0, _path.basename)(req.path);
  let forceMain = false;
  let url = req.path;

  if (url.startsWith("/static/sys")) {
    url = url.replace("/static/sys", "/static");
    forceMain = true;
  }

  let inProject = (0, _path.join)(_html.Content.getOutputDir(), url);
  let inMain = (0, _path.join)(cfg.dirMain, "dist", url);
  let pdf = (0, _path.join)(cfg.dirProject, cfg.options.pdf.dirs.output, file);
  let ePub = (0, _path.join)(cfg.dirProject, cfg.options.epub.dirs.output, file);

  if (!forceMain && (0, _shelljs.test)("-f", inProject)) {
    res.sendFile(inProject);
  } else if ((0, _shelljs.test)("-f", inMain)) {
    res.sendFile(inMain);
  } else if (req.path.endsWith(".epub") && (0, _shelljs.test)("-f", ePub)) {
    _express.ExpressUtils.logRequest(req, res);

    res.sendFile(ePub);
  } else if (req.path.endsWith(".pdf") && (0, _shelljs.test)("-f", pdf)) {
    _express.ExpressUtils.logRequest(req, res);

    res.sendFile(pdf);
  } else {
    next();
  }
}

function sysTemplate(res, path, context, content) {
  let data = (0, _misc.renderSysTemplate)(path, context, content);
  res.send(data);
}

async function getCustomContext(req, res, dir, url) {
  let cfg = _config.AppConfig.getInstance();

  let file = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, "server", "data-provider.js");
  if (!cfg.isProject) return {};
  if (cfg.isProject && !(0, _shelljs.test)("-f", file)) return {};

  const mw = require(file);

  return await mw.getAdditionalContext(req, res, dir, url, cfg);
}

async function controllerGeneric(req, res, next, contentDir, useProjectTemplates, prefix) {
  let cfg = _config.AppConfig.getInstance();

  let content = new _html.Content();

  let session = _session.SessionVars.getInstance();

  let additionalContext = [];
  let url = req.path.endsWith("/") ? req.path.concat("index.html") : req.path;
  let ext = (0, _path.extname)(url).toLowerCase();

  if (prefix.length > 0) {
    url = url.substr(prefix.length);
  }

  url = url.substr(1);

  if (!(0, _shelljs.test)("-e", (0, _path.join)(contentDir, url))) {
    next();
    return;
  }

  if (prefix == "/sys" && url == "index.html") {
    additionalContext = Object.assign(additionalContext, {
      isProject: false,
      systemPackages: (0, _packageJson.getPackageReadmeFiles)(true),
      projectPackages: (0, _packageJson.getPackageReadmeFiles)(false)
    });
  }

  switch (ext) {
    case ".md":
      let md = (0, _markdown.renderMarkdownFile)(contentDir, url);
      contentDir = (0, _path.join)(cfg.dirMain, "content");
      useProjectTemplates = false;
      additionalContext = Object.assign(additionalContext, {
        extractedTitle: md[1],
        rendered: md[0]
      });
      url = "markdown.html";

    case ".html":
      let data = "";
      let entry;

      let context = _html.Content.getDefaultContext(req.url);

      context = Object.assign(context, additionalContext);

      if (ext != ".md" && req.query && req.query.lint) {
        context = Object.assign(context, {
          files: [{
            file: url,
            output: _markup.Lint.file((0, _path.join)(cfg.dirProject, cfg.options.html.dirs.content, url), true)
          }]
        });
        sysTemplate(res, "lint.html", context, content);
      } else if (url == "todo.html") {
        context = Object.assign(context, (0, _misc.searchProject)("todo", true));
        sysTemplate(res, "todo.html", context, content);
      } else if (url == "project-overview.html") {
        context = Object.assign(context, {
          report: (0, _overview.generateStats)()
        });
        sysTemplate(res, "project-overview.html", context, content);
      } else {
        let tmp = await getCustomContext(req, res, contentDir, url);

        if (tmp == null) {
          _express.ExpressUtils.logRequest(req, res);

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
        entry = new _fileDiff.FileStatus(contentDir);
        entry.setSoure(url, ".html");
        data = content.render(entry.dir, entry.source, {
          additionalContext: context,
          useProjectTemplates: useProjectTemplates
        });
        content.rendered.forEach(file => {
          session.add(_session.ProcessingTypes.html, file);
        });
        res.send(data);
        break;
      }

  }

  next();
}
//# sourceMappingURL=controllers.js.map