"use strict";

var _path = require("path");

var _chai = require("chai");

var _shelljs = require("shelljs");

var _styling = require("./styling");

var _lib = require("../lib");

var _session = require("../sys/session");

let cfg = _lib.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

log;

let session = _session.SessionVars.getInstance();

cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
describe("Sass transcompiling", function () {
  it("should compile nothing", function () {
    _styling.SassUtils.compile(false);

    let expected = 0;
    let qty = session.sass.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter");
    session.reset();
  });
  it("should compile 1 changed file", function () {
    (0, _shelljs.touch)((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, "project.scss"));

    _styling.SassUtils.compile(false);

    let expected = 1;
    let qty = session.sass.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter");
    session.reset();
  });
  it("should compile 2 files, after changing a mixin", function () {
    (0, _shelljs.touch)((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, "_variables.scss"));

    _styling.SassUtils.compile(false);

    let expected = 2;
    let qty = session.sass.get("all");
    (0, _chai.expect)(qty).to.equal(expected, "counter (see @todo item, weird behavior demonstrating tests to be imperfect)");
    session.reset();
  });
});