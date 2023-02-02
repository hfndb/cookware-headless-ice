"use strict";
import { basename, join } from "node:path";
import {
	getChangeList,
	AppConfig,
	FileUtils,
	Logger,
} from "../generic/index.mjs";
import { removeObsolete } from "../generic/file-system/files.mjs";
import { Content } from "../generic/html.mjs";
import { PdfGenerator } from "../generic/pdf.mjs";
import { exec } from "../generic/sys.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { SourceUtils } from "./source.mjs";
import { SassUtils } from "./styling.mjs";

export class Pdf {
	/**
	 * Render all changed or new PDF files
	 * Uses configuration in settings.json
	 */
	static async renderAll() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		if (cfg.options.pdf.firstUpdateWeb) {
			log.info("Checking (and updating) sources and content");
			SourceUtils.compile(false);
			SassUtils.compile(false);
			let content = new Content();
			content.renderAll(false);
			log.info("... done");
		}
		let processed = [];
		FileUtils.mkdir(join(cfg.dirProject, cfg.options.pdf.dirs.output));
		let changeList = getChangeList({
			sourcePath: Content.getOutputDir(),
			targetPath: join(cfg.dirProject, cfg.options.pdf.dirs.output),
			sourceExt: [".html"],
			targetExt: ".pdf",
			excludeList: cfg.options.pdf.rendering.exclude,
			flatten: true,
		});
		if (changeList.length == 0) return;

		let pg = new PdfGenerator();
		let saydHello = false;

		changeList.forEach(entry => {
			if (entry.isNewOrModified()) {
				if (!saydHello) {
					saydHello = true;
					log.info("Rendering PDF files");
				}
				Pdf.renderFile(entry);
			}
			processed.push(basename(entry.target));
		});

		await pg.cleanup();
		removeObsolete(
			cfg.options.pdf.rendering.removeObsolete,
			processed,
			join(cfg.dirProject, cfg.options.pdf.dirs.output),
			".pdf",
		);

		if (saydHello) {
			log.info("... PDF done");
		} else {
			log.info("No changes in PDF files found");
		}
	}

	/**
	 * Render PDF file
	 *
	 * @param {FileStatus} fileStatus
	 * @param {PdfGenerator} pg
	 * @returns success
	 */
	static async renderFile(fileStatus, pg) {
		if (!fileStatus.isNewOrModified()) return true;

		if (
			await pg.write(
				fileStatus.dir,
				fileStatus.source,
				fileStatus.targetDir,
				fileStatus.target,
			)
		) {
			let session = SessionVars.getInstance();
			session.add(ProcessingTypes.pdf, fileStatus.target);
			return true;
		} else {
			return false;
		}
	}
}
