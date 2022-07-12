"use strict";
import { join } from "node:path";
import { StringExt } from "../generic/index.mjs";

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
		data.idxBegin = data.idxEnd = result.result?.index;
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
		let bi = new BlockInfo("", "", "");
		bi.idxBegin = 0;
		bi.idxEnd = source.length;
		let re = new RegExp(`${name}[\\s=]*{`, "m");
		let rt = CodeJs.getBlock(source, bi, name, re, "Class");
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
	 * @returns {}
	 */
	static getMethodIndices(source, name, biClass, debug = false) {
		let re = new RegExp(`${name}.*{`, "dgm");
		let rt = CodeJs.getBlock(source, biClass, name, re, "Method");
		if (!debug) rt.stripDebug();
		return rt;
	}
}
