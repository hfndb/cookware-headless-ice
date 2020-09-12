"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Content = exports.Stripper = void 0;

var _path = require("path");

var _files = require("./files");

var _utils = require("./utils");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _nunjucks = require("./nunjucks");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Stripper {
  static process(content) {
    let cfg = _lib.AppConfig.getInstance();

    if (!cfg.options.html.stripper.active) return content;
    let tmp = content.split("\n");
    let len = tmp.length;
    let retVal = "";

    for (let i = 0; i < len; i++) {
      if (cfg.options.html.stripper.empty && _utils.StringUtils.strip(tmp[i], true, true).length == 0) continue;
      retVal += Stripper.parseLine(tmp[i]);
    }

    return retVal;
  }

  static parseLine(line) {
    let cfg = _lib.AppConfig.getInstance();

    if (cfg.options.html.stripper.begin || cfg.options.html.stripper.end) {
      line = _utils.StringUtils.strip(line, cfg.options.html.stripper.begin, cfg.options.html.stripper.end);
    }

    return line;
  }

}

exports.Stripper = Stripper;

class Content {
  constructor() {
    _defineProperty(this, "rendered", []);

    _defineProperty(this, "saydHello", false);
  }

  static getOutputDir() {
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    let outputDir = "";

    if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.output))) {
      outputDir = (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.output);
    } else if ((0, _shelljs.test)("-d", cfg.options.html.dirs.output)) {
      outputDir = cfg.options.html.dirs.output;
    } else {
      log.error("HTML output directory couldn't be determined");
    }

    return outputDir;
  }

  writeOutput(entry, data, verbose = true) {
    if (data) {
      let log = _lib.Logger.getInstance();

      if (!this.saydHello && verbose) {
        this.saydHello = true;
        log.info("Rendering HTML content");
      }

      _lib.FileUtils.writeFile(entry.targetDir, entry.target, data, true);
    }
  }

  getCustomContext(dir, url) {
    let cfg = _lib.AppConfig.getInstance();

    let file = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, "local", "data-provider.js");
    if (!(0, _shelljs.test)("-f", file)) return {};

    const mw = require(file);

    return mw.getAdditionalContext(dir, url, cfg);
  }

  execHook(type) {
    let cfg = _lib.AppConfig.getInstance();

    let dir = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, "local");
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

    if (!(0, _shelljs.test)("-f", (0, _path.join)(dir, file))) return;

    const resolved = require.resolve((0, _path.join)(dir, file));

    const mw = require(resolved);

    return mw.main(cfg);
  }

  renderAll(verbose = true) {
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    let nj;

    if (cfg.options.html.caching.engine == "nunjucks") {
      nj = new _nunjucks.NunjucksUtils();
    } else {
      log.error(`Unkown template engine ${cfg.options.html.caching.engine}`);
    }

    let outputDir = Content.getOutputDir();
    let processed = [];
    this.rendered = [];
    let changeList = (0, _lib.getChangeList)({
      sourcePath: (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.content),
      targetPath: outputDir,
      sourceExt: [".html", ".njk"],
      targetExt: ".html",
      excludeList: cfg.options.html.caching.exclude
    });
    this.execHook(1);

    if (changeList.length > 0) {
      let content;
      let maxHtml = 0;
      changeList.forEach(entry => {
        maxHtml = Math.max(maxHtml, entry.targetLastModified);
        processed.push(entry.source);

        if (!entry.isNewOrModified() && cfg.options.html.caching.engine == "nunjucks" && nj.isChanged(entry.dir, entry.source, entry.lastModified)) {
          entry.status = "modified";
          (0, _shelljs.touch)((0, _path.join)(entry.dir, entry.source));
        }

        if (entry.isNewOrModified()) {
          content = this.render(entry.dir, entry.source);
          this.writeOutput(entry, content, verbose);
          this.rendered.push(entry.source);
        }
      });
    }

    this.execHook(2);
    (0, _files.removeObsolete)(cfg.options.html.caching.removeObsolete, processed, outputDir, ".html");

    if (this.saydHello && verbose) {
      log.info("... HTML done");
    } else if (verbose) {
      log.info("No changes in HTML files found");
    }
  }

  render(dir, file, opts) {
    let cfg = _lib.AppConfig.getInstance();

    const frmtr = _utils.Formatter.getInstance();

    let retVal = "";
    if (!opts) opts = {};
    let templateDir;

    if (opts.templateDir) {
      templateDir = opts.templateDir;
    } else if (opts.useProjectTemplates) {
      templateDir = (0, _path.join)(cfg.dirProject, cfg.options.html.dirs.templates[0]);
    } else {
      templateDir = (0, _path.join)(cfg.dirMain, "templates");
    }

    let levelNum = _utils.StringUtils.occurrences(file, "/");

    let levelStr = "";

    for (let i = 1; i < levelNum; i++) {
      levelStr = levelStr + "../";
    }

    let context = {
      description: cfg.options.domain.description,
      createdDate: frmtr.date(new Date()),
      createdDateTime: frmtr.datetime(new Date()),
      createdTime: frmtr.time(new Date()),
      environment: process.env.NODE_ENV,
      frmt: frmtr,
      level: levelStr,
      path: file,
      url: cfg.options.domain.url
    };

    if (opts.additionalContext) {
      Object.assign(context, opts.additionalContext);
    }

    Object.assign(context, this.getCustomContext(dir, file));

    switch (cfg.options.html.caching.engine) {
      case "nunjucks":
        retVal = _nunjucks.NunjucksUtils.renderFile(dir, file, context, templateDir);
    }

    retVal = Stripper.process(retVal);
    return retVal;
  }

}

exports.Content = Content;