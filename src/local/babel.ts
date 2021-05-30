import { basename, dirname, join } from "path";
import { exec, rm, test } from "shelljs";
import { transformSync } from "@babel/core";
import { getChangeList, AppConfig, FileStatus, Logger } from "../lib";
import { Beautify } from "../lib/beautify";
import { FileUtils, removeObsolete } from "../lib/files";
import { ProcessingTypes, SessionVars } from "../sys/session";
import { stripJs, Shrinker, Stripper } from "../lib/stripping";
import { SysUtils } from "../lib/sys";
import { JavascriptUtils } from "./javascript";
import { Tags } from "./tags";

// https://babeljs.io/docs/en/

/**
 * Compile changed or new files, create browser bundles
 */
export function compile(verbose: boolean): void {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let outDir = JavascriptUtils.getOutputDir();
	let processed: string[] = [];
	let saydHello = false;
	let session = SessionVars.getInstance();
	let sourceExt =
		cfg.options.javascript.compiler == ProcessingTypes.typescript ? ".ts" : ".js";

	let path = join(cfg.dirProject, cfg.options.javascript.dirs.source);
	if (!test("-e", path)) {
		log.warn(
			`Path ./${cfg.options.javascript.dirs.source} doesn't exist. Request to compile ignored`
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
		Tags.forProject(cfg.options.javascript.dirs.source);
		changeList.forEach((entry: FileStatus) => {
			if (entry.isNewOrModified()) {
				Tags.forFile(join(cfg.options.javascript.dirs.source, entry.source));
			}
		});
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
	let forBrowser = dirname(entry.source).includes("browser");
	let fullPath = join(entry.dir, entry.source);
	let plugins: any[] = [
		"@babel/plugin-proposal-class-properties",
		"@babel/proposal-object-rest-spread"
	];
	let presets: any[] = [];
	let source = FileUtils.readFile(fullPath);

	if (cfg.options.server.beautify.includes("src")) {
		source = Beautify.content(entry.source, source);
		if (!source) {
			return false;
		}

		FileUtils.writeFile(entry.dir, entry.source, source, false);

		// In case file is browser related and removeImports is set to true...
		if (forBrowser && cfg.options.javascript.browser.removeImports) {
			// Code editor is satisfied so far, but compiled file doesn't need imports
			source = Stripper.stripImports(source);
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

	if (
		process.env.NODE_ENV != "production" &&
		!forBrowser &&
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

	if (forBrowser) {
		presets.push([
			"@babel/preset-env",
			{
				targets: cfg.options.javascript.browser.targets
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
			let fl = join(entry.targetDir, entry.target + ".ast");
			if (test("-f", fl)) rm(fl);
			fl = join(entry.targetDir, entry.target + ".map");
			if (test("-f", fl)) rm(fl);
		} else if (cfg.options.javascript.sourceMapping && !forBrowser) {
			results.code += `\n//# sourceMappingURL=${basename(entry.target)}.map`;
			FileUtils.writeFile(
				entry.targetDir,
				entry.target + ".map",
				JSON.stringify(results.map),
				false
			);
			if (cfg.options.javascript.ast)
				FileUtils.writeFile(
					entry.targetDir,
					entry.target + ".ast",
					JSON.stringify(results.ast),
					false
				); // object results.ast needs some work before usable
			// Working with AST, see
			// https://hackernoon.com/babel-your-first-code-transformations-2d1a9a2f3bc4
		}

		FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
		if (forBrowser && cfg.options.stripping.auto) {
			let toWrite = stripJs(results.code);
			let file = FileUtils.getSuffixedFile(
				entry.target,
				cfg.options.stripping.suffix
			);
			let shr = new Shrinker();
			toWrite = shr.shrinkFile(toWrite, false);
			FileUtils.writeFile(entry.targetDir, file, toWrite, false);
		}
	} catch (err) {
		log.warn(
			`- Failed to compile file: ${entry.source}`,
			Logger.error2string(err)
		);
		return false;
	}

	return true;
}
