"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const chai_1 = require("chai");
const shelljs_1 = require("shelljs");
const markup_1 = require("./markup");
const html_1 = require("../lib/html");
const lib_1 = require("../lib");
const session_1 = require("../sys/session");
let cfg = lib_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
log;
let content = new html_1.Content();
let outputDir = html_1.Content.getOutputDir();
let session = session_1.SessionVars.getInstance();
cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
describe("HTML rendering", function () {
    it("should render nothing", function () {
        session.reset();
        content.renderAll(false);
        let expected = 0;
        let qty = session.html.get("all");
        chai_1.expect(qty).to.equal(expected, "counter");
    });
    it("should render 4 files, without exclude list", function () {
        session.reset();
        cfg.options.html.caching.exclude = ["test-pages"];
        content.renderAll(false);
        let expected = 4;
        let qty = session.html.get("all");
        chai_1.expect(qty).to.equal(expected, "counter");
    });
    it("should render 4 files, after changing a template", function () {
        shelljs_1.touch(path_1.join(cfg.dirProject, cfg.options.html.dirs.templates, "base.njk"));
        session.reset();
        content.renderAll(false);
        let expected = 4;
        let qty = session.html.get("all");
        chai_1.expect(qty).to.equal(expected, "counter");
    });
    it("should remove 4 obsolete output files", function () {
        cfg.read();
        cfg.options.logging.useConsole = false;
        content.renderAll(false);
        let expected = 0;
        let qty = lib_1.FileUtils.getFileList(outputDir, {
            allowedExtensions: [".html"]
        }).length;
        chai_1.expect(qty).to.equal(expected, "actual files on disk");
    });
    it("should lint all HTML output files", function () {
        markup_1.Lint.content(false);
        let file = path_1.join(outputDir, "lint.html");
        let exists = shelljs_1.test("-f", file);
        chai_1.expect(exists).to.equal(true, "lint output file exists");
        if (exists)
            shelljs_1.rm(file);
    });
});
//# sourceMappingURL=markup-test.js.map