import { join } from "path";
import { test } from "shelljs";
import { AppConfig } from "./config";
import { FileUtils } from "./files";
import { Logger } from "./log";
const nunjucks = require("nunjucks");

interface readOptions {
	debug?: boolean;
	inclIncludes?: boolean;
	stripFoundTags?: boolean;
}

/**
 * Structure for items in cache. Parent, template and includes filled with arrays [dir, file]
 */
class CacheItem {
	blocks: any[] = [];
	changedExtends: string = "";
	includes: any[] = [];
	lastModified: number = 0;
	extends: any[] = [];
	rawData: string = "";
	stripFoundTags: boolean;
	template: any[];
	variables: any[] = [];

	constructor(dir: string, file: string, stripFoundTags: boolean) {
		this.template = [dir, file];
		this.rawData = FileUtils.readFile(join(dir, file));
		this.stripFoundTags = stripFoundTags;
	}
}

/**
 * Class to analyze or gather info for a template file
 */
export class NunjucksUtils {
	cache: CacheItem[] = [];
	debug: boolean = false;

	/**
	 * Sets a template (extends)
	 */
	static setExtends(
		template: string,
		trimBegin: boolean = false,
		trimEnd: boolean = false
	): string {
		return `{%${trimBegin ? "- " : ""} extends "${template}" ${
			trimEnd ? " -" : ""
		}%}\n`;
	}

	/**
	 * Sets a template variable
	 *
	 * @param string type Can be boolean,  number, object, string
	 */
	static setVariable(
		name: string,
		value: any,
		type: string,
		trimBegin: boolean = false,
		trimEnd: boolean = false
	): string {
		switch (type) {
			case "boolean":
				value = value ? "true" : "false";
				break;

			case "number":
				break;

			case "object":
				value = JSON.stringify(value, null, "\t");
				break;

			case "string":
				value = `"${value}"`;
				break;

			default:
				console.log(
					`Unknown type ${type} for variable ${name} received in NunjucksUtils.setVariable()`
				);
				break;
		}
		return `{% set${trimBegin ? "- " : ""} ${name} = ${value} ${
			trimEnd ? " -" : ""
		}%}\n`;
	}

	/**
	 * Sets a template block
	 */
	static setBlock(
		name: string,
		value: string,
		trimBegin: boolean = false,
		trimEnd: boolean = false,
		closingTrimBegin: boolean = false,
		closingTrimEnd: boolean = false
	): string {
		return `{%${trimBegin ? "- " : ""} block ${name} ${trimEnd ? " -" : ""}%}
${value}
{%${closingTrimBegin ? "- " : ""} endblock ${closingTrimEnd ? " -" : ""}%}\n`;
	}

	/**
	 * @private
	 */
	static getEnvironment(searchPaths: string[]): any {
		let cfg = AppConfig.getInstance();
		let env = nunjucks.configure(
			searchPaths[0],
			cfg.options.dependencies.nunjucks.config
		);
		for (let i = 1; i < searchPaths.length; i++) {
			env.loaders[0].searchPaths.push(searchPaths[i]);
		}
		return env;
	}

	/**
	 * @private
	 */
	static getSearchPaths(): string[] {
		let cfg = AppConfig.getInstance();
		let searchPaths: string[] = [];

		for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
			searchPaths.push(join(cfg.dirProject, cfg.options.html.dirs.templates[i]));
		}

		for (let i = 0; i < cfg.options.html.dirs.includes.length; i++) {
			searchPaths.push(join(cfg.dirProject, cfg.options.html.dirs.includes[i]));
		}

		return searchPaths;
	}

	/**
	 * Sets item.extends
	 *
	 * @private
	 */
	static readExtends(item: CacheItem, searchPaths: string[]): void {
		let log = Logger.getInstance();
		let regex = new RegExp('{%([-\\s]+)extends\\s*"(.*)"([-\\s]+)%}', "gim"); // Global, case insensitive, multiline
		let result: string[] = regex.exec(item.rawData) || [];
		let found = result.length > 0;
		while (found) {
			let exists = false;
			// result: idx 0 full string, 1 "-" or empty string, 2 file name, 3 "-" or empty string
			let fname = result[2];
			for (let i = 0; i < searchPaths.length; i++) {
				if (test("-f", join(searchPaths[i], fname))) {
					exists = true;
					item.extends = [searchPaths[i], fname];
					break;
				}
			}
			if (!exists) {
				log.warn(`File ${item.template[1]} extends non-existing file ${fname}`);
			}
			result = regex.exec(item.rawData) || [];
			found = result.length > 0;
		}

		if (item.stripFoundTags) {
			item.rawData = item.rawData.replace(regex, "").trim();
		}
	}

	/**
	 * <p>
	 *   Adds arrays to item.includes[] with elements:<br>
	 *   - 0 include name<br>
	 *   - 1 include file name<br>
	 *   - 2 time stamp last modified
	 * </p>
	 *
	 * @private
	 */
	static readIncludes(item: CacheItem, searchPaths: string[]): void {
		let log = Logger.getInstance();
		let regex = new RegExp('{%([-\\s]+)include\\s*"(.*)"([-\\s]+)%}', "gim"); // Global, case insensitive, multiline
		let result: string[] = regex.exec(item.rawData) || [];
		let found = result.length > 0;
		while (found) {
			let exists = false;
			// result:
			// 0 full string
			// 1 "-" or empty string
			// 2 file name
			// 3 "-" or empty string
			let fname = result[2];
			for (let i = 0; i < searchPaths.length; i++) {
				if (!test("-f", join(searchPaths[i], fname))) continue;
				exists = true;
				let lm = FileUtils.getLastModified(searchPaths[i], fname);
				// Assuming include doesn't extend any other template
				item.includes.push([searchPaths[i], fname, lm]);
				break;
			}
			if (!exists) {
				log.warn(`File ${item.template[1]} contains non-existing include ${fname}`);
			}
			result = regex.exec(item.rawData) || [];
			found = result.length > 0;
		}

		if (item.stripFoundTags) {
			item.rawData = item.rawData.replace(regex, "").trim();
		}
	}

	/**
	 * <p>
	 *   Adds arrays to item.blocks[] with elements:<br>
	 *   - 0 block name<br>
	 *   - 1 block content<br>
	 *   - 2 trimming while opening {%- block blockname %}
	 *   - 3 trimming while closing {% block blockname -%}
	 *   - 4 trimming while opening {%- endblock %}
	 *   - 5 trimming while closing {% endblock -%}
	 * </p>
	 *
	 * @private
	 */
	static readBlocks(item: CacheItem): void {
		let regex = new RegExp(
			"{%([-\\s]+)block\\s*(\\w*?)([-\\s]+)%}([^]*?){%([-\\s]+)endblock\\s*([-\\s]+)%}",
			"gim"
		);
		// Global, case insensitive, multiline
		let result: string[] = regex.exec(item.rawData) || [];
		let found = result.length > 0;
		while (found) {
			// result:
			// 0 full string
			// 1 "-" or empty string (start block, trimming begin)
			// 2 block name
			// 3 "-" or empty string  (start block, trimming end)
			// 4 block content - with a leading and trailing \n
			// 5 "-" or empty string (end block, trimming begin)
			// 6 "-" or empty string (end block, trimming end)

			item.blocks.push([
				result[2],
				result[4].trim(),
				result[1].trim().length > 0,
				result[3].trim().length > 0,
				result[5].trim().length > 0,
				result[6].trim().length > 0
			]);
			result = regex.exec(item.rawData) || [];
			found = result.length > 0;
		}

		if (item.stripFoundTags) {
			item.rawData = item.rawData.replace(regex, "").trim();
		}
	}

	/**
	 * <p>
	 *   Adds arrays to item.variables[] with elements:<br>
	 *   - 0 variable name<br>
	 *   - 1 variable value<br>
	 *   - 2 trimming while opening {%- set varname = varvalue %}
	 *   - 3 trimming while closing {% set varname = varvalue -%}
	 * </p>
	 *
	 * @private
	 */
	static readVariables(item: CacheItem): void {
		let regex = new RegExp(
			"{%([-\\s]+)set\\s*(\\w*?)\\s*=\\s*([^]*?)([-\\s]+)%}",
			"gim"
		); // Global, case insensitive, multiline
		// https://stackoverflow.com/questions/1979884/how-to-use-javascript-regex-over-multiple-lines
		// https://stackoverflow.com/questions/1387116/matching-multiline-patterns
		let result: string[] = regex.exec(item.rawData) || [];
		let found = result.length > 0;
		while (found) {
			// result:
			// 0 full string
			// 1 "-" or empty string (trimming)
			// 2 variable name
			// 3 variable value
			// 4 "-" or empty string (trimming)
			let val =
				result[3].substr(0, 1) == "{" ? JSON.parse(result[3]) : eval(result[3]);
			item.variables.push([
				result[2],
				val,
				result[1].trim().length > 0,
				result[4].trim().length > 0
			]);
			result = regex.exec(item.rawData) || [];
			found = result.length > 0;
		}

		if (item.stripFoundTags) {
			item.rawData = item.rawData.replace(regex, "").trim();
		}
	}

	/**
	 * Render a content file to a string
	 */
	static renderFile(
		dir: string,
		file: string,
		context: Object,
		templateDir: string
	): string {
		let log = Logger.getInstance();
		let searchPaths: string[] = [];
		if (templateDir) searchPaths.push(templateDir);
		searchPaths = searchPaths.concat(NunjucksUtils.getSearchPaths());

		try {
			let env = NunjucksUtils.getEnvironment(searchPaths);
			NunjucksUtils.addGlobalFunctions(env);

			let data = FileUtils.readFile(join(dir, file));
			return nunjucks.renderString(data, context);
		} catch (err) {
			log.warn(`- Failed to render file ${file}`, Logger.error2string(err));
			return "";
		}
	}

	/**
	 * Add a bunch of convenience function to Nunjucks environment
	 */
	static addGlobalFunctions(env: any): void {
		// To dump all vars in template
		env.globals["getVars"] = function() {
			return this.getVariables();
		};

		// To pretty print a variable
		env.globals["pprint"] = function(arg) {
			return JSON.stringify(arg, null, "    ");
		};

		// To test for string type
		env.globals["isString"] = function(arg) {
			return typeof arg == "string";
		};
	}

	/**
	 * Get index of file in cache. If not in cache yet... cache the file
	 */
	getCacheIdx(
		dir: string,
		file: string,
		readIncludes: boolean = false,
		stripFoundTags: boolean = false
	): number {
		for (let i = 0; i < this.cache.length; i++) {
			if (this.cache[i].template[1] == file) {
				return i;
			}
		}

		let item = new CacheItem(dir, file, stripFoundTags);
		let searchPaths = NunjucksUtils.getSearchPaths();

		NunjucksUtils.readExtends(item, searchPaths);
		if (readIncludes) NunjucksUtils.readIncludes(item, searchPaths);

		this.cache.push(item);

		return this.cache.length - 1;
	}

	/**
	 * See if a template file needs an update
	 */
	isChanged(dir: string, file: string, lastModified?: number): boolean {
		let log = Logger.getInstance();
		let changed = false;

		if (!lastModified) {
			lastModified = FileUtils.getLastModified(dir, file);
		}

		let idx = this.getCacheIdx(dir, file, true);
		let item = this.cache[idx];
		item.lastModified = FileUtils.getLastModified(dir, file);

		while (!changed && item.extends[1]) {
			// Current item
			if (item.lastModified > lastModified) {
				this.cache[idx].changedExtends = item.template[1];
				changed = true; // Parent has changed after requested template
				break;
			}

			// Used includes
			for (let i = 0; !changed && i < item.includes.length; i++) {
				if (item.includes[i][2] > lastModified) {
					this.cache[idx].changedExtends = item.includes[i][1];
					changed = true; // Some include has changed after requested template
					break;
				}
			}

			// Go to parent
			if (!changed) {
				let i = this.getCacheIdx(item.extends[0], item.extends[1]);
				item = this.cache[i];
			}
		}

		if (changed && this.debug) {
			let tmp = Object.assign({}, item);
			// @ts-ignore
			delete tmp.rawData;
			log.info(`Info collected about changed file ${file}: `, tmp);
		}

		return changed;
	}

	/**
	 * Retrieve parent, variables and blocks from file
	 */
	getUserData(dir: string, file: string, opts?: readOptions): CacheItem {
		// Defaults
		if (opts == undefined) opts = {};
		if (opts.debug != undefined) this.debug = opts.debug;
		if (opts.inclIncludes == undefined) opts.inclIncludes = false;
		if (opts.stripFoundTags == undefined) opts.stripFoundTags = false;

		let log = Logger.getInstance();
		let idx = this.getCacheIdx(dir, file, opts.inclIncludes, opts.stripFoundTags);
		let item = this.cache[idx];

		NunjucksUtils.readBlocks(item);
		NunjucksUtils.readVariables(item);

		let tmp = Object.assign({}, item);
		if (!opts.stripFoundTags) {
			// @ts-ignore
			delete tmp.rawData;
		}

		if (this.debug) {
			log.info("User data", tmp);
		}

		return tmp;
	}
}

/*

Test: see nunjucks-test.ts

For playground:

import { join } from "path";
import { AppConfig, Logger } from "../lib";
import { NunjucksUtils } from "../lib/nunjucks";

	let contentDir = join(cfg.dirProject, cfg.options.html.dirs.content, "test-pages/nunjucks");
	let nj = new NunjucksUtils();
	nj.debug = true;
	let files = [
		"index.html"
	];

	// Put test templates in search path
	cfg.options.html.dirs.templates = [
		join(cfg.options.html.dirs.content, "test-pages/nunjucks")
	].concat(cfg.options.html.dirs.templates);

	if (!nj.isChanged(contentDir, files[0])) {
		log.info(`No changes for file ${files[0]}`);
	}

	let result = nj.getUserData(contentDir, files[0]);

*/
