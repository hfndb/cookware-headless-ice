"use strict";
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "./index.mjs";
import { StringExt } from "./utils.mjs";
import { test } from "./sys.mjs";

// ----------------------------------------------------
// Section: For internal usage
// ----------------------------------------------------

/**
 * Carefully deal with the content of CSS selectors with rule sets,
 * while processing output of the Dart Sass transcompiler.
 *
 * This needs specific attention, to not mess up selectors and
 * property declarations with values using filter() and url().
 */
class CssRuleSet {
	canContinue = false;

	/**
	 * @private
	 */
	ruleNr = 0;

	/**
	 * @private
	 */
	isFirst = true;

	/**
	 * @private
	 */
	needsRemainder = false;
	/**
	 * @private
	 * Status:
	 * - 0 Beginning of selector
	 * - 1 Somewhere in selector
	 * - 2 Within rule set
	 */
	status = 0;

	/**
	 * @private
	 * @param {string} line
	 * @param {boolean} prefixSpaceAdded
	 */
	inSelector(line, prefixSpaceAdded) {
		this.canContinue = false;
		let last = line.endsWith("{");
		if (!prefixSpaceAdded) {
			// Don't mess up selectors, preserve space between 'em
			line = " " + line;
		}
		if (last) {
			this.status = 2;
		}
		this.canContinue = true;

		return line;
	}

	/**
	 * @private
	 * @param {string} line
	 */
	inRuleSet(line) {
		this.canContinue = true;
		let last = line.endsWith("}");

		// Remove space after 1st : between property and property value
		line = line.replace(": ", ":"); // Will only replace first occurence

		if (last) {
			// End of rule sets
			this.canContinue = false;
			this.ruleNr++;
			this.status = 0;
			return line;
		}

		return line;
	}

	/**
	 * @param {string} line
	 * @returns {string} for line
	 */
	processLine(line) {
		let prefixSpaceAdded = false;

		// At the beginning of a selector
		if (this.status == 0) {
			// Space as prefix, necessary?
			if (!this.isFirst) {
				line = " " + line;
				prefixSpaceAdded = true;
			}
			if (this.isFirst) this.isFirst = false;
			this.status = 1;
		}

		switch (this.status) {
			case 1:
				line = this.inSelector(line, prefixSpaceAdded);
				break;
			case 2:
				line = this.inRuleSet(line);
				break;
		}

		return line;
	}
}

// ----------------------------------------------------
// Section: Exported
// ----------------------------------------------------

/**
 * Compact an already rendered or transcompiled file.
 * Known as file compression, minifying, to reduce bytes to send to browser.
 *
 * What this really is?
 * - Merging all lines into 1 line.
 * - Removing hiearchy (code indenting)
 * - Removing spaces as in space needed to think about what's next
 */
export class Stripper {
	/**
	 * @param {string} ft File type; css, html or js
	 * @param {string[]} [after] List of commands which needs space after them
	 * @param {string[]} [around] Dito but around
	 * @param {string[]} [before[]] Dito but before
	 */
	constructor(ft, after, around, before) {
		this.fileType = ft;
		this.after = after || [];
		this.around = around || [];
		this.before = before || [];

		this.cm = {
			sl: /\s\/\/\s(.)+/, // Single line comment starts with
			mss: "/*", // Multi line comment starts with
			mse: "*/", // Multi line comment end with
		};
		// For css and js the same.
		// Html ignored since comments should be filtered out by template engine
	}

	/** Remove comments, leave line numbering as is
	 * @param {string} src File type js
	 */
	removeComments(src) {
		let mlnComment = false, // Is in multi line comment
			lines = src.split(/\r?\n/),
			result,
			toReturn = "";

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();

			// Handle single line comments
			result = this.cm.sl.exec(line) || null;
			if (result) {
				// Strip single line comment
				line = line.substring(0, result.index).trim();
			}

			// Handle multi line comments
			if (line.startsWith(this.cm.mss)) {
				if (!line.endsWith(this.cm.mse)) mlnComment = true;
				line = "";
			}
			if (mlnComment) {
				if (line.endsWith(this.cm.mse)) mlnComment = false;
				line = "";
			}
			toReturn += line + "\n";
		}
		return toReturn;
	}

	/**
	 * @param {string} src File type; css, html or js
	 * @todo Bug in Array.split() within Node.js, affecting CSS stripping
	 */
	stripFile(src) {
		let crs = this.fileType == "css" ? new CssRuleSet() : null,
			mlnComment = false, // Is in multi line comment
			mlnTemplate = 0, // Status of multi line templates in js
			lines = src.split(/\r?\n/),
			result,
			toReturn = "";

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();

			if (i == 0) {
				// First line with charset
				toReturn += line;
				continue;
			}
			if (!line) continue; // Empty line

			// Strip single line comment
			result = this.cm.sl.exec(line) || null;
			if (result) {
				line = line.substring(0, result.index).trim();
			}

			// Handle multi line comments
			if (line.startsWith(this.cm.mss)) {
				if (!line.endsWith(this.cm.mse)) mlnComment = true;
				continue;
			}
			if (mlnComment) {
				if (line.endsWith(this.cm.mse)) mlnComment = false;
				continue;
			}

			// Make sure that there's a space between rule sets
			// and only what's WITHIN a rule sets is stripped
			if (crs) {
				line = crs.processLine(line);
				if (crs.canContinue) {
					toReturn += line;
					continue;
				}
			}

			// Handle multiline string templates in JavaScript
			if (
				this.fileType == "js" &&
				!mlnTemplate &&
				line.includes("`") &&
				StringExt.occurrences(line, "`") == 1
			) {
				// Comment indicating that a multiline string template begins @ next line
				mlnTemplate = 1;
				continue;
			} else if (mlnTemplate == 1) {
				mlnTemplate = 2; // Begin, skip
				continue;
			} else if (mlnTemplate == 2) {
				toReturn += line + "\n"; // Within multiline string temlate
				if (line.includes("`")) mlnTemplate = 0; // End
				continue;
			}
			if (this.fileType == "html") {
				if (!line.endsWith(">")) line += " ";
			} else {
				line = this.stripLine(line);
			}
			toReturn += line;
		}
		return toReturn;
	}

	/**
	 * Strip empty space within a line
	 *
	 * @param {string} line
	 * @todo Still needs to be improved further
	 */
	stripLine(line) {
		// In view of comments, can't use string.split() here
		let lastIdx = -1,
			idx = line.indexOf(" ", lastIdx) + 1, // including trailing space
			keyword,
			preserve,
			strPart1,
			strPart2;
		while (idx >= 0 && idx > lastIdx) {
			strPart1 = line.substring(0, idx).trimRight();
			strPart2 = line.substring(idx).trimLeft();
			[keyword, preserve] = this.preserveSpace(strPart1);
			if (preserve == 2) {
				// Add space before keyword
				strPart1 = strPart1.substring(0, idx - keyword.length - 2) + " " + keyword;
			}
			if (this.isInString(strPart1) || preserve > 0) {
				// Add space after keyword
				strPart1 += " ";
			}
			lastIdx = idx;
			idx = line.indexOf(" ", lastIdx) + 1;
		}
		return line;
	}

	/**
	 * Check whether space is within encapculated string
	 *
	 * @param {string} str
	 * @todo Within template string, escaped double quotes also count. Fix.
	 */
	isInString(str) {
		let sq = StringExt.occurrences(str, "'"); // single quotes
		let dq = StringExt.occurrences(str, '"'); // double quotes
		let cm = StringExt.occurrences(str, "/"); // comment like /* */
		return sq % 2 != 0 || dq % 2 != 0 || cm % 2 != 0;
	}

	/**
	 * Check wether spaces is to be preserved based on defined keywords
	 *
	 * @private
	 * @param {string} part
	 */
	preserveSpace(part) {
		let rt;
		for (let i = 0; i < this.after.length && !rt; i++) {
			if (part.endsWith(this.after[i])) {
				rt = [this.after[i], 1];
			}
		}
		for (let i = 0; i < this.around.length && !rt; i++) {
			if (part.endsWith(this.around[i])) {
				rt = [this.around[i], 2];
			}
		}
		return rt || ["", 0];
	}

	/**
	 * Remove imports at the top of a source file.
	 * While doing so, also strip exports.
	 *
	 * @param {string} src
	 */
	static stripImports(src) {
		let lines = src.split("\n");
		for (let i = 0; i < lines.length; i++) {
			// Strip import statement
			if (lines[i].startsWith("import")) {
				lines[i] = ""; // Don't desorientate sourcemap
			}
			// If import statements are obsolete, then exports too
			if (lines[i].startsWith("exports.")) {
				lines[i] = ""; // Don't desorientate sourcemap
			} else if (lines[i].startsWith("export ")) {
				lines[i] = lines[i].replace("export ", "");
			}
		}
		return lines.join("\n");
	}

	/**
	 * @param {string} source
	 */
	static stripCss(source) {
		let s = new Stripper("css");
		return s.stripFile(source);
	}

	/**
	 * @param {string} source
	 * @param {boolean} [override]
	 * @todo Also consider content of HTML code and pre tags
	 */
	static stripHtml(source, override) {
		let strip = override;
		if (strip == undefined) {
			let cfg = AppConfig.getInstance();
			strip = cfg.options.html.stripper.active;
		}
		if (!strip) return source;
		let s = new Stripper("html");
		return s.stripFile(source);
	}

	/**
	 * @param {string} source
	 */
	static stripJs(source, removeComments = false) {
		let cfg = AppConfig.getInstance();
		let spaces = cfg.options.javascript.lineStripping.needsSpace;
		let s = new Stripper("js", spaces.after, spaces.around, spaces.before);
		return removeComments ? s.removeComments(source) : s.stripFile(source);
	}
}

/**
 * In terms of the 'scientific' (in fact philosophical) theory of evolution:
 * - After a Big Bang you started to architect software and write code.
 * - Writing code resulted in 'expansion of your universe'
 * - Organize a Big Shrink towards what is really necessary,
 *   so short words, not including too much letters,
 *   will be sent to a web browser.
 *
 * A sequal to stripping as above.
 *
 */
export class Shrinker {
	/**
	 * @type {*}
	 */
	static cfg;

	constructor() {
		this.codeZero = "0".charCodeAt(0);
		this.codeNine = "9".charCodeAt(0);
		this.content = "";
		this.alpha = [];
		this.dictTxt = "";
		this.numeric = [];
		this.lastUsed = "";
		// See https://theasciicode.com.ar/
		// Letters:
		// Lower case from 97 to (but excluding) 123
		for (let ll = 97; ll < 123; ll++) {
			this.alpha.push(String.fromCharCode(ll));
		}
		// Upper case from 65 to (but excluding) 91
		for (let ll = 65; ll < 91; ll++) {
			this.alpha.push(String.fromCharCode(ll));
		}
		// Numbers:
		for (let nr = 0; nr < 10; nr++) {
			this.numeric.push(nr.toString());
		}

		if (Shrinker.cfg) return;

		// Initialize config
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);
		let files = cfg.options.javascript.shrinker.defs;
		if (files.length == 0) return;
		let mp = join(cfg.dirProject, "dev", "shrinking"); // main path
		let path;
		Shrinker.cfg = [];
		/**
		 * @type {*[]}
		 */
		let tms = [];

		for (let i = 0; i < files.length; i++) {
			let f = files[i];
			if (!test("-f", join(mp, f))) {
				log.warn(`Config file ${f} not found`);
				continue;
			}
			tms = tms.concat(FileUtils.readJsonFile(join(mp, f)));
		}
		Shrinker.cfg = tms;
	}

	/**
	 * Magic here:
	 * Get a 'different' character, though not different enough to be truly unique.
	 *
	 * @param {*} what
	 * @todo Also consider content of HTML code and pre tags
	 */
	getChar(what) {
		let charCode = what.single.charCodeAt(0);
		let isNum = charCode >= this.codeZero && charCode <= this.codeNine;
		if (isNum && what.single == "9") {
			// Go to next level cycle
			what.single = "a";
			what.overflowed = true;
		} else if (isNum) {
			// Go to next number
			what.single = (parseInt(what.single) + 1).toString();
			what.overflowed = false;
		} else if (what.single == "Z") {
			// Switch to numeric
			what.single = "0";
			what.overflowed = false;
		} else {
			// Get next indexed character in row
			let idx = this.alpha.findIndex(val => val == what.single);
			what.single = this.alpha[idx + 1];
			what.overflowed = false;
		}
	}

	/**
	 * Get the next string, as a shortened version.
	 * No, not intended as 'security by obfuscation':
	 * Do not trust camel case, since that can generate duplicates,
	 * like camels with the exact same bumps born.
	 */
	getNext() {
		let toReturn = this.lastUsed;
		if (!toReturn) {
			toReturn = "Aa";
			this.lastUsed = toReturn;
			return toReturn;
		}
		let last = toReturn.split(""); // Split into an array with characters
		let lastIdx = last.length - 1;
		let go = {
			single: "",
			overflowed: true,
		};
		while (true) {
			// The need to alter the character @ lastIdx of the array 'last'
			go.single = last[lastIdx];
			this.getChar(go);
			if (go.overflowed && lastIdx == 0) {
				// Make string longer
				let len = toReturn.length;
				toReturn = "A".padEnd(len + 1, "a");
				break;
			} else if (go.overflowed) {
				// Go one index to the left and repeat loop
				last[lastIdx] = go.single;
				lastIdx -= 1;
			} else {
				// Finished, not overflowed
				last[lastIdx] = go.single;
				break;
			}
		}
		toReturn = last.join(""); // At last...
		this.lastUsed = toReturn;
		return toReturn;
	}

	/**
	 * Shorten some word in this.content
	 *
	 * @param {string} search
	 * @param {string} replace
	 * @param {boolean} all
	 */
	shorten(search, replace, all = true) {
		if (all) {
			// Simple global replace
			this.content = this.content.replace(new RegExp(search, "g"), replace);
			return;
		}
		// Replace only first occurence.
		// In case of all == false, String.replace()
		// still replaces all occurences, even without 'g' passed to regex.
		// So... therefore to simulate String.replace():
		let idx = this.content.indexOf(search);
		if (idx < 0) return;
		let strPart1 = this.content.substring(0, idx);
		let strPart2 = this.content.substring(idx + search.length);
		this.content = strPart1 + replace + strPart2;
	}

	/**
	 * Act: Classes and related methods.
	 *
	 * Pre-condition: For reasons of replacing only a first occurence,
	 * names to shorten should be defined in the same order as they are bundled
	 *
	 * @param {*} act
	 */
	classes(act) {
		// Properties of act: One class name, string list of methods
		let cR = this.getNext(); // Class replacer, don't replace class name yet
		this.dictTxt +=
			`${"".padEnd(30, "-")}\n` +
			`Class: ${act.class}: ${cR}\n` +
			`${"".padEnd(30, "-")}\n`;
		let methods = act.methods;
		for (let i = 0; i < methods.length; i++) {
			let mS = methods[i]; // method search for
			let mR = this.getNext(); // method replace with

			// Call class using static method
			this.shorten(act.class + "." + mS, cR + "." + mR);

			// Object with functions as methods syntax, replace only first occurence

			// Function name inserted by transcompiler, like interpolation to roll back
			this.shorten(mS + ": function " + mS, mR + ":function ", false);
			// In case function name was not inserted by transcompiler
			this.shorten(mS + ": function ", mR + ":function ", false);

			// In case of prototyping
			this.shorten(act.class + ".prototype." + mS, cR + ".prototype." + mR);

			// Internal
			this.shorten("this." + mS, "this." + mR);
			this.dictTxt += `- ${mR}: ${mS}\n`;
		}
		this.shorten(act.class, cR); // Now replace name of class itself
	}

	/**
	 * Act: Functions
	 *
	 * @param {*} act
	 */
	functions(act) {
		// Act: String list of functions
		this.dictTxt += `Functions:\n`;
		for (let i = 0; i < act.length; i++) {
			let short = this.getNext();
			this.shorten(act[i], short);
			this.dictTxt += `- ${short}: ${act[i]}\n`;
		}
	}

	/**
	 * Write dictionary, resulting of project settings, to file
	 *
	 * @param {boolean} removeOld
	 */
	writeDict(removeOld = false) {
		let cfg = AppConfig.getInstance();
		let file = join("notes", "translate-table.txt");
		if (removeOld) FileUtils.rmFile(file);
		FileUtils.writeFile(
			cfg.dirProject,
			file,
			this.dictTxt,
			false,
			removeOld ? "w" : "a",
		);
	}

	/**
	 * Main entry: Shrink words so they are not too long any more
	 *
	 * @param {string} content
	 * @param {boolean} writeDict
	 */
	shrinkFile(content, writeDict) {
		if (!Shrinker.cfg) return content;
		this.content = content;
		this.dictTxt = "";
		let cfg = AppConfig.getInstance();
		for (let i = 0; i < Shrinker.cfg.length; i++) {
			let act = Shrinker.cfg[i];
			if (act.class != undefined && act.class) {
				this.classes(act);
			} else if (act.functions != undefined && act.functions.length > 0) {
				this.functions(act);
			}
		}
		if (writeDict) this.writeDict(true);
		return this.content;
	}
}
