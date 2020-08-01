import {
	controllerContent,
	controllerStatic,
	controllerSys
} from "./controllers";
import { ConfigWatch, CssWatch, JsWatch, SassWatch } from "./watches";
import { AppConfig } from "../lib/config";
import { Logger } from "../lib";
import { ExpressUtils } from "../lib/express";
import { backupChangedSource } from "../local/misc";
import { compile as compileJs } from "../local/babel";
import { SassUtils } from "../local/styling";
import { SessionVars } from "../sys/session";
// import { STATUS_CODES } from "http";

/**
 * Stop file watching, display stats, stop server
 */
export function gracefulShutdown(): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);

	// Stop all active file watching
	if (ConfigWatch.instance instanceof Object) {
		ConfigWatch.instance.stop();
	}

	if (CssWatch.instance instanceof Object) {
		CssWatch.instance.stop();
	}

	if (SassWatch.instance instanceof Object) {
		SassWatch.instance.stop();
	}

	if (JsWatch.instance instanceof Object) {
		JsWatch.instance.stop();
	}

	let session = SessionVars.getInstance();
	log.info(session.toString()); // Statistics about processed files

	// Perhaps overkill, but... these function calls will delete obsolete files - due to renaming files
	compileJs(false);
	SassUtils.compile(false);

	ExpressUtils.shutdown();
}

/**
 * Organize:
 * <ol>
 *	<li>auto-backup,</li>
 *	<li>auto-compile,</li>
 *	<li>file watching and<l/i>
 *	<li>running a live development server</li>
 * </ol>
 *
 * Please read about project philosophy and related ethics in the docs, page "Design goals and roadmap".
 */
export function coatRack(): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);

	if (cfg.options.server.firstUpdateSources) {
		log.info("Checking (and updating) sources");
		compileJs(false);
		SassUtils.compile(false);
		log.info("... done");
	}

	log.shutdown = gracefulShutdown;

	// Setup file watching
	ConfigWatch.instance = new ConfigWatch(
		cfg.dirProject,
		"",
		"config.json",
		cfg.options.server.watchTimeout,
		"application config file (config.json)"
	);

	CssWatch.instance = new CssWatch(
		cfg.dirProject,
		cfg.options.sass.dirs.source,
		"",
		cfg.options.server.watchTimeout,
		"plain css files"
	);

	SassWatch.instance = new SassWatch(
		cfg.dirProject,
		cfg.options.sass.dirs.source,
		"",
		cfg.options.server.watchTimeout,
		"Sass files"
	);

	if (cfg.options.javascript.useWatch) {
		let type = "JavaScript";
		switch (cfg.options.javascript.compiler) {
			case "flow":
				type = "Flow";
				break;
			case "typescript":
				type = "TypeScript";
				break;
		}
		JsWatch.instance = new JsWatch(
			cfg.dirProject,
			cfg.options.javascript.dirs.source,
			"",
			cfg.options.server.watchTimeout,
			`${type} files`
		);
	}

	// Setup incremental autobackup of changed sources
	if (cfg.options.server.backupInterval > 0) {
		backupChangedSource(true);
		setInterval(
			backupChangedSource,
			cfg.options.server.backupInterval * 60 * 1000
		);
	}

	// Setup express server
	let eu = ExpressUtils.getInstance(false);
	eu.app.get(/^.*\/$/, controllerContent); // Home [of subdir]
	eu.app.all(/^\/.*.html$/, controllerContent); // HTML pages, to GET or POST
	eu.app.get(/^\/.*.md$/, controllerContent); // Markdown
	eu.app.get(/^\/sys\//, controllerSys); // System start page
	if (cfg.isProject && cfg.options.server.staticUrl != "static") {
		eu.app.get(
			new RegExp(`^\/${cfg.options.server.staticUrl}\/`),
			controllerStatic
		);
	}
	eu.app.get(/^\/static\//, controllerStatic);
	eu.app.get(/^\/epub/, controllerStatic);
	eu.app.get(/^\/pdf/, controllerStatic);
	eu.init(gracefulShutdown);
}
