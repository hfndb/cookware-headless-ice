import { join } from "path";
import { cat, exec, rm, test } from "shelljs";
import { AppConfig, FileUtils, Logger } from "../lib";

export class JavascriptUtils {
	/**
	 * Get HTML output directory
	 */
	static getOutputDir(): string {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let outputDir = "";
		if (test("-d", join(cfg.dirProject, cfg.options.javascript.dirs.output))) {
			// In case of local project
			outputDir = join(cfg.dirProject, cfg.options.javascript.dirs.output);
		} else if (test("-d", cfg.options.javascript.dirs.output)) {
			// In case of hosting
			outputDir = cfg.options.javascript.dirs.output;
		} else {
			log.error("JavaScript output directory couldn't be determined");
		}

		return outputDir;
	}

	/**
	 * Create minified JavaScript bundles
	 *
	 * @returns array with output files
	 */
	static bundle(): string[] {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		let nodeExec = join(cfg.dirMain, "node_modules", "node", "bin", "node");
		let execPath = join(cfg.dirMain, "dist", "static", "js", "local");
		let outDir = JavascriptUtils.getOutputDir();
		let retVal: string[] = [];

		if (cfg.options.javascript.bundles.length == 0 && cfg.options.javascript.apps.length == 0) {
			return retVal;
		}

		// Generate bundles
		for (let i = 0; i < cfg.options.javascript.bundles.length; i++) {
			let bundle = cfg.options.javascript.apps[i];
			let items: string[] = [];
			let outfile = join(outDir, bundle.output);
			retVal.push(bundle.output);
			rm("-f", outfile);

			bundle.source.forEach((item: string) => {
				items.push(join(outDir, item));
			});
			cat(items).to(outfile);

			log.info(`Written Javascript bundle ${bundle.output}`);
		}

		// Generate apps
		for (let i = 0; i < cfg.options.javascript.apps.length; i++) {
			let bundle = cfg.options.javascript.apps[i];
			let outfile = join(outDir, bundle.output);
			retVal.push(bundle.output);
			rm("-f", outfile);

			let cmd = `${nodeExec} ${join(execPath, "create-app.js")} ${cfg.dirProject}` + ` ${i}`;
			if (process.env.NODE_ENV == "production") {
				cmd += " 1";
			}
			exec(cmd);

			// Cleanup obsolete directories and files
			for (let i = 0; bundle.cleanup && i < bundle.cleanup.length; i++) {
				let file = join(outDir, bundle.cleanup[i]);
				if (test("-e", file)) rm("-rf", file); // Could be directory
				file += ".map";
				if (test("-e", file)) rm(file); // Related source map
			}
		}

		return retVal;
	}
}

/**
 * Generate HTML formatted docs from JavaScript sources in src.
 * Uses configuration in config.json
 */
export function generateJsDocs(): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);

	// Make paths relative to project directory
	let options: any = cfg.options.dependencies.jsdoc.config;
	let dir = options.opts.destination;
	options.opts.destination = join(cfg.dirProject, dir);

	for (let i = 0; i < options.source.include.length; i++) {
		options.source.include[i] = join(cfg.dirProject, options.source.include[i]);
	}

	// Write temp version of config
	FileUtils.writeJsonFile(options, cfg.dirTemp, ".jsdoc.json", false);

	// Create or clean output directory
	if (test("-d", options.opts.destination)) {
		rm("-rf", join(options.opts.destination, "*"));
	} else {
		FileUtils.mkdir(options.opts.destination);
	}

	log.info(`Generating API docs of JavaScript files, in ${dir}`);
	exec(`jsdoc --configure ${join(cfg.dirTemp, ".jsdoc.json")}`, { async: true });
}
