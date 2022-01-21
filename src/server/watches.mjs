"use strict";

import { basename, extname, join } from "path";
import { FileUtils, FileWatcher, FileStatus, Logger } from "../lib/index.mjs";
import { Beautify } from "../lib/beautify.mjs";
import { AppConfig } from "../lib/config.mjs";
import { JavascriptUtils } from "../local/javascript.mjs";
import { PhpUtils } from "../local/php.mjs";
import { SourceUtils } from "../local/source.mjs";
import { Double, SassFiles, SassUtils } from "../local/styling.mjs";
import { Tags } from "../local/tags.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";

let cfg = AppConfig.getInstance();
let log = Logger.getInstance();

/**
 * Active watches
 */
let watches = {
	config: null,
	js: null,
	php: null,
	sass: null,
};

class ConfigWatch extends FileWatcher {
	/**
	 * @param {any} event
	 * @param {string} file
	 */
	change(event, file) {
		event; // Fool compiler - unused variable
		file;
		cfg.read();
		log.info(`- settings.json changed and reloaded`);
	}
}

class JsWatch extends FileWatcher {
	/**
	 * @param {any} event
	 * @param {string} file
	 */
	change(event, file) {
		event; // Fool compiler - unused variable
		if (Double.is(file)) return;
		let dir = join(cfg.dirProject, cfg.options.javascript.dirs.source);
		let ext = extname(file);
		let fullPath = join(dir, file);
		let isTypescript = ext.endsWith("ts");
		if ([".cjs", ".mjs"].includes(ext)) {
			let source = FileUtils.readFile(fullPath);
			source = Beautify.content(file, source);
			if (source) {
				FileUtils.writeFile(dir, file, source, false);
			}
			return;
		}
		if (![".js", ".ts", ".cts", ".mts"].includes(ext)) return;

		log.info(`- ${file} changed`);
		let status = new FileStatus(dir);
		status.setSource(file, ext);
		status.setTarget(
			join(cfg.dirProject, cfg.options.javascript.dirs.output),
			".js",
		);

		let session = SessionVars.getInstance();
		session.add(
			isTypescript ? ProcessingTypes.typescript : ProcessingTypes.javascript,
			file,
		);

		SourceUtils.compileFile(status, "", true);
		JavascriptUtils.bundle();
		Tags.forProject(cfg.options.javascript.dirs.source, false);
		Tags.forFile(join(cfg.options.javascript.dirs.source, status.source));
	}
}

class PhpWatch extends FileWatcher {
	/**
	 * @param {any} event
	 * @param {string} file
	 */
	change(event, file) {
		event; // Fool compiler - unused variable
		if (extname(file) != ".php") {
			return;
		}
		if (Double.is(file)) return;

		log.info(`- ${file} changed`);
		let dir = join(cfg.dirProject, cfg.options.php.dirs.source);
		let session = SessionVars.getInstance();
		session.add(ProcessingTypes.php, file);

		// Setup inplace editing
		let status = new FileStatus(dir);
		status.setSource(file, ".php");
		status.setTarget(dir, ".php");
		PhpUtils.beautify(status);
	}
}

class SassWatch extends FileWatcher {
	/**
	 * @param {any} event
	 * @param {string} file
	 */
	change(event, file) {
		event; // Fool compiler - unused variable
		if (extname(file) != ".scss") {
			return;
		}
		if (Double.is(file)) return;

		log.info(`- ${file} changed`);
		let session = SessionVars.getInstance();
		session.add(ProcessingTypes.sass, file);

		let status = new FileStatus(
			join(cfg.dirProject, cfg.options.sass.dirs.source),
		);
		status.setSource(file, ".scss");
		status.setTarget(SassUtils.getOutputDir(), ".css");

		let ext = extname(file);
		let stem = basename(file, ext);
		if (stem.startsWith("_")) {
			// Include
			let dir = join(cfg.dirProject, cfg.options.sass.dirs.source);
			let source = FileUtils.readFile(join(dir, file));
			source = Beautify.content(file, source);
			if (source) {
				FileUtils.writeFile(dir, file, source, false);
			}
		}
		if (SassFiles.isImport(file)) {
			// Used import(s), compile all top level files
			SassUtils.compile(true, true);
		} else {
			SassUtils.compileFile(status);
		}
	}
}

/**
 * Setup file watching. In bash this would need, for example:
 *
 * @example
 * while inotifywait -qr -e attrib --format 'Changed: %w%f' ./src ./sass; do
 *	    /opt/projects/cookware-headless-ice/bin/starter.sh -g
 * done
 */
export function initWatches() {
	watches.config = new ConfigWatch(
		cfg.dirProject,
		"",
		"settings.json",
		cfg.options.server.watchTimeout,
		"project settings file (settings.json)",
	);

	if (cfg.options.javascript.useWatch) {
		let tp = "JavaScript";
		switch (cfg.options.javascript.compiler) {
			case "flow":
				tp = "Flow";
				break;
			case "typescript":
				tp = "TypeScript";
				break;
		}
		watches.js = new JsWatch(
			cfg.dirProject,
			cfg.options.javascript.dirs.source,
			"",
			cfg.options.server.watchTimeout,
			`${tp} files`,
		);
	}

	if (cfg.options.php.useWatch) {
		watches.php = new PhpWatch(
			cfg.dirProject,
			cfg.options.php.dirs.source,
			"",
			cfg.options.server.watchTimeout,
			"Php files",
		);
	}

	watches.sass = new SassWatch(
		cfg.dirProject,
		cfg.options.sass.dirs.source,
		"",
		cfg.options.server.watchTimeout,
		"Sass files",
	);
}

export function terminateWatches() {
	// Stop all active file watching
	if (watches.config) watches.config.stop();
	if (watches.js) watches.js.stop();
	if (watches.php) watches.php.stop();
	if (watches.sass) watches.sass.stop();
}
