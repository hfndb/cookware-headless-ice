import { basename, join } from "path";
import { exec } from "shelljs";
import {
	getChangeList,
	AppConfig,
	FileStatus,
	FileUtils,
	Logger
} from "../lib";
import { removeObsolete } from "../lib/files";
import { Content } from "../lib/html";
import { signFile } from "../lib/pgp";
import { ProcessingTypes, SessionVars } from "../sys/session";
import { compile as compileJs } from "./babel";
import { SassUtils } from "./styling";

/**
 * Render all changed or new PDF files
 * Uses configuration in settings.json
 */
export function renderPdf(): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);

	if (cfg.options.pdf.firstUpdateWeb) {
		log.info("Checking (and updating) sources and content");
		compileJs(false);
		SassUtils.compile(false);

		let content = new Content();
		content.renderAll(false);
		log.info("... done");
	}

	let processed: string[] = [];

	FileUtils.mkdir(join(cfg.dirProject, cfg.options.pdf.dirs.output));

	let changeList = getChangeList({
		sourcePath: Content.getOutputDir(),
		targetPath: join(cfg.dirProject, cfg.options.pdf.dirs.output),
		sourceExt: [".html"],
		targetExt: ".pdf",
		excludeList: cfg.options.pdf.rendering.exclude,
		flatten: true
	});

	if (changeList.length == 0) return;

	let saydHello = false;
	changeList.forEach((entry: FileStatus) => {
		if (entry.isNewOrModified()) {
			if (!saydHello) {
				saydHello = true;
				log.info("Rendering PDF files");
			}
			renderPdfFile(entry);
		}
		processed.push(basename(entry.target));
	});

	removeObsolete(
		cfg.options.pdf.rendering.removeObsolete,
		processed,
		join(cfg.dirProject, cfg.options.pdf.dirs.output),
		".pdf"
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
 * @returns success
 */
function renderPdfFile(fileStatus: FileStatus): boolean {
	if (!fileStatus.isNewOrModified()) {
		return true;
	}

	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let retVal = true;
	let session = SessionVars.getInstance();

	// Download binary: https://wkhtmltopdf.org/downloads.html
	let cmd = "wkhtmltopdf -q -s A4 -L "
		.concat(cfg.options.pdf.rendering.marginLeft.toString())
		.concat("mm -R ")
		.concat(cfg.options.pdf.rendering.marginRight.toString())
		.concat(
			'mm --print-media-type --enable-local-file-access  --header-right "[page] / [toPage]" '
		)
		.concat(join(fileStatus.dir, fileStatus.source))
		.concat(" ")
		.concat(join(fileStatus.targetDir, fileStatus.target));

	try {
		let r = exec(cmd, {});
		if (r.stderr) {
			log.warn(`- Failed to render file: ${fileStatus.target}`); // , r.stderr.toString()
			return false;
		}
		log.info(`- File written: ${fileStatus.target}`);
		session.add(ProcessingTypes.pdf, fileStatus.target);
		if (cfg.options.pdf.rendering.sign) {
			signFile(join(cfg.dirProject, fileStatus.target));
		}
	} catch (err) {
		retVal = false;
	}

	return retVal;
}
