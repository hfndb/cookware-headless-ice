"use strict";

import { statSync } from "fs";
import { join } from "path";
import shelljs from "shelljs";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { ArrayUtils } from "./object.mjs";
import { Content } from "./html.mjs";
import { Formatter } from "./utils.mjs";
const { rm, test } = shelljs;

export class Sitemap {
	/**
	 * @param dir of output file
	 * @param file name of output file
	 * @param baseUrl of website
	 */
	constructor(dir, file, baseUrl) {
		this.baseUrl = baseUrl;
		this.dir = dir;
		this.file = file;
		this.entries = 0;
		rm("-f", join(dir, file));
		this.write('<?xml version="1.0" ?>');
		this.write('<urlset xmlns="http://www.google.com/schemas/sitemap/0.84">');
	}

	write(entry) {
		FileUtils.writeFile(this.dir, this.file, entry + "\n", false, "a");
	}

	/**
	 * @param entry relative from website root
	 * @param lastMod last modification date
	 */
	addEntry(entry, lastMod) {
		const frmtr = Formatter.getInstance();
		let url = `${this.baseUrl}/${entry}`;
		if (url.endsWith("index.html")) {
			url = url.replace("index.html", "");
		}
		this.write("\t<url>");
		this.write(`\t\t<loc>${url}</loc>`);
		this.write(`\t\t<lastmod>${frmtr.date(lastMod, "YYYY-MM-DD")}</lastmod>`);
		this.write("\t</url>");
		this.entries++;
	}

	/**
	 * Close the file
	 *
	 * @returns number of entries in sitemap
	 */
	finish() {
		this.write("</urlset>");
		return this.entries;
	}

	/**
	 * Generate Google sitemap
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
