import { join } from "path";
import { expect } from "chai";
import { AppConfig, Logger } from "../lib";
import { NunjucksUtils } from "../lib/nunjucks";

// mocha -R spec --no-colors --throw-deprecation ./dist/static/js/lib/nunjucks-test.js

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);
let dir = join(cfg.dirMain, "content");
let file = join("test-pages", "nunjucks", "index.html");
log; // Fool compiler - unused variable

cfg.options.logging.useConsole = false;

cfg.options.html.dirs.templates = [
	join(cfg.options.html.dirs.content, "test-pages/nunjucks")
].concat(cfg.options.html.dirs.templates);

process.env.NODE_ENV = "test";

describe("Reading Nunjucks file", function() {
	it("recognize parent", function() {
		let nj = new NunjucksUtils();
		let expected = "page_en.njk";
		let item = nj.getUserData(dir, file);
		let value = item.extends[1];
		expect(value).to.equal(expected, "parent");
	});

	it("extract includes", function() {
		let nj = new NunjucksUtils();
		let expected = 1;
		let item = nj.getUserData(dir, file, {
			inclIncludes: true
		});
		let qty = item.includes.length;
		expect(qty).to.equal(expected, "includes");
	});

	it("extract variables", function() {
		let nj = new NunjucksUtils();
		let expected = 5;
		let item = nj.getUserData(dir, file);
		let qty = item.variables.length;
		expect(qty).to.equal(expected, "variables");
	});

	it("extract blocks", function() {
		let nj = new NunjucksUtils();
		let expected = 2;
		let item = nj.getUserData(dir, file);
		let qty = item.blocks.length;
		expect(qty).to.equal(expected, "blocks");
	});

	it("extract other data", function() {
		let nj = new NunjucksUtils();
		let item = nj.getUserData(dir, file, {
			inclIncludes: true,
			stripFoundTags: true
		});
		let found = item.rawData.length > 0;
		expect(found).to.equal(true, "other data");
		// console.log(item.rawData.trim());
	});
});
