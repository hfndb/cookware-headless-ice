import { join } from "path";
import shelljs from "shelljs";
import { getChangeList, AppConfig, FileUtils, Logger } from "../lib/index.mjs";
import { removeObsolete } from "./files.mjs";
import { NunjucksUtils } from "./nunjucks.mjs";
import { Stripper } from "./stripping.mjs";
import { Formatter, StringExt } from "./utils.mjs";
const { test, touch } = shelljs;

/**
 * Counter to yield higher integers each time, in template
 */
function* counter(value) {
	let step;
	while (true) {
		step = yield ++value;
		if (step) {
			value += step;
		}
	}
}

export class Content {
	constructor() {
		this.rendered = [];
		this.saydHello = false;
	}

	/**
	 * Get HTML output directory
	 */
	static getOutputDir() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let outputDir = "";
		if (test("-d", join(cfg.dirProject, cfg.options.html.dirs.output))) {
			// In case of local project
			outputDir = join(cfg.dirProject, cfg.options.html.dirs.output);
		} else if (test("-d", cfg.options.html.dirs.output)) {
			// In case of hosting
			outputDir = cfg.options.html.dirs.output;
		} else {
			log.error("HTML output directory couldn't be determined");
		}
		return outputDir;
	}

	writeOutput(entry, data, verbose = true) {
		if (!data) return;
		let log = Logger.getInstance();
		if (!this.saydHello && verbose) {
			this.saydHello = true;
			log.info("Rendering HTML content");
		}
		FileUtils.writeFile(entry.targetDir, entry.target, data, true);
		/**
		 * Perhaps content isn't changed, only a template.
		 * Anyway, adjust last modified date time to date time of content.
		 *
		 * Why? Then bots, scrapers can reliably determine the actual
		 * date time of the last update. And, if you look at
		 * the network console in a web browser, you'll see the correct
		 * information.
		 *
		 * No bullshit as in many CMS's which output the date time
		 * of 'on the fly' composing HTML. Which is always 'now',
		 * thus obscuring when a page was really written or updated.
		 *
		 * No cheating, no misleading. Touching? 😉
		 */
		let lastChanged = FileUtils.getLastModifiedDate(entry.dir, entry.source);
		// @ts-ignore
		touch(join(entry.targetDir, entry.target));
	}

	/**
	 * Render all changed or new HTML content files
	 */
	renderAll(verbose = true, additionalContext) {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let nj;
		let opts = { additionalContext: additionalContext };
		let outputDir = Content.getOutputDir();
		if (cfg.options.html.caching.engine == "nunjucks") {
			nj = new NunjucksUtils();
			nj.setSearchPaths();
		} else {
			log.error(`Unkown template engine ${cfg.options.html.caching.engine}`);
		}
		let processed = [];
		this.rendered = [];
		let changeList = getChangeList({
			sourcePath: join(cfg.dirProject, cfg.options.html.dirs.content),
			targetPath: outputDir,
			sourceExt: [".html", ".njk"],
			targetExt: ".html",
			excludeList: cfg.options.html.caching.exclude,
		});
		if (changeList.length > 0) {
			let content;
			let maxHtml = 0; // to get the latest modified HTML content
			changeList.forEach(entry => {
				maxHtml = Math.max(maxHtml, entry.targetLastModified);
				processed.push(entry.source);
				if (
					!entry.isNewOrModified() &&
					cfg.options.html.caching.engine == "nunjucks" &&
					nj.isChanged(entry.dir, entry.source, entry.lastModified)
				) {
					entry.status = "modified";
				}
				if (entry.isNewOrModified()) {
					content = this.render(entry.dir, entry.source, opts);
					this.writeOutput(entry, content, verbose);
					this.rendered.push(entry.source);
				}
			});
		}
		removeObsolete(
			cfg.options.html.caching.removeObsolete,
			processed,
			outputDir,
			".html",
		);
		if (this.saydHello && verbose) {
			log.info("... HTML done");
		} else if (verbose) {
			log.info("No changes in HTML files found");
		}
	}

	/**
	 * Read a HTML content file file from disk and render it
	 *
	 * @todo implement multiple template engines
	 */
	render(dir, file, opts) {
		let cfg = AppConfig.getInstance();
		let retVal = "";
		if (!opts) opts = {};
		let templateDir;
		if (opts.templateDir) {
			templateDir = opts.templateDir;
		} else if (opts.useProjectTemplates) {
			templateDir = join(cfg.dirProject, cfg.options.html.dirs.templates[0]);
		} else {
			templateDir = join(cfg.dirMain, "templates");
		}
		let context = Content.getDefaultContext(file);
		if (opts.additionalContext) {
			Object.assign(context, opts.additionalContext);
		}
		switch (cfg.options.html.caching.engine) {
			case "nunjucks":
				let nj = new NunjucksUtils();
				nj.setSearchPaths(templateDir);
				retVal = nj.renderFile(dir, file, context);
		}
		retVal = Stripper.stripHtml(retVal);
		return retVal;
	}

	/**
	 * <p>
	 *   By default in context:
	 * </p>
	 * <ul>
	 *   <li>frmt - instance of Formatter in lib/utils.js</li>
	 *   <li>path - relative to root</li>
	 *   <li>level - relative to root</li>
	 *   <li>description - of website</li>
	 *   <li>url - Home URL of website</li>
	 *   <li>createdDate - formatted string</li>
	 *   <li>createdDateTime - formatted string</li>
	 *   <li>createdTime - formatted string</li>
	 *   <li>environment - Node.js environment</li>
	 * </ul>
	 */
	static getDefaultContext(url) {
		let cfg = AppConfig.getInstance();
		const frmtr = Formatter.getInstance();
		// Determine prefix for statics, variable 'level' in context and base template
		let levelNum = StringExt.occurrences(url, "/");
		let levelStr = "";
		for (let i = 0; i < levelNum; i++) {
			levelStr = levelStr + "../";
		}
		// Counter in template:
		// counter.next().value;   // First retrieve value 0
		return {
			counter: counter(-1),
			createdDate: frmtr.date(new Date()),
			createdDateTime: frmtr.datetime(new Date()),
			createdTime: frmtr.time(new Date()),
			description: cfg.options.domain.description,
			environment: process.env.NODE_ENV,
			frmt: frmtr,
			level: levelStr,
			path: url,
			url: cfg.options.domain.url,
		};
	}
}
