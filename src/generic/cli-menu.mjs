"use strict";
import { parseArgs } from "node:util";
import { AppConfig } from "./config.mjs";

/** @typedef MenuOption
 * @property {string} alias
 * @property {string} name
 * @property {string} description
 * @property {Type} type
 * @property {boolean} [hidden]
 * @property {boolean} [multiline]
 */

/**
 * Command line menu
 *
 * @property {string} name
 * @property {string} alias
 * @property {MenuOption[]} options
 */
export class CliMenu {
	static instance = null;

	constructor() {
		this.name = "";
		this.checkOverridesShortcutC = {
			alias: "c",
			name: "config",
			type: Boolean,
			description:
				"Check your project settings.json; default and overridden settings",
		};
		this.initializeNewProjectShortcutI = {
			alias: "i",
			name: "init",
			type: Boolean,
			description: "Initalize new project in current working directory",
		};
		this.playgroundShortcutY = {
			alias: "y",
			name: "playground",
			type: Boolean,
			description: "For developement purposes: Play with functionality.",
		};
		this.helpShortcutH = {
			alias: "h",
			name: "help",
			type: Boolean,
			description: "Display this usage guide.",
		};
		this.options = [];
	}

	/**
	 * Singleton factory to get instance
	 * @param name of project
	 */
	static getInstance() {
		if (!CliMenu.instance) {
			CliMenu.instance = new CliMenu();
		}
		return CliMenu.instance;
	}

	/**
	 * For programming purposes. Check for options with the same shortcut or name
	 */
	checkOption(toCheck, current) {
		if (process.env.NODE_ENV == "production" || toCheck <= current) return;
		if (
			this.options[toCheck].alias &&
			this.options[current].alias == this.options[toCheck].alias
		) {
			console.log(
				`- Double shortcut ${this.options[toCheck].alias} in modules ${this.options[current].module} and ${this.options[toCheck].module}`,
			);
			Reflect.deleteProperty(this.options[toCheck], "alias");
		}
		if (this.options[current].name == this.options[toCheck].name) {
			console.log(
				`- Double name ${this.options[toCheck].name} in modules ${this.options[current].module} and ${this.options[toCheck].module}`,
			);
		}
	}

	getUserChoice() {
		// Check
		for (let current = 0; current < this.options.length; current++) {
			for (let toCheck = 0; toCheck < this.options.length; toCheck++) {
				this.checkOption(toCheck, current);
			}
		}

		/**
		 * Build object for argument parser
		 * @see https://nodejs.org/api/util.html#utilparseargsconfig
		 *
		 * Keys of options are the long names of options. Values:
		 *
		 * - Multiple: Can be provided multiple times (default false)
		 *   If true, all values will be collected in an array
		 * - Type: boolean or string
		 *
		 * Other:
		 * allowPositionals: Default: false if strict is true, otherwise true.
		 *   Positional arguments
		 * strict: Should an error be thrown when unknown arguments are encountered,
		 *   or when arguments are passed that do not match the type configured in options. Default: true.
		 */

		let opts = {
			options: {},
			allowPositionals: false, // default: false
			strict: true, // default: true
		};

		let opt, tp;
		for (let i = 0; i < this.options.length; i++) {
			opt = this.options[i];
			switch (opt.type) {
				case Boolean:
					tp = "boolean";
					break;
				default:
					tp = "string";
					break;
			}

			let toAdd = {
				multiline: opt.multiline ? opt.multiline : false,
				type: tp,
			};
			if (opt.alias) toAdd.short = opt.alias;

			opts.options[opt.name] = toAdd;
		}
		//console.debug(opts);

		// Get command line options as provided by user
		let chosen;
		try {
			chosen = parseArgs(opts);
		} catch (error) {
			console.debug(error);
		}

		// chosen?.positionals is a string array

		return chosen?.values || {};
	}

	setName(name) {
		this.name = name;
	}

	showHelp() {
		let cfg = AppConfig.getInstance();

		// Menu header
		console.log(`\n  Options for ${this.name}:\n`);
		let cols = [0, 6, 0],
			short,
			opt,
			tp;

		// First check how much space 1st column needs
		for (let i = 0; i < this.options.length; i++) {
			opt = this.options[i];
			if (opt.hidden) continue;
			cols[0] = Math.max(cols[0], opt.name.length);
		}
		cols[0] += 6; // Add prefix + 4 spaces to 1st column
		cols[2] = cfg.options.cli.width - cols[0] - cols[1]; // Total width of description column

		// Menu entries
		for (let i = 0; i < this.options.length; i++) {
			opt = this.options[i];
			if (opt.hidden) continue;
			this.descr = opt.description;
			if (opt.typeLabel) {
				this.descr = `${opt.typeLabel} ${this.descr}`;
			}
			short = opt.alias ? "-" + opt.alias : "";
			console.log(
				"--".concat(opt.name).padEnd(cols[0], " ") +
					short.padEnd(cols[1], " ") +
					this.getDescr(cols[2]),
			);
			while (this.descr) {
				console.log("".padEnd(cols[0] + cols[1], " ") + this.getDescr(cols[2]));
			}
		}
		console.log(); // Empty line
	}

	/**
	 * @private
	 * @param {number} width
	 */
	getDescr(width) {
		// Property this.descr is set by this.showHelp()

		if (!this.descr) return ""; // Just to be sure, shouldn't occur
		let descr = this.descr.split(" "), // Transform to array with words
			rt = "",
			word;

		while (true) {
			// Add first word in array?
			if (rt.length + descr[0].length + 1 < width) {
				word = descr.shift(); // remove 1st word in array
				rt += word + " ";
				if (!descr.length) break; // array empty now
			} else {
				break;
			}
		}
		this.descr = descr.length == 0 ? "" : descr.join(" ").trim();

		return rt;
	}

	/**
	 * @param {MenuOption} opt
	 */
	addOption(opt) {
		if (!opt.module) opt.module = "main";
		this.options.push(opt);
	}
}
