import { join } from "path";
import shelljs from "shelljs";
import { AppConfig } from "./config.mjs";
import { FileUtils } from "./files.mjs";
import { Logger } from "./log.mjs";
import nunjucks from "nunjucks";
const { test } = shelljs;

// ----------------------------------------------------------------------------------
// Section: Internal
// ----------------------------------------------------------------------------------

/**
 * Structure for items in cache. Parent, template and includes filled with arrays [dir, file]
 */
class CacheItem {
	constructor(dir, file, stripFoundTags) {
		this.blocks = [];
		this.changedExtends = "";
		this.includes = [];
		this.lastModified = 0;
		this.extends = [];
		this.rawData = "";
		this.variables = [];
		this.template = [dir, file];
		this.rawData = FileUtils.readFile(join(dir, file));
		this.stripFoundTags = stripFoundTags;
	}
}

/**
 * Structure for options passed to an instance
 */
class NjOpts {
	constructor(opts) {
		if (!opts) opts = {};
		this.opts = {
			checkTemplate: opts.checkTemplate || true,
			debug: opts.debug || false,
			inclIncludes: opts.inclIncludes || false,
			readBlocks: opts.readBlocks || true,
			readVariables: opts.readVariables || true,
			stripFoundTags: opts.stripFoundTags || false,
		};
	}
}

/**
 * Class to analyze or gather info for a template file
 */
export class NunjucksUtils {
	// ----------------------------------------------
	// Section: Basic Nunjucks usage
	// ----------------------------------------------

	/**
	 * @property {CacheItem[]}
	 */
	cache = [];

	/**
	 * @property {NjOpts}
	 */
	opts;

	/**
	 * @property {string[]}
	 */
	searchPaths = [];

	constructor(opts) {
		this.opts = new NjOpts(opts);
	}

	/**
	 * Set search paths for templates and perhaps add one path to the beginning
	 *
	 * @param {string} [templateDir]
	 */
	setSearchPaths(templateDir) {
		let cfg = AppConfig.getInstance();
		for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
			this.searchPaths.push(
				join(cfg.dirProject, cfg.options.html.dirs.templates[i]),
			);
		}
		for (let i = 0; i < cfg.options.html.dirs.includes.length; i++) {
			this.searchPaths.push(
				join(cfg.dirProject, cfg.options.html.dirs.includes[i]),
			);
		}
	}

	/**
	 * @private
	 */
	getEnvironment() {
		let cfg = AppConfig.getInstance();
		let env = nunjucks.configure(
			this.searchPaths[0],
			cfg.options.dependencies.nunjucks.config,
		);
		for (let i = 1; i < this.searchPaths.length; i++) {
			env.loaders[0].searchPaths.push(this.searchPaths[i]);
		}

		NunjucksUtils.addGlobalFunctions(env);

		return env;
	}

	/**
	 * Add a bunch of convenience function to Nunjucks environment
	 */
	static addGlobalFunctions(env) {
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
	 * Render a content file to a string
	 */
	renderFile(dir, file, context) {
		try {
			let env = this.getEnvironment();
			let data = FileUtils.readFile(join(dir, file));
			return nunjucks.renderString(data, context);
		} catch (err) {
			let log = Logger.getInstance();
			log.warn(`- Failed to render file ${file}`, Logger.error2string(err));
			return "";
		}
	}

	// ----------------------------------------------
	// Section: Advanced Nunjucks usage
	// ----------------------------------------------

	/**
	 * Add an array of search paths for templates
	 *
	 * @param {string[]} paths
	 */
	addSearchPaths(paths) {
		for (let i = 0; i < paths.length; i++) {
			this.searchPaths.push(paths[i]);
		}
	}

	/**
	 * Get index of file in cache. If not in cache yet... cache the file
	 */
	getCacheIdx(dir, file) {
		for (let i = 0; i < this.cache.length; i++) {
			if (this.cache[i].template[1] == file) return i; // Found
		}

		// Not in cache yet
		let item = new CacheItem(dir, file, this.opts.stripFoundTags);
		NunjucksUtils.readExtends(item, this.searchPaths, this.opts.checkTemplate);
		if (this.opts.inclIncludes)
			NunjucksUtils.readIncludes(item, this.searchPaths);
		this.cache.push(item);
		return this.cache.length - 1;
	}

	/**
	 * See if a template file needs an update
	 */
	isChanged(dir, file, lastModified) {
		let changed = false;
		let idx = this.getCacheIdx(dir, file, true);
		let item = this.cache[idx];
		if (!lastModified) {
			lastModified = FileUtils.getLastModified(dir, file);
		}
		item.lastModified = lastModified;

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
			Reflect.deleteProperty(tmp, "rawData");
			let log = Logger.getInstance();
			log.info(`Info collected about changed file ${file}: `, tmp);
		}

		return changed;
	}

	/**
	 * Reads from content in item.rawData, sets variable item.extends
	 */
	static readExtends(item, searchPaths, checkExtends = true) {
		let log = Logger.getInstance();
		// Global, case insensitive, multiline
		let regex = new RegExp('{%([-\\s]+)extends\\s*"(.*)"([-\\s]+)%}', "gim");
		let result = regex.exec(item.rawData) || null;
		// result: idx 0 full string, 1 "-" or empty string, 2 file name, 3 "-" or empty string
		if (result == null) {
			//log.warn(`File ${item.template[1]} doesn't contain an extends tag`);
			return;
		}
		let exists = false;
		let fname = result[2];
		for (let i = 0; checkExtends && i < searchPaths.length; i++) {
			if (test("-f", join(searchPaths[i], fname))) {
				exists = true;
				item.extends = [searchPaths[i], fname];
				break;
			}
		}
		if (checkExtends) {
			if (!exists)
				log.warn(`File ${item.template[1]} extends non-existing file ${fname}`);
		} else {
			item.extends = ["", fname];
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
	 */
	static readIncludes(item, searchPaths) {
		// Global, case insensitive, multiline
		let regex = new RegExp('{%([-\\s]+)include\\s*"(.*)"([-\\s]+)%}', "gim");
		let result = regex.exec(item.rawData) || [];
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
	static readBlocks(item) {
		let regex = new RegExp(
			"{%([-\\s]+)block\\s*(\\w*?)([-\\s]+)%}([^]*?){%([-\\s]+)endblock\\s*([-\\s]+)%}",
			"gim",
		);
		// Global, case insensitive, multiline
		let result = regex.exec(item.rawData) || [];
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
				result[6].trim().length > 0,
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
	static readVariables(item) {
		let regex = new RegExp(
			"{%([-\\s]+)set\\s*(\\w*?)\\s*=\\s*([^]*?)([-\\s]+)%}",
			"gim",
		); // Global, case insensitive, multiline
		// https://stackoverflow.com/questions/1979884/how-to-use-javascript-regex-over-multiple-lines
		// https://stackoverflow.com/questions/1387116/matching-multiline-patterns
		let result = regex.exec(item.rawData) || [];
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
				result[4].trim().length > 0,
			]);
			result = regex.exec(item.rawData) || [];
			found = result.length > 0;
		}
		if (item.stripFoundTags) {
			item.rawData = item.rawData.replace(regex, "").trim();
		}
	}

	/**
	 * Retrieve parent, variables and blocks from file
	 */
	getUserData(dir, file) {
		let idx = this.getCacheIdx(dir, file);
		let item = this.cache[idx];
		if (this.opts.readBlocks) NunjucksUtils.readBlocks(item);
		if (this.opts.readVariables) NunjucksUtils.readVariables(item);

		let tmp = Object.assign({}, item);
		if (!this.opts.stripFoundTags) {
			Reflect.deleteProperty(tmp, "rawData");
		}
		if (this.opts.debug) {
			let log = Logger.getInstance();
			log.info("User data", tmp);
		}
		return tmp;
	}

	/**
	 * Get tag for extends
	 */
	static getTagExtends(template, trimBegin = false, trimEnd = false) {
		return `{%${trimBegin ? "- " : ""} extends "${template}" ${
			trimEnd ? " -" : ""
		}%}\n`;
	}

	/**
	 * Get tag for a template variable
	 *
	 * @param string type Can be boolean,  number, object, string
	 */
	static getTagVariable(name, value, type, trimBegin = false, trimEnd = false) {
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
					`Unknown type ${type} for variable ${name} received in NunjucksUtils.setVariable()`,
				);
				break;
		}
		return `{% set${trimBegin ? "- " : ""} ${name} = ${value} ${
			trimEnd ? " -" : ""
		}%}\n`;
	}

	/**
	 * Get tag for a template a template block
	 */
	static getTagBlock(
		name,
		value,
		trimBegin = false,
		trimEnd = false,
		closingTrimBegin = false,
		closingTrimEnd = false,
	) {
		return `{%${trimBegin ? "- " : ""} block ${name} ${trimEnd ? " -" : ""}%}
${value}
{%${closingTrimBegin ? "- " : ""} endblock ${closingTrimEnd ? " -" : ""}%}\n`;
	}
}
