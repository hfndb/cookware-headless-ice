"use strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "./index.mjs";
import { ArrayUtils } from "./object.mjs";
import { Content } from "./html.mjs";
import { Formatter } from "./utils.mjs";
import { rm, test } from "./sys.mjs";

export class Sitemap {
	/**
	 * @param {string} dir of output file
	 * @param {string} file name of output file
	 * @param {string} baseUrl of website
	 */
	constructor(dir, file, baseUrl) {
		this.baseUrl = baseUrl;
		this.content = "";
		this.dir = dir;
		this.file = file;
		this.entries = 0;
		rm("-f", join(dir, file));
		this.add2content('<?xml version="1.0" ?>');
		this.add2content(
			'<urlset xmlns="http://www.google.com/schemas/sitemap/0.84">',
		);
	}

	/**
	 * @param {string} entry
	 */
	add2content(entry) {
		this.content += entry + "\n";
	}

	/**
	 * @param {string} entry relative from website root
	 * @param {Date} lastMod last modification date
	 */
	addEntry(entry, lastMod) {
		const frmtr = Formatter.getInstance();
		let url = `${this.baseUrl}/${entry}`;
		if (url.endsWith("index.html")) {
			url = url.replace("index.html", "");
		}
		this.add2content("\t<url>");
		this.add2content(`\t\t<loc>${url}</loc>`);
		this.add2content(
			`\t\t<lastmod>${frmtr.date(lastMod, "YYYY-MM-DD")}</lastmod>`,
		);
		this.add2content("\t</url>");
		this.entries++;
	}

	/**
	 * Close the file
	 *
	 * @returns {number} of entries in sitemap
	 */
	finish() {
		this.add2content("</urlset>");
		FileUtils.writeFile(this.dir, this.file, this.content, false);
		return this.entries;
	}

	/**
	 * Generate Google sitemap
	 *
	 * @param {boolean} verbose
	 */
	static generate(verbose) {
		let cfg = AppConfig.getInstance();
		if (!cfg.isProject || !cfg.options.sitemap.generate) {
			return;
		}
		let log = Logger.getInstance(cfg.options.logging);
		let outputDir = Content.getOutputDir();
		let html = FileUtils.getFileList(outputDir, {
			allowedExtensions: [".html"],
		});
		let outputFile = join(outputDir, "sitemap.xml");
		let sitemap = new Sitemap(outputDir, "sitemap.xml", cfg.options.domain.url);
		let isNew = test("-f", outputFile);
		html.forEach(entry => {
			let source = join(outputDir, entry);
			let modified = statSync(source).mtime;
			if (ArrayUtils.inExcludeList(cfg.options.sitemap.exclude, entry)) return;
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
