"use strict";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { AppConfig } from "./config.mjs";
import { Logger } from "./log.mjs";
import { signFile } from "./pgp.mjs";

export class PdfGenerator {
	constructor() {
		this.iniialized = false;
	}

	async init() {
		if (this.iniialized) return;
		this.iniialized = true;

		let cfg = AppConfig.getInstance();
		if (cfg.options.pdf.engine == "puppeteer") {
			// Create a browser instance and load
			console.log("nitializing PDF rendering...");
			this.browser = await puppeteer.launch({ headless: true });
		}
	}

	async cleanup() {
		await this.browser.close();
	}

	/**
	 * @param {string} dirHtml
	 * @param {string} fileHtml
	 * @param {string} dirPdf
	 * @param {string} filePdf
	 * @param {boolean} verbose
	 * @returns {boolean} for succes
	 */
	async write(dirHtml, fileHtml, dirPdf, filePdf, verbose = true) {
		let cfg = AppConfig.getInstance();

		if (cfg.options.pdf.engine == "wkhtmltopdf") {
			// Download binary: https://wkhtmltopdf.org/downloads.html
			let cmd = "wkhtmltopdf -q -s A4 -L "
				.concat(cfg.options.pdf.rendering.marginLeft.toString())
				.concat("mm -R ")
				.concat(cfg.options.pdf.rendering.marginRight.toString())
				.concat(
					'mm --print-media-type --enable-local-file-access  --header-right "[page] / [toPage]" ',
				)
				.concat(join(dirHtml, fileHtml))
				.concat(" ")
				.concat(join(dirPdf, filePdf));
			try {
				let r = exec(cmd, {});
				if (r.stderr) {
					log.warn(`- Failed to render file: ${filePdf}`); // , r.stderr.toString()
					return false;
				}
			} catch (err) {
				return false;
			}
		} else if (cfg.options.pdf.engine == "puppeteer") {
			await this.init();
			let page = await this.browser.newPage();
			await page.goto("file://" + join(dirHtml, fileHtml), {
				waitUntil: "networkidle0",
			});
			await page.emulateMediaType("print");
			await page.pdf({
				path: join(dirPdf, filePdf),
				margin: {
					bottom: cfg.options.pdf.rendering.margin.bottom.toString() + "px",
					top: cfg.options.pdf.rendering.margin.top.toString() + "px",
					left: cfg.options.pdf.rendering.margin.left.toString() + "px",
					right: cfg.options.pdf.rendering.margin.right.toString() + "px",
				},
				printBackground: true,
				format: "A4",
			});
		}
		if (verbose) {
			log.info(`- File written: ${filePdf}`);
		}

		this.sign(join(dirPdf, filePdf));

		return true;
	}

	/**
	 * @param {string} file
	 */
	sign(file) {
		if (cfg.options.pdf.rendering.sign) {
			signFile(file);
		}
	}
}
