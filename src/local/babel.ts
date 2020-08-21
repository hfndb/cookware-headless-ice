import { basename, dirname, join } from "path";
import { exec, rm, test } from "shelljs";
import { transformSync } from "@babel/core";
import {
	getChangeList,
	AppConfig,
	FileStatus,
	FileUtils,
	Logger
} from "../lib";
import { removeObsolete } from "../lib/files";
import { Beautify } from "../lib/beautify";
import { ProcessingTypes, SessionVars } from "../sys/session";
import { JavascriptUtils } from "./javascript";

// https://babeljs.io/docs/en/

/**
 * Compile changed or new files, create browser bundles
 */
export function compile(verbose: boolean): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let outDir = JavascriptUtils.getOutputDir();
	let saydHello = false;
	let session = SessionVars.getInstance();
	let sourceExt =
		cfg.options.javascript.compiler == ProcessingTypes.typescript ? ".ts" : ".js";

	let path = join(cfg.dirProject, cfg.options.javascript.dirs.source);
	if (!test("-e", path)) {
		log.warn(
			`Path ./${
				cfg.options.javascript.dirs.source
			} doesn't exist. Request to compile ignored`
		);
		return;
	}

	function write(entry: FileStatus) {
		if (!saydHello && verbose) {
			saydHello = true;
			log.info(`Transcompiling ${cfg.options.javascript.compiler}`);
		}
		compileFile(entry, true);
	}

	let changeList = getChangeList({
		sourcePath: join(cfg.dirProject, cfg.options.javascript.dirs.source),
		targetPath: outDir,
		sourceExt: [sourceExt],
		targetExt: ".js",
		excludeList: cfg.options.javascript.removeObsolete.exclude
	});
	let processed: string[] = [];

	changeList.forEach((entry: FileStatus) => {
		processed.push(entry.target);
		if (entry.isNewOrModified()) {
			session.add(
				cfg.options.javascript.compiler == "flow"
					? "javascript"
					: cfg.options.javascript.compiler,
				entry.source
			);
			write(entry);
		}
	});

	JavascriptUtils.bundle().forEach((file: string) => {
		processed.push(file);
	});

	removeObsolete(
		cfg.options.javascript.removeObsolete,
		processed,
		outDir,
		".js"
	);

	if (saydHello && verbose) {
		if (cfg.options.javascript.generateTags) {
			exec(
				`ctags-exuberant -R  ${join(
					cfg.dirProject,
					cfg.options.javascript.dirs.source
				)}`,
				{ async: true }
			);
		}
		log.info(`... done`);
	} else if (verbose) {
		log.info(`No changed ${cfg.options.javascript.compiler} files found`);
	}
}

/**
 * Compile source file, using the configuration in config.json
 *
 * @returns success
 * @todo Decorators (such as for package json2typescript) don't work yet. Apparently due to bugs in this plugin
 */
export function compileFile(
	entry: FileStatus,
	verbose: boolean = true
): boolean {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let fullPath = join(entry.dir, entry.source);
	let plugins: any[] = [
		"@babel/plugin-proposal-class-properties",
		"@babel/proposal-object-rest-spread"
	];
	let presets: any[] = [];
	let source = FileUtils.readFile(fullPath);

	if (cfg.options.server.beautify.includes("src")) {
		source = Beautify.content(entry.source, source);
		if (source) {
			FileUtils.writeFile(entry.dir, entry.source, source, false);
		} else {
			return;
		}
	}

	// In case of certain import statements...
	if (source.includes("antd")) {
		// In case of not using the full, minified antd files:
		// babel-plugin-import could be used to decrease size of browser bundle.
		// @dee antd docs, gettng started
		presets.push(["@babel/preset-react"]); // Using default settings
	} else if (source.includes('"react')) {
		presets.push(["@babel/preset-react"]); // Using default settings
	}

	if (process.env.NODE_ENV == "production") {
		// For production use
		presets.push("minify");
	} else if (
		!dirname(entry.source).includes("browser") &&
		cfg.options.javascript.sourceMapping
	) {
		// https://www.mattzeunert.com/2016/02/14/how-do-source-maps-work.html
		plugins.push("source-map-support");
	}

	// @todo Should come BEFORE @babel/plugin-proposal-class-properties
	// plugins.push([
	// 	"@babel/plugin-proposal-decorators",
	// 	{
	// 		decoratorsBeforeExport: true,
	// 		legacy: false
	// 	}
	// ]);

	if (cfg.options.javascript.compiler == "typescript") {
		presets.push("@babel/preset-typescript");
		// See https://iamturns.com/typescript-babel/
	}

	if (cfg.options.javascript.compiler == "flow") {
		presets.push("@babel/preset-flow");
	}

	if (dirname(entry.source).includes("browser")) {
		presets.push([
			"@babel/preset-env",
			{
				targets: cfg.options.javascript.browserTargets
			}
		]);
	} else {
		presets.push([
			"@babel/preset-env",
			{
				targets: {
					node: cfg.options.javascript.nodeVersion
				}
			}
		]);
	}

	try {
		let results: any = transformSync(source, {
			ast: true,
			comments: false,
			filename: fullPath,
			plugins: plugins,
			presets: presets,
			sourceMaps: true
		});
		if (!results) {
			throw new Error("");
		}

		if (process.env.NODE_ENV == "production") {
			// For production use
			let map = join(entry.targetDir, entry.target + ".map");
			if (test("-f", map)) rm(map);
		} else if (
			!dirname(entry.source).includes("browser") &&
			cfg.options.javascript.sourceMapping
		) {
			results.code += `\n//# sourceMappingURL=${basename(entry.target)}.map`;
			FileUtils.writeFile(
				entry.targetDir,
				entry.target + ".map",
				JSON.stringify(results.map),
				false
			);
		}

		FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
		// FileUtils.writeFile(entry.targetDir, entry.target + ".ast", results.ast, false); // object results.ast needs some work before usable
	} catch (err) {
		log.warn(
			`- Failed to compile file: ${entry.source}`,
			Logger.error2string(err)
		);
		return false;
	}

	return true;
}
