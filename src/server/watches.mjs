import { extname, join } from "path";
import shelljs from "shelljs";
import { FileUtils, FileWatcher, FileStatus, Logger } from "../lib/index.mjs";
import { compileFile } from "../local/babel.mjs";
import { Beautify } from "../lib/beautify.mjs";
import { AppConfig } from "../lib/config.mjs";
import { JavascriptUtils } from "../local/javascript.mjs";
import { PhpUtils } from "../local/php.mjs";
import { Double, SassFiles, SassUtils } from "../local/styling.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
const { cp, exec, grep } = shelljs;

let cfg = AppConfig.getInstance();
let log = Logger.getInstance();

class ConfigWatch extends FileWatcher {
	change(event, file) {
		event; // Fool compiler - unused variable
		file;
		cfg.read();
		log.info(`- settings.json changed and reloaded`);
	}
}

class JsWatch extends FileWatcher {
	change(event, file) {
		event; // Fool compiler - unused variable
		if (Double.is(file)) return;
		let dir = join(cfg.dirProject, cfg.options.javascript.dirs.source);
		let ext = extname(file);
		let fullPath = join(dir, file);
		let isTypescript = ext.endsWith("ts");
		if ([".cjs", ".mjs"].includes(ext)) {
			let source = FileUtils.readFile(fullPath);
			source = Beautify.content(join(dir, file), source);
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

		switch (cfg.options.javascript.compiler) {
			case "":
				cp(
					join(dir, file),
					join(cfg.dirProject, cfg.options.javascript.dirs.output, file),
				);
			default:
				let session = SessionVars.getInstance();
				session.add(
					isTypescript ? ProcessingTypes.typescript : ProcessingTypes.javascript,
					file,
				);

				compileFile(status, true);
				JavascriptUtils.bundle();
				if (cfg.options.javascript.generateTags) {
					exec(
						`ctags-exuberant --fields=nksSaf --file-scope=yes -R  ${join(
							cfg.dirProject,
							cfg.options.javascript.dirs.source,
						)}`,
						{ async: true },
					);
				}
		}
	}
}

class PhpWatch extends FileWatcher {
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

		if (SassFiles.isImport(file)) {
			// Import, compile everything
			SassUtils.beautify(status);
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
	ConfigWatch.instance = new ConfigWatch(
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
		JsWatch.instance = new JsWatch(
			cfg.dirProject,
			cfg.options.javascript.dirs.source,
			"",
			cfg.options.server.watchTimeout,
			`${tp} files`,
		);
	}

	if (cfg.options.php.useWatch) {
		PhpWatch.instance = new PhpWatch(
			cfg.dirProject,
			cfg.options.php.dirs.source,
			"",
			cfg.options.server.watchTimeout,
			"Php files",
		);
	}

	SassWatch.instance = new SassWatch(
		cfg.dirProject,
		cfg.options.sass.dirs.source,
		"",
		cfg.options.server.watchTimeout,
		"Sass files",
	);
}

export function terminateWatches() {
	// Stop all active file watching
	if (ConfigWatch.instance instanceof Object) {
		ConfigWatch.instance.stop();
	}

	if (SassWatch.instance instanceof Object) {
		SassWatch.instance.stop();
	}

	if (JsWatch.instance instanceof Object) {
		JsWatch.instance.stop();
	}
}
