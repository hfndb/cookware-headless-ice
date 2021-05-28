import { join } from "path";
import { StringExt } from "../lib/utils";
import { AppConfig, FileUtils, Logger } from "../lib";

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
	after: string[];
	around: string[];
	before: string[];

	constructor(after?: string[], around?: string[], before?: string[]) {
		this.after = after || [];
		this.around = around || [];
		this.before = before || [];
	}

	stripFile(src: string): string {
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
	stripLine(line: string): string {
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
	isInString(str: string): boolean {
		let sq = StringExt.occurrences(str, "'"); // single quotes
		let dq = StringExt.occurrences(str, '"'); // double quotes
		let cm = StringExt.occurrences(str, "/"); // comment like /* */
		return sq % 2 != 0 || dq % 2 != 0 || cm % 2 != 0;
	}

	/**
	 * Check wether spaces is to be preserved based on defined keywords
	 */
	preserveSpace(part1: string, part2: string): boolean {
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
	static stripImports(src: string): string {
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
export function stripHtml(source): string {
	let cfg = AppConfig.getInstance();
	if (!cfg.options.html.stripper.active) return source;
	let s = new Stripper();
	return s.stripFile(source);
}

export function stripJs(source): string {
	let cfg = AppConfig.getInstance();
	let spaces = cfg.options.javascript.lineStripping.needsSpace;
	let s = new Stripper(spaces.after, spaces.around, spaces.before);
	return s.stripFile(source);
}

/**
 * For Shrinker, internal usage
 */
interface Overflowed {
	single: string;
	overflowed: boolean;
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
	private alpha: string[];
	private codeZero: number;
	private codeNine: number;
	private content: string;
	private dictTxt: string;
	private lastUsed: string;
	private numeric: string[];

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

	/**
	 * Magic here:
	 * Get a 'different' character, though not different enough to be truly unique.
	 */
	private getChar(what: Overflowed): void {
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
	private getNext(): string {
		let toReturn = this.lastUsed;
		if (!toReturn) {
			toReturn = "Aa";
			this.lastUsed = toReturn;
			return toReturn;
		}
		let last = toReturn.split(""); // Split into an array with characters
		let lastIdx = last.length - 1;
		let go: Overflowed = {
			single: "",
			overflowed: true
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
	private shorten(search: string, replace: string, all: boolean = true): void {
		if (search.includes("init:function"))
			console.log(`Replace '${search}' with '${replace}'`, all ? "all" : "first");

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
	private classes(act: any): void {
		// Properties of act: One class name, string list of methods
		let cR = this.getNext(); // Class replacer, don't replace class name yet
		this.dictTxt +=
			`${"".padEnd(30, "-")}\n` +
			`Class: ${act.class}: ${cR}\n` +
			`${"".padEnd(30, "-")}\n`;

		let methods: string[] = act.methods;
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
	private functions(act: any): void {
		// Act: String list of functions
		this.dictTxt += `Functions:\n`;
		for (let i = 0; i < act.length; i++) {
			let short = this.shorten(act[i], act[i]);
			this.dictTxt += `- ${short}: ${act[i]}\n`;
		}
	}

	/**
	 * Write dictionary, resulting of project settings, to file
	 */
	private writeDict(removeOld: boolean = false): void {
		let cfg = AppConfig.getInstance();
		let file = join("notes", "translate-table.txt");
		if (removeOld) FileUtils.rmFile(file);
		FileUtils.writeFile(
			cfg.dirProject,
			file,
			this.dictTxt,
			false,
			removeOld ? "w" : "a"
		);
	}

	/**
	 * Main entry: Shrink words so they are not too long any more
	 */
	shrinkFile(content: string, writeDict: boolean): string {
		this.content = content;
		this.dictTxt = "";

		let cfg = AppConfig.getInstance();
		let opts = cfg.options.javascript.browser.shrink;
		for (let i = 0; i < opts.length; i++) {
			let act = opts[i];

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
