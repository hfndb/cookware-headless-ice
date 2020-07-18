"use strict";

require("source-map-support/register");

var _path = require("path");

var _chai = require("chai");

var _lib = require("../lib");

var _nunjucks = require("../lib/nunjucks");

let cfg = _lib.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

let dir = (0, _path.join)(cfg.dirMain, "content");
let file = (0, _path.join)("test-pages", "nunjucks", "index.html");
log;
cfg.options.logging.useConsole = false;
cfg.options.html.dirs.templates = [(0, _path.join)(cfg.options.html.dirs.content, "test-pages/nunjucks")].concat(cfg.options.html.dirs.templates);
process.env.NODE_ENV = "test";
describe("Reading Nunjucks file", function () {
  it("recognize parent", function () {
    let nj = new _nunjucks.NunjucksUtils();
    let expected = "page_en.njk";
    let item = nj.getUserData(dir, file);
    let value = item.extends[1];
    (0, _chai.expect)(value).to.equal(expected, "parent");
  });
  it("extract includes", function () {
    let nj = new _nunjucks.NunjucksUtils();
    let expected = 1;
    let item = nj.getUserData(dir, file, {
      inclIncludes: true
    });
    let qty = item.includes.length;
    (0, _chai.expect)(qty).to.equal(expected, "includes");
  });
  it("extract variables", function () {
    let nj = new _nunjucks.NunjucksUtils();
    let expected = 5;
    let item = nj.getUserData(dir, file);
    let qty = item.variables.length;
    (0, _chai.expect)(qty).to.equal(expected, "variables");
  });
  it("extract blocks", function () {
    let nj = new _nunjucks.NunjucksUtils();
    let expected = 2;
    let item = nj.getUserData(dir, file);
    let qty = item.blocks.length;
    (0, _chai.expect)(qty).to.equal(expected, "blocks");
  });
  it("extract other data", function () {
    let nj = new _nunjucks.NunjucksUtils();
    let item = nj.getUserData(dir, file, {
      inclIncludes: true,
      stripFoundTags: true
    });
    let found = item.rawData.length > 0;
    (0, _chai.expect)(found).to.equal(true, "other data");
  });
});
//# sourceMappingURL=nunjucks-test.js.map