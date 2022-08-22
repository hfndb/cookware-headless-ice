"use strict";
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "../index.mjs";
import { test, touch } from "../sys.mjs";
import { StringExt } from "../utils.mjs";
import { CodeJs } from "./javascript.mjs";

/**
 * In terms of the 'scientific' (in fact philosophical) theory of evolution:
 * - After a Big Bang you started to architect software and write code.
 * - Writing code resulted in 'expansion of your universe'
 * - Now organize a Big Shrink towards what is really necessary,
 *   meaning short words, not including too much letters,
 *   will be sent to a web browser.
 *
 * A sequal to stripping as above.
 */
export class Shrinker {
	/**
	 * @type {*}
	 */
	static cfg;

	constructor() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance(cfg.options.logging);

		this.alpha = [];
		this.codeZero = "0".charCodeAt(0);
		this.codeNine = "9".charCodeAt(0);
		this.content = "";
		this.debug = {
			active: cfg.options.javascript.shrinker.debug,
			text: "",
		};
		this.dictTxt = "";
		this.lastUsed = "";
		this.numeric = [];
		this.replaceMode = {
			all: true, // replace all, meaning not only first occurrence
			bi: null, // instance of BlockInfo or null
			isRegEx: false, // search as regex? If not as string
		};

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
			if (f == "files2scan.json") continue;
			if (!test("-f", join(mp, f))) {
				log.warn(`Config file ${f} not found`);
				continue;
			}
			tms = tms.concat(FileUtils.readJsonFile(join(mp, f)));
		}
		Shrinker.cfg = tms;
	}

	/**
	 * @private
	 */
	resetReplace() {
		this.replaceMode.all = true; // Replace all, meaning not only first occurrence
		this.replaceMode.bi = null; // instance of BlockInfo or null
		this.replaceMode.isRegEx = false; // search as regex? If not as string
	}

	/**
	 * For debug purposes, add new line to debug text
	 * @private
	 */
	addBlankLine() {
		this.debug.text += "\n";
	}

	/**
	 * Magic here:
	 * Get a 'different' character, though not different enough to be truly unique.
	 *
	 * @private
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
	 *
	 * @private
	 * @returns {string}
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
	 * Shorten some string in this.content
	 *
	 * @private
	 * @param {string} search
	 * @param {string} replace
	 */
	shorten(search, replace) {
		if (this.debug.active) {
			this.debug.text +=
				search.toString().padEnd(70, " ") +
				replace.padEnd(30, " ") +
				(this.replaceMode.all ? "all\n" : "first\n");
		}

		this.content = StringExt.replaceInSection(
			this.content,
			search,
			replace,
			!this.replaceMode.all, // all translated to onlyFirst
			this.replaceMode.bi?.idxBegin || 0,
			this.replaceMode.bi?.idxEnd || 0,
		);
	}

	/**
	 * Act: Classes and related methods.
	 *
	 * Pre-condition: For reasons of replacing only a first occurence,
	 * names to shorten should be defined in the same order as they are bundled
	 *
	 * For debug purposes, add new line to debug text
	 * @private
	 * @param {*} act
	 */
	classes(act) {
		this.resetReplace();

		// Properties of act: One class name, string list of methods
		let cR = this.getNext(); // Class replacer, don't replace class name yet
		this.dictTxt +=
			`${"".padEnd(30, "-")}\n` +
			`Class: ${act.class}: ${cR}\n` +
			`${"".padEnd(30, "-")}\n`;

		// To replace strings within specific part of code
		// Get instance of BlockInfo with indices of class in code
		let biClass = CodeJs.getClassIndices(this.content, act.class);

		this.replaceMode.bi = biClass; // Null if class definition not found
		if (this.replaceMode.bi) this.replaceMode.bi.container = act.class;

		let methods = Object.keys(act.methods);
		for (let i = 0; i < methods.length; i++) {
			let mS = methods[i]; // method search for
			let mR = this.getNext(); // method replace with
			// Get indices of method in class
			// let biMethod = CodeJs.getMethodIndices(this.content, mS, biClass, true);

			this.dictTxt += `- ${mR}: ${mS}\n`;
			this.replaceMode.all = true; // Replace all, meaning not only first occurrence

			// Call of class using static method, replace all occurences
			this.shorten(`${act.class}.${mS}(`, `${cR}.${mR}(`);

			// Other file than class definition?
			if (!this.replaceMode.bi) {
				continue;
			}

			// Internal this.<method name> calls
			this.shorten(`this.${mS}(`, `this.${mR}(`);

			//----------------------
			// Methods, replace only first occurence
			//----------------------
			this.replaceMode.all = false;

			// Prototype syntax
			this.shorten(`${act.class}.prototype.${mS}(`, `${cR}.prototype.${mR}(`);

			// Object with functions as methods syntax
			// Method name inserted by transcompiler, like interpolation to roll back
			this.shorten(`${mS}: function ${mS}`, `${mR}:function `);
			// In case method name was not inserted by transcompiler
			this.shorten(`${mS}: function`, `${mR}:function `);
		}

		this.addBlankLine();
		this.replaceMode.isRegEx = true; // search as regex

		// TODO tweak using a RegExp to make sure only class name is replaced?
		this.shorten(act.class, cR); // Now replace name of class itself
		this.addBlankLine();
	}

	/**
	 * Act: Functions
	 *
	 * @private
	 * @param {*} act
	 */
	functions(act) {
		this.resetReplace();

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
	 * @private
	 * @param {boolean} removeOld
	 */
	writeDict(removeOld = false) {
		if (!this.dictTxt) return;

		let cfg = AppConfig.getInstance();
		let file = join("dev", "shrinking", "translate-table.txt");

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
	 * @returns {string}
	 */
	shrinkFile(content, writeDict) {
		if (!Shrinker.cfg) return content;

		this.content = content;
		this.dictTxt = "";

		for (let i = 0; i < Shrinker.cfg.length; i++) {
			let act = Shrinker.cfg[i];
			if (act?.class) {
				this.classes(act);
			} else if (act?.functions?.length > 0) {
				this.functions(act);
			}
		}
		if (writeDict) this.writeDict(true);

		if (this.debug.active) {
			let cfg = AppConfig.getInstance();
			FileUtils.writeFile(
				"",
				join(cfg.dirTemp, "shrink-debug.txt"),
				this.debug.text,
				true,
			);
		}

		return this.content;
	}

	/**
	 * Update configuration for shrinking
	 *
	 * @private
	 * @param {Object} cfgPart .json of part
	 * @param {number} lm Config of part last modified
	 * @param {string[]} files
	 * @returns {boolean} Changed
	 */
	static scanPart(cfgPart, lm, files) {
		let cfg = AppConfig.getInstance(),
			classes,
			cls,
			idx,
			entry,
			file,
			rt = false,
			src;

		for (let f = 0; f < files.length; f++) {
			file = join(cfg.dirProject, cfg.options.javascript.dirs.source, files[f]);

			// When modified? Ignore?
			if (FileUtils.getLastModified("", file) < lm) continue;

			// Scan file
			src = FileUtils.readFile(file);
			classes = CodeJs.getClasses(src);
			for (let c = 0; c < classes.length; c++) {
				cls = classes[c];
				entry = {
					class: cls,
					methods: CodeJs.getMethods(src, cls),
					location: files[f],
				};
				idx = cfgPart.findIndex(el => el?.class == entry.class);
				if (idx >= 0) {
					cfgPart[idx] = entry; // Overwrite entry
				} else {
					cfgPart.push(entry); // Add entry
				}
				rt = true;
			}
		}

		return rt;
	}

	/**
	 * Update configuration for shrinking as far as necessary
	 */
	static scanFiles2shrink() {
		let cfg = AppConfig.getInstance(),
			cfgPart,
			changed,
			files,
			filePart,
			fileSrc,
			path = join(cfg.dirProject, "dev", "shrinking", "files2scan.json");

		if (!test("-f", path)) return;

		let lm2scan = FileUtils.getLastModified("", path); // files2scan.json
		let toScan = FileUtils.readJsonFile(path);
		let parts = Object.keys(toScan);
		for (let p = 0; p < parts.length; p++) {
			filePart = join("dev", "shrinking", parts[p] + ".json");
			files = toScan[parts[p]];
			cfgPart = test("-f", filePart)
				? FileUtils.readJsonFile(join(cfg.dirProject, filePart))
				: [];
			changed = Shrinker.scanPart(cfgPart, lm2scan, files);
			if (changed) {
				FileUtils.writeJsonFile(cfgPart, cfg.dirProject, filePart, true);
				touch(path);
			}
		}
	}
}
