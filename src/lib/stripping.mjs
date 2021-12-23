import { join } from "path";
import shelljs from "shelljs";
import { StringExt } from "../lib/utils.mjs";
import { AppConfig, FileUtils } from "../lib/index.mjs";
const { test } = shelljs;

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
	constructor(after, around, before) {
		this.after = after || [];
		this.around = around || [];
		this.before = before || [];
	}

	stripFile(src) {
		let mlnTemplate = 0;
		let lines = src.split("\n");
		let toReturn = "";
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();
			if (!line) continue; // Empty line
			// Handle multiline string templates
			if (!mlnTemplate && line.includes("multiline template")) {
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
			line = this.stripLine(line);
			toReturn += line;
		}
		return toReturn;
	}

	/**
	 * Strip empty space within a line
	 */
	stripLine(line) {
		let lastIdx = -1;
		let idx = line.indexOf(" ", lastIdx) + 1; // including trailing space
		while (idx >= 0 && idx > lastIdx) {
			let strPart1 = line.substring(0, idx);
			let strPart2 = line.substring(idx);
			if (!this.isInString(strPart1) && !this.preserveSpace(strPart1, strPart2))
				strPart1 = strPart1.trimRight();
			line = strPart1 + strPart2;
			lastIdx = idx;
			idx = line.indexOf(" ", lastIdx) + 1;
		}
		return line;
	}

	/**
	 * Check whether space is within encapculated string
	 *
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
	 */
	preserveSpace(part1, part2) {
		let r = false;
		for (let i = 0; i < this.after.length && !r; i++) {
			if (part1.endsWith(this.after[i] + " ")) r = true;
		}
		for (let i = 0; i < this.around.length && !r; i++) {
			if (part1.endsWith(this.around[i] + " ")) r = true;
		}
		return r;
	}

	/**
	 * Remove imports at the top of a source file.
	 * While doing so, also strip exports.
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
}

/**
 * @todo Also consider content of HTML code and pre tags
 */
export function stripHtml(source) {
	let cfg = AppConfig.getInstance();
	if (!cfg.options.html.stripper.active) return source;
	let s = new Stripper();
	return s.stripFile(source);
}

export function stripJs(source) {
	let cfg = AppConfig.getInstance();
	let spaces = cfg.options.javascript.lineStripping.needsSpace;
	let s = new Stripper(spaces.after, spaces.around, spaces.before);
	return s.stripFile(source);
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
	}

	static init() {
		let cfg = AppConfig.getInstance();
		let path;
		if (!Shrinker.cfg) {
			path = join(cfg.dirProject, "dev", "shrink.json");
			Shrinker.cfg = test("-f", join(path)) ? FileUtils.readJsonFile(path) : null;
		}
	}

	/**
	 * Magic here:
	 * Get a 'different' character, though not different enough to be truly unique.
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
			// Function name inserted by Babel, like interpolation to roll back
			if (this.content.includes(`var ${act.class}=`)) {
				// Only replace if class is included in content file
				this.shorten(mS + ":function " + mS, mR + ":function ", false);
			}
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
	 */
	shrinkFile(content, writeDict) {
		this.content = content;
		this.dictTxt = "";
		let cfg = AppConfig.getInstance();
		for (let i = 0; Shrinker.cfg && i < Shrinker.cfg.length; i++) {
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
