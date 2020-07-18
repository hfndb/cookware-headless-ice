import { statSync } from "fs";
import { join } from "path";
import { AppConfig, FileUtils, Logger } from "../lib";
import { ArrayUtils } from "./object";
import { Content } from "./html";
import { Formatter } from "./utils";
import { rm, test } from "shelljs";

export class Sitemap {
	private baseUrl: string;
	private dir: string;
	private file: string;
	private entries: number;

	/**
	 * @param dir of output file
	 * @param file name of output file
	 * @param baseUrl of website
	 */
	constructor(dir: string, file: string, baseUrl: string) {
		this.baseUrl = baseUrl;
		this.dir = dir;
		this.file = file;
		this.entries = 0;

		rm("-f", join(dir, file));
		this.write('<?xml version="1.0" ?>');
		this.write('<urlset xmlns="http://www.google.com/schemas/sitemap/0.84">');
	}

	private write(entry: string): void {
		FileUtils.writeFile(this.dir, this.file, entry + "\n", false, "a");
	}

	/**
	 * @param entry relative from website root
	 * @param lastMod last modification date
	 */
	public addEntry(entry: string, lastMod: Date): void {
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
	public finish(): number {
		this.write("</urlset>");
		return this.entries;
	}

	static generate(verbose: boolean) {
		let cfg = AppConfig.getInstance();
		if (!cfg.isProject || !cfg.options.html.sitemap.generate) {
			return;
		}
		let log = Logger.getInstance(cfg.options.logging);
		let outputDir = Content.getOutputDir();

		// Generate Google sitemap
		let html = FileUtils.getFileList(outputDir, {
			allowedExtensions: [
				".html"
			]
		});
		let outputFile = join(outputDir, "sitemap.xml");
		let sitemap = new Sitemap(cfg.dirProject, outputFile, cfg.options.domain.url);
		let isNew = test("-f", outputFile);

		html.forEach((entry: string) => {
			let source = join(outputDir, entry);
			let modified = statSync(source).mtime;
			if (ArrayUtils.inExcludeList(cfg.options.html.sitemap.exclude, entry)) return;
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
