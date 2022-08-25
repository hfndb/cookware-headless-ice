"use strict";

/**
 * Compose and register shortened 'names' for classes, methods etc.
 */
export class Composer {
	/**
	 * @type {Composer[]} Registry of used and available entries
	 */
	static available = [];

	/**
	 * @type {string[]}
	 */
	static alpha = [];

	static codeZero = "0".charCodeAt(0);
	static codeNine = "9".charCodeAt(0);

	constructor(str, used) {
		Composer.init();
		this.str = str;
		this.used = used;
	}

	/**
	 * Since used version of Babel doesn't recognise static constructor yet...
	 * initialize static variables
	 */
	static init() {
		if (Composer.alpha.length > 0) return;

		// See https://theasciicode.com.ar/

		// Letters:
		// Lower case from 97 to (but excluding) 123
		for (let ll = 97; ll < 123; ll++) {
			Composer.alpha.push(String.fromCharCode(ll));
		}
		// Upper case from 65 to (but excluding) 91
		for (let ll = 65; ll < 91; ll++) {
			Composer.alpha.push(String.fromCharCode(ll));
		}
	}

	/**
	 * Magic here:
	 * Get a 'different' character, though not different enough to be truly unique.
	 *
	 * @private
	 * @param {*} what
	 * @todo Also consider content of HTML code and pre tags
	 */
	static getChar(what) {
		let charCode = what.single.charCodeAt(0);
		let isNum = charCode >= Composer.codeZero && charCode <= Composer.codeNine;
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
			let idx = Composer.alpha.findIndex(val => val == what.single);
			what.single = Composer.alpha[idx + 1];
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
	 * @param {string} lastUsed
	 * @returns {string}
	 */
	static getNext(lastUsed) {
		let rt = lastUsed;
		if (!rt) {
			return "Aa";
		}
		let last = rt.split(""); // Split into an array with characters
		let lastIdx = last.length - 1,
			go = {
				single: "",
				overflowed: true,
			};
		while (true) {
			// The need to alter the character @ lastIdx of the array 'last'
			go.single = last[lastIdx];
			Composer.getChar(go);
			if (go.overflowed && lastIdx == 0) {
				// Make string longer
				let len = rt.length;
				rt = rt.padEnd(len + 1, "a");
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
		rt = last.join(""); // At last...
		return rt;
	}

	/**
	 * Get a next available shortened word
	 *
	 * @private
	 * @returns {string}
	 */
	static getAvailable() {
		let idx = -1,
			lastUsed;

		// Look for an available entry
		for (let i = 0; idx < 0 && i < Composer.available.length; i++) {
			lastUsed = Composer.available[i].str;
			if (!Composer.available[i].used) idx = i;
		}

		// Not found? Add
		if (idx < 0) {
			let entry = new Composer(Composer.getNext(lastUsed), true);
			idx = Composer.available.push(entry) - 1;
		}

		return Composer.available[idx].str;
	}

	/**
	 * Ignore name?
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	static canIgonore(name) {
		return name.length < 4;
	}

	/**
	 * During shrinking, we need to register alreay composed strings
	 *
	 * @param {string} name
	 * @param {boolean} analyse
	 * @param {string} [short]
	 * @returns {string} Already used or composed
	 */
	static registerUsed(name, analyse, short = "") {
		if (Composer.canIgonore(name)) return ""; // No need to shorten
		if (analyse && !short) return ""; // Ignore for now

		if (!short) return Composer.getAvailable(); // Shorten

		// Look for an available entry
		let lastUsed;
		for (let i = 0; i < Composer.available.length; i++) {
			lastUsed = Composer.available[i].str;
			if (Composer.available[i].str == short) {
				Composer.available[i].used = true;
				return short;
			}
		}

		// Add while making sure sequence remains ordered as it should
		let entry;
		while (lastUsed != short) {
			lastUsed = Composer.getNext(lastUsed);
			Composer.available.push(new Composer(lastUsed, lastUsed == short));
		}

		return lastUsed;
	}
}
