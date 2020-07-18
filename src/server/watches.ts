import { basename, extname, join } from "path";
import { cp } from "shelljs";
import { FileWatcher, FileStatus, Logger } from "../lib";
import { AppConfig } from "../lib/config";
import { compileFile } from "../local/babel";
import { JavascriptUtils } from "../local/javascript";
import { SassUtils } from "../local/styling";
import { ProcessingTypes, SessionVars } from "../sys/session";

export class ConfigWatch extends FileWatcher {
	static instance: ConfigWatch;

	public change(event: string, file: string): void {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		event; // Fool compiler - unused variable
		file;
		cfg.read();
		log.info(`- config.json changed and reloaded`);
	}
}

export class CssWatch extends FileWatcher {
	static instance: CssWatch;

	public change(event: string, file: string): void {
		event; // Fool compiler - unused variable
		if (extname(file) != ".css") {
			return;
		}
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		log.info(`- ${file} changed`);
		cp(join(cfg.dirProject, cfg.options.sass.dirs.source, file), SassUtils.getOutputDir());
	}
}

export class SassWatch extends FileWatcher {
	static instance: SassWatch;

	public change(event: string, file: string): void {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		event; // Fool compiler - unused variable
		if (extname(file) != ".scss") {
			return;
		}
		log.info(`- ${file} changed`);

		let session = SessionVars.getInstance();
		session.add(ProcessingTypes.sass, file);

		if (basename(file, ".scss").startsWith("_")) {
			// Mixin, compile everything
			SassUtils.compile(true);
		} else {
			let status = new FileStatus(join(cfg.dirProject, cfg.options.sass.dirs.source));
			status.setSoure(file, ".scss");
			status.setTarget(SassUtils.getOutputDir(), ".css");
			SassUtils.compileFile(status);
		}
	}
}

export class JsWatch extends FileWatcher {
	static instance: JsWatch;

	public change(event: string, file: string): void {
		event; // Fool compiler - unused variable
		if (extname(file) != ".js" && extname(file) != ".ts") {
			return;
		}
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		log.info(`- ${file} changed`);

		let isTypescript = extname(file) == ".ts";
		let status = new FileStatus(join(cfg.dirProject, cfg.options.javascript.dirs.source));
		status.setSoure(file, isTypescript ? ".ts" : ".js");
		status.setTarget(join(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");

		switch (cfg.options.javascript.compiler) {
			case "":
				cp(
					join(cfg.dirProject, cfg.options.javascript.dirs.source, file),
					join(cfg.dirProject, cfg.options.javascript.dirs.output, file)
				);
			default:
				let session = SessionVars.getInstance();
				session.add(isTypescript ? ProcessingTypes.typescript : ProcessingTypes.javascript, file);
				compileFile(status, true);
				JavascriptUtils.bundle();
				break;
		}
	}
}
