"use strict";

import { join } from "path";
import { expect } from "chai";
import shelljs from "shelljs";
import { Lint } from "./markup.mjs";
import { Content } from "../generic/html.mjs";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { SessionVars } from "../sys/session.mjs";
const { rm, test, touch } = shelljs;

// mocha -R spec --no-colors --throw-deprecation ./dist/static/js/local/markup-test.js

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);
log; // Fool compiler - unused variable
let content = new Content();
let outputDir = Content.getOutputDir();
let session = SessionVars.getInstance();
cfg.options.logging.useConsole = false;

process.env.NODE_ENV = "test";

describe("HTML rendering", function() {
	it("should render nothing", function() {
		session.reset();
		content.renderAll(false);
		let expected = 0;
		let qty = session.html.get("all");
		expect(qty).to.equal(expected, "counter");
	});

	it("should render 4 files, without exclude list", function() {
		session.reset();
		cfg.options.html.caching.exclude = ["test-pages"]; // Start playing with settings.json
		content.renderAll(false);
		let expected = 4;
		let qty = session.html.get("all");
		expect(qty).to.equal(expected, "counter");
	});

	it("should render 4 files, after changing a template", function() {
		touch(join(cfg.dirProject, cfg.options.html.dirs.templates, "base.njk"));
		session.reset();
		content.renderAll(false);
		let expected = 4;
		let qty = session.html.get("all");
		expect(qty).to.equal(expected, "counter");
	});

	it("should remove 4 obsolete output files", function() {
		cfg.read(); // Reset settings.json
		cfg.options.logging.useConsole = false;
		content.renderAll(false);
		let expected = 0;
		let qty = FileUtils.getFileList(outputDir, {
			allowedExtensions: [".html"],
		}).length;
		expect(qty).to.equal(expected, "actual files on disk");
	});

	it("should lint all HTML output files", function() {
		Lint.content(false);
		let file = join(outputDir, "lint.html");
		let exists = test("-f", file);
		expect(exists).to.equal(true, "lint output file exists");
		if (exists) rm(file);
	});
});
