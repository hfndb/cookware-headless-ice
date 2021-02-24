"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const chai_1 = require("chai");
const shelljs_1 = require("shelljs");
const styling_1 = require("./styling");
const lib_1 = require("../lib");
const session_1 = require("../sys/session");
let cfg = lib_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
log;
let session = session_1.SessionVars.getInstance();
cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
describe("Sass transcompiling", function () {
    it("should compile nothing", function () {
        styling_1.SassUtils.compile(false);
        let expected = 0;
        let qty = session.sass.get("all");
        chai_1.expect(qty).to.equal(expected, "counter");
        session.reset();
    });
    it("should compile 1 changed file", function () {
        shelljs_1.touch(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source, "project.scss"));
        styling_1.SassUtils.compile(false);
        let expected = 1;
        let qty = session.sass.get("all");
        chai_1.expect(qty).to.equal(expected, "counter");
        session.reset();
    });
    it("should compile 2 files, after changing a mixin", function () {
        shelljs_1.touch(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source, "_variables.scss"));
        styling_1.SassUtils.compile(false);
        let expected = 2;
        let qty = session.sass.get("all");
        chai_1.expect(qty).to.equal(expected, "counter (see @todo item, weird behavior demonstrating tests to be imperfect)");
        session.reset();
    });
});
//# sourceMappingURL=styling-test.js.map