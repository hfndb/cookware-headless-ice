"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sitemap = void 0;

require("source-map-support/register");

var _fs = require("fs");

var _path = require("path");

var _lib = require("../lib");

var _object = require("./object");

var _html = require("./html");

var _utils = require("./utils");

var _shelljs = require("shelljs");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Sitemap {
  constructor(dir, file, baseUrl) {
    _defineProperty(this, "baseUrl", void 0);

    _defineProperty(this, "dir", void 0);

    _defineProperty(this, "file", void 0);

    _defineProperty(this, "entries", void 0);

    this.baseUrl = baseUrl;
    this.dir = dir;
    this.file = file;
    this.entries = 0;
    (0, _shelljs.rm)("-f", (0, _path.join)(dir, file));
    this.write('<?xml version="1.0" ?>');
    this.write('<urlset xmlns="http://www.google.com/schemas/sitemap/0.84">');
  }

  write(entry) {
    _lib.FileUtils.writeFile(this.dir, this.file, entry + "\n", false, "a");
  }

  addEntry(entry, lastMod) {
    const frmtr = _utils.Formatter.getInstance();

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
    let cfg = _lib.AppConfig.getInstance();

    if (!cfg.isProject || !cfg.options.sitemap.generate) {
      return;
    }

    let log = _lib.Logger.getInstance(cfg.options.logging);

    let outputDir = _html.Content.getOutputDir();

    let html = _lib.FileUtils.getFileList(outputDir, {
      allowedExtensions: [".html"]
    });

    let outputFile = (0, _path.join)(outputDir, "sitemap.xml");
    let sitemap = new Sitemap(outputDir, "sitemap.xml", cfg.options.domain.url);
    let isNew = (0, _shelljs.test)("-f", outputFile);
    html.forEach(entry => {
      let source = (0, _path.join)(outputDir, entry);
      let modified = (0, _fs.statSync)(source).mtime;
      if (_object.ArrayUtils.inExcludeList(cfg.options.sitemap.exclude, entry)) return;
      sitemap.addEntry(entry, modified);
    });
    sitemap.finish();

    if (isNew && verbose) {
      log.info("Google sitemap generated");
    } else if (verbose) {
      log.info("Google sitemap updated");
    }
  }

}

exports.Sitemap = Sitemap;
//# sourceMappingURL=sitemap.js.map