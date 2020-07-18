"use strict";

require("source-map-support/register");

var _path = require("path");

var _chai = require("chai");

var _shelljs = require("shelljs");

var _markup = require("./markup");

var _html = require("../lib/html");

var _lib = require("../lib");

var _session = require("../sys/session");

let cfg = _lib.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

log;
let content = new _html.Content();

let outputDir = _html.Content.getOutputDir();

let session = _session.SessionVars.getInstance();

cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
describe("HTML rendering", function () {
  it("should render nothing", function () {
    session.reset();
    content.renderAll(false);
    let expected = 0;
    let qty = session.html.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter");
  });
  it("should render 4 files, without exclude list", function () {
    session.reset();
    cfg.options.html.caching.exclude = ["test-pages"];
    content.renderAll(false);
    let expected = 4;
    let qty = session.html.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter");
  });
  it("should render 4 files, after changing a template", function () {
    (0, _shelljs.touch)((0, _path.join)(cfg.dirProject, cfg.options.html.dirs.templates, "base.njk"));
    session.reset();
    content.renderAll(false);
    let expected = 4;
    let qty = session.html.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter");
  });
  it("should remove 4 obsolete output files", function () {
    cfg.read();
    cfg.options.logging.useConsole = false;
    content.renderAll(false);
    let expected = 0;

    let qty = _lib.FileUtils.getFileList(outputDir, {
      allowedExtensions: [".html"]
    }).length;

    (0, _chai.expect)(qty).to.equal(expected, "actual files on disk");
  });
  it("should lint all HTML output files", function () {
    _markup.Lint.content(false);

    let file = (0, _path.join)(outputDir, "lint.html");
    let exists = (0, _shelljs.test)("-f", file);
    (0, _chai.expect)(exists).to.equal(true, "lint output file exists");
    if (exists) (0, _shelljs.rm)(file);
  });
});
//# sourceMappingURL=markup-test.js.map