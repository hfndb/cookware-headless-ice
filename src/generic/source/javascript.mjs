"use strict";
import { join } from "node:path";
import { StringExt } from "../../generic/index.mjs";

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
	 * @todo Prototype syntax
	 */
	static getClassIndices(source, name, debug = false) {
		let bi = new BlockInfo("", "", "");
		bi.idxBegin = 0;
		bi.idxEnd = source.length;
		let re = new RegExp(`${name}[\\s=]*{`, "m");
		let rt = CodeJs.getBlock(source, bi, name, re, "Class");
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
		let fu = RegExp("[A-Z]"), // Is upper case?
			name,
			re = [
				new RegExp(`class[\\s]*(\\w*)[\\s]*{`, "gm"), // 'Modern' class definition
				new RegExp(`let[\\s]*(\\w*)[\\s=]*{`, "gm"), // Style: let classname = {
			],
			results,
			rt = [];

		for (let i = 0; i < re.length; i++) {
			while ((results = re[i].exec(source)) !== null) {
				name = results[1];
				if (fu.test(name[0])) rt.push(name); // Add if first character upper case
			}
		}

		return rt;
	}

	/**
	 * Get all methods defined in class - as in src directory
	 *
	 * @param {string} source
	 * @param {string} cls Class name
	 */
	static getMethods(source, cls) {
		let biCls = CodeJs.getClassIndices(source, cls),
			collected = [],
			ignore = ["do", "if", "for", "function", "get", "set", "switch", "while"], // loops and statements
			indent, // Indent level
			line,
			name,
			re = [
				//new RegExp(`\n([\\s\\w]*)[\\s]*\\(.*{`, "gm"), // In 'modern' class definition methodname(
				new RegExp(`\n([\\s\\w]*): function[\\s]*\.*{`, "gm"), // Style: methodname: function(
			],
			results,
			rt = {},
			skip;

		let srcClass = source.substring(biCls.idxBegin, biCls.idxEnd);
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
			rt[name] = [];
		}

		return rt;
	}
}
