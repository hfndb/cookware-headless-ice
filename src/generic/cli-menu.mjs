"use strict";
import { parseArgs } from "node:util";
//import { AsciiTable3, AlignmentEnum } from "ascii-table3";
import { AppConfig } from "./config.mjs";
import { StringExt } from "./utils.mjs";

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
			description: "For developement purposes: Play with functionality",
		};
		this.helpShortcutH = {
			alias: "h",
			name: "help",
			type: Boolean,
			description: "Display this overview",
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
		let cols = [0, 3, 0, 0],
			entries = [],
			internal = true, // Use internal code (true) or package ascii-table3 (false)
			short,
			opt,
			tp;

		// First check how much space 1st and 3th column needs
		for (let i = 0; i < this.options.length; i++) {
			opt = this.options[i];
			if (opt.hidden) continue;
			cols[0] = Math.max(cols[0], opt.name.length);
			cols[2] = Math.max(cols[2], opt.typeLabel.length);
		}
		cols[0] += 3; // Add prefix + spaces to 1st column
		cols[2] += 1; // Add space to 3th column
		cols[3] = cfg.options.cli.width - cols[0] - cols[1] - cols[2]; // Total width of description column

		// Menu entries
		for (let i = 0; i < this.options.length; i++) {
			opt = this.options[i];
			if (opt.hidden) continue;

			if (!internal) {
				entries.push([
					"--".concat(opt.name).padEnd(cols[0], " "),
					opt.alias ? "-" + opt.alias : "",
					opt.typeLabel ? opt.typeLabel : "",
					opt.description,
				]);
				continue;
			}

			let descr = StringExt.toColumn(opt.description, cols[3]); // string array
			short = opt.alias ? "-" + opt.alias : "";
			console.log(
				"--".concat(opt.name).padEnd(cols[0], " ") +
					short.padEnd(cols[1], " ") +
					opt.typeLabel.padEnd(cols[2], " ") +
					descr[0],
			);
			for (let i = 1; i < descr.length; i++) {
				console.log("".padEnd(cols[0] + cols[1] + cols[2], " ") + descr[i]);
			}
		}

		if (!internal) {
			let tbl = new AsciiTable3()
				.setStyle("none")
				.addRowMatrix(entries)
				.setWidth(4, cols[3] - 10) // Correct spaces added in other columns
				.setWrapped(4);

			console.log(tbl.toString());
		}

		console.log(); // Empty line
	}

	/**
	 * @param {MenuOption} opt
	 */
	addOption(opt) {
		if (!opt.module) opt.module = "main";
		if (!opt.typeLabel) opt.typeLabel = "";
		this.options.push(opt);
	}
}
