"use strict";
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "../index.mjs";
import { test } from "../sys.mjs";
import { StringExt } from "../utils.mjs";
import { Composer } from "./composer.mjs";
import { ShrinkConfig } from "./config.mjs";
import { CodeJs } from "./javascript.mjs";

/**
 * Shrinking aka shortening of words
 *
 * In terms of the 'scientific' (in fact philosophical) theory of evolution:
 * - After a Big Bang you started to architect software and write code.
 * - Writing code resulted in 'expansion of your universe'
 * - Now organize a Big Shrink towards what is really necessary,
 *   meaning short words, not including too much letters,
 *   will be sent to a web browser.
 */
export class Shrinker {
	/**
	 * @type {*[]} All entries from part .json files in one array
	 */
	static entries;

	/**
	 * @type {Shrinker|undefined}
	 */
	static _instance;

	/**
	 * Singleton factory to get instance
	 *
	 * @returns {Shrinker}
	 */
	static getInstance() {
		if (!Shrinker._instance) {
			Shrinker._instance = new Shrinker();
		}
		return Shrinker._instance;
	}

	constructor() {
		this.content = "";
		this.debug = {
			active: false,
			text: "",
		};
		this.replaceMode = {
			all: true, // replace all, meaning not only first occurrence
			bi: null, // instance of BlockInfo or null
			isRegEx: false, // search as regex? If not as string
		};
		this.where = {
			analyse: false, // analyse only
			changed: false, // change in part aka for .json file?
			dry: false, // dry is to gather info only, see method shrinkFile()
			idx: -1,
			part: "",
		};

		let log = Logger.getInstance();
		ShrinkConfig.scanAll();

		// Get list of classes, methods etc
		Shrinker.entries = ShrinkConfig.getList4Shrinking();

		// Dry runs for configuration
		this.run(true, true); // scan for all used shorteneds. Don't update yet
		this.run(true); // update; add shorteneds
	}

	/**
	 * @private
	 */
	resetReplace() {
		this.replaceMode.all = true;
		this.replaceMode.bi = null;
		this.replaceMode.isRegEx = false;
	}

	/**
	 * For debug purposes, add new line to debug text
	 * @private
	 */
	addBlankLine() {
		if (this.debug.active) this.debug.text += "\n";
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
			!this.replaceMode.all, // replace all translated to replace only first
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
	 * @param {Object} act Properties class name, string list of methods
	 */
	classes(act) {
		let changed = this.where.changed;
		if (!act?.short && !Composer.canIgonore(act.class)) this.where.changed = true;

		act.short = Shrinker.entries[this.where.part][
			this.where.idx
		].short = Composer.registerUsed(act.class, this.where.analyse, act?.short);

		let method,
			methods = Object.keys(act.methods);
		for (let i = 0; i < methods.length; i++) {
			method = methods[i];
			this.methods(
				act.class,
				act.short || act.class,
				method,
				act.methods[method]?.short,
			);
		}

		if (this.where.dry) return;

		this.addBlankLine(); // For debug text
		this.resetReplace();

		// TODO tweak using a RegExp to make sure only class name is replaced?
		if (act.short) this.shorten(act.class, act.short); // Now replace name of class itself
		this.addBlankLine(); // For debug text
	}

	/**
	 * Method, called by this.classes()
	 *
	 * @private
	 * @param {string} clsS Class to search for
	 * @param {string} clsR Class to replace with
	 * @param {string} mS Method to search for
	 * @param {string} mR Method to replace with
	 */
	methods(clsS, clsR, mS, mR) {
		if (!mR && !Composer.canIgonore(mS)) this.where.changed = true;

		mR = Shrinker.entries[this.where.part][this.where.idx].methods[
			mS
		].short = Composer.registerUsed(mS, this.where.analyse, mR);
		if (this.where.dry) return;
		if (clsS == clsR && mS == mR) return; // No need to replace at all
		if (!mR) mR = mS; // No need to shorten method name

		//----------------------
		// Methods, replace only first occurence
		//----------------------
		this.resetReplace();
		// Get instance of BlockInfo with indices of class in code,
		// to replace strings within specific part of code.
		// Null if class definition not found
		this.replaceMode.all = false;
		this.replaceMode.bi = CodeJs.getClassIndices(this.content, clsS);
		if (this.replaceMode.bi) this.replaceMode.bi.container = clsS;

		// Prototype syntax
		this.shorten(`${clsS}.prototype.${mS}(`, `${clsR}.prototype.${mR}(`);

		// Object with functions as methods syntax

		// Method name inserted by transcompiler, like interpolation to roll back
		this.shorten(`${mS}: function ${mS}`, `${mR}:function `);
		// In case method name was not inserted by transcompiler
		this.shorten(`${mS}: function`, `${mR}:function `);

		// Internal this.<method name> calls
		this.shorten(`this.${mS}(`, `this.${mR}(`);

		//----------------------
		// Calls, replace all occurences
		//----------------------
		this.resetReplace();
		// Call using static method
		this.shorten(`${clsS}.${mS}(`, `${clsR}.${mR}(`);
	}

	/**
	 * Act: Functions
	 *
	 * @private
	 * @param {*} act
	 * @todo Not used yet, no autoscan yet.
	 */
	functions(act) {
		this.resetReplace();

		// Act: String list of functions
		for (let i = 0; i < act.length; i++) {
			let short = Composer.registerUsed(); // Needs 3 params; name function, this.where.analyse, short
			if (!short) continue;
			if (this.where.dry) continue;
			this.shorten(act[i], short);
		}
	}

	/**
	 * @param {boolean} dry True if updating configuration
	 * @param {boolean} [analyse] If true, only analyse
	 */
	run(dry, analyse = false) {
		this.where.analyse = analyse;
		this.where.dry = dry;

		let parts = Object.keys(Shrinker.entries);
		for (let p = 0; p < parts.length; p++) {
			this.where.changed = false;
			this.where.part = parts[p];
			for (let i = 0; i < Shrinker.entries[this.where.part].length; i++) {
				this.where.idx = i;
				let act = Shrinker.entries[this.where.part][i];
				if (act?.class) {
					this.classes(act);
				} else if (act?.functions?.length > 0) {
					this.functions(act);
				}
			}
			if (this.where.analyse || !dry) continue;

			ShrinkConfig.updatePart(
				this.where.part,
				Shrinker.entries[this.where.part],
				this.where.changed,
			);
		}

		this.where.dry = false;
	}

	/**
	 * Main entry: Shrink words so they are not too long any more
	 *
	 * @param {string} file
	 * @param {string} content
	 * @returns {string}
	 */
	shrinkFile(file, content) {
		if (!Shrinker.entries) return content;
		let cfg = AppConfig.getInstance(),
			log = Logger.getInstance(),
			item,
			part,
			parts = Object.keys(Shrinker.entries);

		this.content = content;

		// Find out in which part this file is
		this.where.dry = true;
		this.where.part = "";
		for (let p = 0; !this.where.part && p < parts.length; p++) {
			part = parts[p];
			for (let i = 0; !this.where.part && i < Shrinker.entries[part].length; i++) {
				item = Shrinker.entries[part][i];
				if (file == item.location) {
					this.where.idx = i;
					this.where.part = part;
				}
			}
		}

		if (this.where.part) {
			// Look for relevant changes, dry run
			this.content = content;
			this.where.dry = true;
			this.where.changed = false;
			let act = Shrinker.entries[this.where.part][this.where.idx];
			if (act?.class) {
				this.classes(act);
			} else if (act?.functions?.length > 0) {
				this.functions(act);
			}
			this.where.dry = false;

			ShrinkConfig.updatePart(
				this.where.part,
				Shrinker.entries[this.where.part],
				this.where.changed,
			);
		}

		if (cfg.options.javascript.verbose.shrinking) log.info(`- Shrinking ${file}`);
		this.run(false); // Shrink this file aka shorten words

		return this.content;
	}
}
