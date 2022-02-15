"use strict";
import { join } from "path";
import { FileUtils, FileStatus, Logger } from "../generic/index.mjs";
import { Beautify } from "../generic/beautify.mjs";
import { AppConfig } from "../generic/config.mjs";
import { FileWatcher } from "../generic/file-system/watch.mjs";
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
		let fi = FileUtils.getFileInfo(dir, file);
		let isTypescript = fi.file.ext.endsWith("ts");
		let status = new FileStatus(dir);
		status.setSource(file, fi.file.ext);

		dir = join(cfg.dirProject, cfg.options.javascript.dirs.output);

		log.info(`- ${file} changed`);
		status.setTarget(dir, ".js");

		if ([".cjs", ".mjs"].includes(fi.file.ext)) {
			SourceUtils.stripModule(status, true);
		} else if ([".js", ".ts", ".cts", ".mts"].includes(fi.file.ext)) {
			let session = SessionVars.getInstance();
			session.add(
				isTypescript ? ProcessingTypes.typescript : ProcessingTypes.javascript,
				file,
			);

			SourceUtils.compileFile(status, "", true);
			JavascriptUtils.bundle();
		}

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
		if (Double.is(file)) return;

		let dir = join(cfg.dirProject, cfg.options.php.dirs.source);
		let fi = FileUtils.getFileInfo(dir, file);

		if (fi.file.ext != ".php") {
			return;
		}

		log.info(`- ${file} changed`);
		let session = SessionVars.getInstance();
		session.add(ProcessingTypes.php, fi.file.full);

		// Setup inplace editing
		let status = new FileStatus(dir);
		status.setSource(fi.file.full, ".php");
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
		if (Double.is(file)) return;


		let dir = join(cfg.dirProject, cfg.options.sass.dirs.source);
		let fi = FileUtils.getFileInfo(dir, file);
		if (fi.file.ext != ".scss") return;

		log.info(`- ${file} changed`);
		let session = SessionVars.getInstance();
		session.add(ProcessingTypes.sass, fi.file.full);

		let status = new FileStatus(
			join(cfg.dirProject, cfg.options.sass.dirs.source),
		);
		status.setSource(file, ".scss");
		status.setTarget(SassUtils.getOutputDir(), ".css");

		if (fi.file.stem.startsWith("_")) {
			// Include
			let source = FileUtils.readFile(fi.full);
			source = Beautify.content(file, source);
			if (source) {
				FileUtils.writeFile(fi.path.full, fi.file.full, source, false);
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
	watches.config = new ConfigWatch({
		workingDir: cfg.dirProject,
		path: "settings.json",
		description: "project settings file (settings.json)",
		timeout: cfg.options.server.watchTimeout,
	});

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
		watches.js = new JsWatch({
			workingDir: cfg.dirProject,
			path: cfg.options.javascript.dirs.source,
			description: "JavaScript files",
			timeout: cfg.options.server.watchTimeout,
		});
	}

	if (cfg.options.php.useWatch) {
		watches.php = new PhpWatch({
			workingDir: cfg.dirProject,
			path: cfg.options.php.dirs.source,
			description: "Php files",
			timeout: cfg.options.server.watchTimeout,
		});
	}

	watches.sass = new SassWatch({
		workingDir: cfg.dirProject,
		path: cfg.options.sass.dirs.source,
		description: "Sass files",
		timeout: cfg.options.server.watchTimeout,
	});
}

export function terminateWatches() {
	// Stop all active file watching
	if (watches.config) watches.config.stop();
	if (watches.js) watches.js.stop();
	if (watches.php) watches.php.stop();
	if (watches.sass) watches.sass.stop();
}
