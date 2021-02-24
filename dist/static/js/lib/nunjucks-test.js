"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const chai_1 = require("chai");
const lib_1 = require("../lib");
const nunjucks_1 = require("../lib/nunjucks");
let cfg = lib_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
let dir = path_1.join(cfg.dirMain, "content");
let file = path_1.join("test-pages", "nunjucks", "index.html");
log;
cfg.options.logging.useConsole = false;
cfg.options.html.dirs.templates = [
    path_1.join(cfg.options.html.dirs.content, "test-pages/nunjucks")
].concat(cfg.options.html.dirs.templates);
process.env.NODE_ENV = "test";
describe("Reading Nunjucks file", function () {
    it("recognize parent", function () {
        let nj = new nunjucks_1.NunjucksUtils();
        let expected = "page_en.njk";
        let item = nj.getUserData(dir, file);
        let value = item.extends[1];
        chai_1.expect(value).to.equal(expected, "parent");
    });
    it("extract includes", function () {
        let nj = new nunjucks_1.NunjucksUtils();
        let expected = 1;
        let item = nj.getUserData(dir, file, {
            inclIncludes: true
        });
        let qty = item.includes.length;
        chai_1.expect(qty).to.equal(expected, "includes");
    });
    it("extract variables", function () {
        let nj = new nunjucks_1.NunjucksUtils();
        let expected = 5;
        let item = nj.getUserData(dir, file);
        let qty = item.variables.length;
        chai_1.expect(qty).to.equal(expected, "variables");
    });
    it("extract blocks", function () {
        let nj = new nunjucks_1.NunjucksUtils();
        let expected = 2;
        let item = nj.getUserData(dir, file);
        let qty = item.blocks.length;
        chai_1.expect(qty).to.equal(expected, "blocks");
    });
    it("extract other data", function () {
        let nj = new nunjucks_1.NunjucksUtils();
        let item = nj.getUserData(dir, file, {
            inclIncludes: true,
            stripFoundTags: true
        });
        let found = item.rawData.length > 0;
        chai_1.expect(found).to.equal(true, "other data");
    });
});
//# sourceMappingURL=nunjucks-test.js.map