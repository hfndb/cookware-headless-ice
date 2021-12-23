import { join } from "path";
import { expect } from "chai";
import shelljs from "shelljs";
const { touch } = shelljs;
import { SassUtils } from "./styling.mjs";
import { AppConfig, Logger } from "../lib/index.mjs";
import { SessionVars } from "../sys/session.mjs";

// mocha -R spec --no-colors --throw-deprecation ./dist/static/js/local/styling-test.js

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);
log; // Fool compiler - unused variable
let session = SessionVars.getInstance();
cfg.options.logging.useConsole = false;

process.env.NODE_ENV = "test";

describe("Sass transcompiling", function() {
	it("should compile nothing", function() {
		SassUtils.compile(false);
		let expected = 0;
		let qty = session.sass.get("all");
		expect(qty).to.equal(expected, "counter");
		session.reset();
	});

	it("should compile 1 changed file", function() {
		touch(join(cfg.dirProject, cfg.options.sass.dirs.source, "project.scss"));
		SassUtils.compile(false);
		let expected = 1;
		let qty = session.sass.get("all");
		expect(qty).to.equal(expected, "counter");
		session.reset();
	});

	it("should compile 2 files, after changing a mixin", function() {
		// @todo This test mysteriously fails while 'it' works perfectly in practice.
		// Even weirder: Uncommenting lines 50-54 in local/styling.ts will cause this test to succeed
		// Even weirder: No consistent test results when repeating these tests
		touch(join(cfg.dirProject, cfg.options.sass.dirs.source, "_variables.scss"));
		SassUtils.compile(false); // will compile generic.scss and project.scss
		let expected = 2;
		let qty = session.sass.get("all");
		expect(qty).to.equal(
			expected,
			"counter (see @todo item, weird behavior demonstrating tests to be imperfect)",
		);
		session.reset();
	});
});
