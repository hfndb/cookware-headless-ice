"use strict";
import { join } from "node:path";
import { Logger, StringExt } from "../../generic/index.mjs";

// ---------------------------------------------------
// Some utilities to analyze and edit code
// ---------------------------------------------------

/**
 * Class with results and some debug info
 */
class BlockInfo {
	/**
	 * @param {string} container Name of container (empty or class)
	 * @param {RegExp} re Regular expression
	 * @param {string} searchedFor Optional string for debugging purposes
	 */
	constructor(container, re, searchedFor = "") {
		this.block = "";
		this.container = container;
		this.errors = "";
		this.ignored = "";
		this.idxBegin = -1;
		this.idxEnd = -1;
		this.pBegin = -1;
		this.pEnd = -1;
		this.regex = re;
		this.searchedFor = searchedFor;
	}

	/**
	 * Strip debug info from instance
	 */
	stripDebug() {
		Reflect.deleteProperty(this, "block");
		Reflect.deleteProperty(this, "pBegin");
		Reflect.deleteProperty(this, "pEnd");
		Reflect.deleteProperty(this, "regex");
	}
}

/**
 * Some utility methods to analyze and edit JavaScript code
 */
export class CodeJs {
	static fu = RegExp("[A-Z]"); // Test for initial character. Is upper case?

	/**
	 * Extract info about class with prototype syntax
	 *
	 * @private
	 * @param {string} source
	 * @param {string} [name] Of class
	 * @returns {Object}
	 */
	static getPrototypeInfo(source, cls = "") {
		// First look at prototyped methods to gather class names
		let name,
			method,
			re = new RegExp(`(\\w*).prototype.(\\w*)`, "g"),
			results,
			rt = {};

		while ((results = re.exec(source)) !== null) {
			name = results[1];
			method = results[2];
			if (cls && cls != name) continue; // Ignore class we aren't looking for
			if (!CodeJs.fu.test(name[0])) continue; // Ignore if first letter isn't uppercase

			// Initial contact
			if (!rt[name])
				rt[name] = { idxBegin: -1, idxEnd: source.length, methods: [] };
			// Add method
			rt[name].methods.push([results.index, method]);
			// Index of end class definition
			//rt[name].idxEnd = Math.max(rt[name].idxEnd, results.index);
		}

		// Now look for class definition itself
		let classes = Object.keys(rt);
		for (let i = 0; i < classes.length; i++) {
			name = classes[i];
			re = new RegExp(`\n[\\s\\w]*function ${name}\\(`, "g"); // Style: export function classname(
			results = re.exec(source);
			if (results) {
				// Add index of beginning class definition if found
				rt[name].idxBegin = results.index;
			} else {
				// In case of for example monkey patching... obsolete
				Reflect.deleteProperty(rt, name);
			}
		}

		return rt;
	}

	/**
	 * Get indices of beginning and end of a code block surrounded by parenthesis
	 *
	 * @private
	 * @param {string} source
	 * @param {BlockInfo} bi
	 * @param {string} name Of class, method
	 * @param {RegExp} re Regular expression
	 * @param {string} tp Type of search
	 * @returns {BlockInfo}
	 */
	static getBlock(source, bi, name, re, tp) {
		let block = !bi.idxBegin ? source : source.substring(bi.idxBegin, bi.idxEnd);

		// Search within provided indices
		let data = new BlockInfo(bi.container, re, name);
		let result = data.regex.exec(block);
		if (!result || !result?.index) {
			data.ignored += `${tp} ${name} not found ${
				bi.container ? "in " + bi.container : ""
			}\n`;
			return; // Class or method not found
		}

		// Index for start of class body
		data.idxBegin = data.idxEnd = result?.index;
		// Find index of end of class body
		while (data.idxEnd >= 0) {
			data.idxEnd = block.indexOf("}", data.idxEnd) + 1; // End of some block, perhaps inner
			data.block = block.substring(data.idxBegin, data.idxEnd);
			// How many parenthesis?
			data.pBegin = StringExt.occurrences(data.block, "{");
			data.pEnd = StringExt.occurrences(data.block, "}");
			if (data.pBegin == data.pEnd) break; // Ignoring parenthesis within strings
		}

		// Correct found indices based on provided offset
		data.idxBegin += bi.idxBegin;
		data.idxEnd += bi.idxBegin;

		return data;
	}

	/**
	 * Get indices of beginning and end of a class
	 *
	 * @param {string} source
	 * @param {string} name Of class
	 * @param {boolean} debug
	 * @returns {BlockInfo|null}
	 */
	static getClassIndices(source, name, debug = false) {
		let bi = new BlockInfo("", "", name),
			log = Logger.getInstance(),
			re = new RegExp(`${name}[\\s=]*{`, "m"),
			rt;
		bi.idxBegin = 0;
		bi.idxEnd = source.length;

		try {
			if (!re.test(source)) throw err;
			rt = CodeJs.getBlock(source, bi, name, re, "Class");
			if (!rt) throw new Error();
		} catch {
			// Finding block fails in case of prototype syntax
			let tmp = CodeJs.getPrototypeInfo(source, name);
			if (!tmp[name]) {
				//log.info(`Class ${name} also not found using prototype syntax`);
				return null;
			}
			rt = bi;
			rt.idxBegin = tmp[name].idxBegin;
			rt.idxEnd = tmp[name].idxEnd;
			rt.block = source.substring(rt.idxBegin, rt.idxEnd);
		}

		//if (typeof rt.block != "string")

		let p = rt.block.indexOf("{");
		if (rt.idxBegin > 0 && p > 0) {
			// Strip part untill {
			rt.block = rt.block.substring(p);
			rt.idxBegin += p;
		}
		if (!debug && rt) rt.stripDebug();
		return rt || null;
	}

	/**
	 * Get indices of beginning and end of a method within a class
	 *
	 * @param {string} source
	 * @param {string} name Of class
	 * @param {BlockInfo} biClass
	 * @param {boolean} debug
	 * @returns {BlockInfo}
	 */
	static getMethodIndices(source, name, biClass, debug = false) {
		let re = new RegExp(`${name}.*{`, "dgm");
		let rt = CodeJs.getBlock(source, biClass, name, re, "Method");
		if (!debug) rt.stripDebug();
		return rt;
	}

	/**
	 * Get all classes defined in source - as in src directory
	 *
	 * @param {string} source
	 * @returns {string[]}
	 */
	static getClasses(source) {
		let name,
			re = [
				new RegExp(`class[\\s]*(\\w*)[\\s]*{`, "gm"), // 'Modern' class definition
				new RegExp(`let[\\s]*(\\w*)[\\s=]*{`, "gm"), // Style: let classname = {
			],
			results,
			rt = [];

		for (let i = 0; i < re.length; i++) {
			while ((results = re[i].exec(source)) !== null) {
				name = results[1];
				if (CodeJs.fu.test(name[0])) {
					// Add if first character upper case
					rt.push(name);
				}
			}
		}

		// Another approach for prototype syntax
		let classes = Object.keys(CodeJs.getPrototypeInfo(source));
		rt.push(...classes);

		return rt;
	}

	/**
	 * Get all methods defined in class - as in src directory
	 *
	 * @param {string} source
	 * @param {string} cls Class name
	 * @returns {string[]}
	 */
	static getMethods(source, cls) {
		let biCls,
			collected = [],
			ignore = ["do", "if", "for", "function", "get", "set", "switch", "while"], // loops and statements
			indent, // Indent level
			line,
			name,
			re = [
				//new RegExp(`\n([\\s\\w]*)[\\s]*\\(.*{`, "gm"), // In 'modern' class definition methodname(
				new RegExp(`\n([\\s\\w]*): function`, "gm"), // Style: methodname: function(
			],
			results,
			rt = [],
			skip,
			srcClass;

		// Prototype syntax?
		if (source.includes(`${cls}.prototype`)) {
			biCls = CodeJs.getPrototypeInfo(source, cls);
			results = biCls[cls].methods;
			for (let i = 0; i < results.length; i++) {
				name = results[i][1];
				rt.push(name);
			}
			return rt;
		}

		biCls = CodeJs.getClassIndices(source, cls);
		srcClass = source.substring(biCls.idxBegin, biCls.idxEnd);

		for (let i = 0; i < re.length; i++) {
			while ((results = re[i].exec(srcClass)) !== null) {
				// Strip newline and return codes
				line = results[1].replace(/\r/gm, "").replace(/\n/gm, "");
				name = line.trim();
				skip = name.includes("\r");
				for (let s = 0; s < ignore.length; s++) {
					if (name == ignore[s]) skip = true;
				}
				if (skip) continue;

				collected.push([i, line.trimEnd().length - name.length, name]); // Incl. indent level
			}
		}

		// Which indent level is relevant?
		indent = collected.reduce((acc, current) => {
			if (acc == -1 && current[1] == 0) return acc; // Ignore indent level 0
			if (acc > 0 && current[1] > acc) return acc; // Ignore deeper level than found
			return current[1]; // Found relevant level
		}, -1);

		for (let i = 0; i < collected.length; i++) {
			if (collected[i][1] != indent) continue;
			name = collected[i][2];
			rt.push(name);
		}

		return rt;
	}
}
