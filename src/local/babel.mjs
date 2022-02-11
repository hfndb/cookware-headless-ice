"use strict";

import { basename, join } from "path";
import shelljs from "shelljs";
import { transformSync } from "@babel/core";
import { AppConfig, Logger } from "../generic/index.mjs";
import { FileUtils } from "../generic/file-system/files.mjs";
import { FileStatus } from "../generic/file-system/diff.mjs";
import { SysUtils } from "../generic/sys.mjs";
const { rm, test } = shelljs;
// https://babeljs.io/docs/en/

/**
 * Compile source file, using the configuration in settings.json
 *
 * @todo Implement Rust version for faster transcompiling like Deno - see /docs/languages.md
 *
 * @param {FileStatus} entry
 * @param {string} source
 * @param {boolean} forBrowser
 * @param {boolean} verbose
 * @returns {string} Empty in case of error, transcompiled source otherwise
 */
export function compileFile(entry, source, forBrowser, verbose = true) {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let fullPath = join(entry.dir, entry.source);
	let plugins = [
		"@babel/plugin-proposal-class-properties",
		"@babel/proposal-object-rest-spread",
	];
	let presets = [];

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
				targets: cfg.options.javascript.browser.targets,
			},
		]);
	} else {
		presets.push([
			"@babel/preset-env",
			{
				targets: {
					node: cfg.options.javascript.nodeVersion,
				},
			},
		]);
	}
	try {
		let results = transformSync(source, {
			ast: true,
			comments: false,
			filename: fullPath,
			plugins: plugins,
			presets: presets,
			sourceMaps: true,
		});
		if (!results) {
			SysUtils.notifyCode("javascript");
			return "";
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
				false,
			);
			if (cfg.options.javascript.ast)
				FileUtils.writeFile(
					entry.targetDir,
					entry.target + ".ast",
					JSON.stringify(results.ast),
					false,
				); // object results.ast needs some work before usable
			// Working with AST, see
			// https://hackernoon.com/babel-your-first-code-transformations-2d1a9a2f3bc4
		}
		FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
		return results.code;
	} catch (err) {
		log.warn(
			`- Failed to compile file: ${entry.source}`,
			Logger.error2string(err),
		);
		return "";
	}
}
