"use strict";
import { basename, dirname, join } from "node:path";
import { SysUtils } from "./sys.mjs";
import { FileUtils } from "./file-system/files.mjs";
import { ObjectUtils } from "./object.mjs";
import { Formatter } from "./utils.mjs";
import colors from "colors";

/**
 * This file is created for and maintained in cookware-headless-ice
 *
 * @see https://github.com/hfndb/cookware-headless-ice
 * @see src/lib/file-system/files.mjs
 *
 * About colors, see article
 * JavaScript dev deliberately screws up own popular npm packages to make a point
 * of some sort. Faker.js and colors.js sabotaged by maker
 * @see https://www.theregister.com/2022/01/10/npm_fakerjs_colorsjs/
 *
 * What NPM Should Do Today To Stop A New Colors Attack Tomorrow
 * @see https://research.swtch.com/npm-colors
 *
 * Don't upgrade to version 1.4.44-liberty-2, so... frozen in package.json
 */

/**
 * Organize logging to application logfiles and possibly console
 */
export class Logger {
	constructor(options) {
		this.fileAll = "";
		this.fileDatabase = "";
		this.fileError = "";
		this.lineLenght = 80; // For writeConsole() etc.
		/**
		 * Indicating that the application is in the process of shutting down,
		 * after logging a thrown error and throwing a fresh error to escalate.
		 */
		this.isShuttingDown = false;
		/**
		 * Function for user defined logging
		 */
		this.udfLogging = null;
		this.shutdown = null;
		this.opts = options;
		// @todo get output path from project settings.json
		this.codeReplace = new RegExp("dist/static/js", "g");
		if (options == null) {
			return;
		}
		/**
		 * For opts.level:
		 *
		 * npm log levels:
		 * error: 0
		 * warn: 1
		 * info: 2
		 * verbose: 3
		 * debug: 4
		 *
		 * Log levels acoording to ./docs/configuration.md:
		 * debug, error, verbose
		 */
		this.fileAll = "combined.log";
		this.fileDatabase = "database.log";
		this.fileError = "error.log";
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance(options) {
		if (!Logger.instance) {
			if (options) {
				Logger.instance = new Logger(options);
			} else {
				console.log(
					"Programming error? Logger.getInstance() called without options",
					Logger.getStackInfo(),
				);
			}
		}
		return Logger.instance;
	}

	static error2string(err) {
		return err.stack == undefined ? "" : err.stack;
		// err.message.concat("\n").concat(err.name).concat("\n").concat(
	}

	static args2string(arg) {
		let retVal = "";
		arg.forEach(row => {
			if (typeof row == "object") {
				if (row instanceof Map) {
					row = ObjectUtils.map2object(row);
				} else if (row.constructor.name.includes("Error")) {
					retVal = row.stack || "";
				} else {
					retVal = retVal.concat(JSON.stringify(row, null, 4)).concat("\n");
				}
			} else {
				retVal = retVal.concat(row).concat("\n");
			}
		});
		// @todo get source path from project settings.json
		return retVal
			.substr(0, retVal.length - 1)
			.replace(new RegExp("dist/static/js", "g"), "src");
	}

	writeConsole(level, pars, line = false) {
		if (!this.opts.transports.console.active) return;
		const frmtr = Formatter.getInstance();
		let stamp = frmtr.date(new Date(), this.opts.transports.console.format);
		if (line) {
			console.log("-".repeat(this.lineLenght));
		} else {
			console.log(stamp, level, pars);
		}
	}

	writeFile(file, level, args, line = false) {
		this.writeUdf(level, args);
		if (!this.opts.transports.file.active) return;
		const frmtr = Formatter.getInstance();
		let stamp = frmtr.date(new Date(), this.opts.transports.file.format);
		let msg = line ? "-".repeat(this.lineLenght) : `${stamp} ${level} ${args}`;
		FileUtils.writeFile(
			"",
			join(this.opts.transports.file.dir, file),
			msg,
			false,
			"a",
		);
	}

	static getStackInfo() {
		// Stack trace format :
		// https://github.com/v8/v8/wiki/Stack%20Trace%20API
		let data = {
			method: "",
			path: "",
			line: "",
			pos: "",
			dir: "",
			file: "",
			stack: [""],
		};
		let err = new Error("");
		let idx = 1;
		let stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
		let stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;
		let stacklist = (err.stack || "").split("\n").slice(2);
		let sp = stackReg.exec(stacklist[idx]) || stackReg2.exec(stacklist[idx]);
		if (sp && sp.length === 5) {
			data.method = sp[1];
			data.path = sp[2];
			data.line = sp[3];
			data.pos = sp[4];
			data.stack = stacklist;
			["dist/src", "static/js", "src"].forEach(search => {
				let idx = data.path.indexOf(search);
				let len = search.length;
				if (idx >= 0) {
					let pth = data.path.substr(idx + len + 1);
					data.dir = dirname(pth);
					data.file = basename(pth);
				}
			});
		}
		return data;
	}

	/**
	 * Method to write to another transport, user defined
	 */
	writeUdf(level, args) {
		if (!this.opts.transports.udf || !this.udfLogging) return false;
		return this.udfLogging(level, args);
	}

	debug(...args) {
		if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "test") {
			return;
		}
		let stack = Logger.getStackInfo();
		args.unshift(
			`  [ ${stack.dir}/${stack.file}:${stack.line}:${stack.pos}, ${stack.method} ]`,
		);
		let pars = Logger.args2string(args);

		// In view of possible monkey patching console.debug...
		let log = Logger.getInstance();
		log.writeConsole("Debug".blue, pars);
		log.writeFile(log.fileAll, "debug", pars + "\n");
	}

	warn(...args) {
		let pars = Logger.args2string(args);
		this.writeConsole("Warn ".red, pars);
		this.writeFile(this.fileAll, "warning", pars + "\n");
		if (this.opts.playSoundOn.warning) {
			// Taken from https://www.soundjay.com/
			SysUtils.playFile(join("bin", "writing-signature-1.mp3"));
		}
	}

	info(...args) {
		let pars = Logger.args2string(args);
		this.writeConsole("Info ".green, pars);
		this.writeFile(this.fileAll, "info", pars + "\n");
	}

	sql(...args) {
		let tmp = this.opts.logDatabase;
		if (!tmp) return;
		let pars = Logger.args2string(args);
		this.writeConsole("Info ".green, pars);
		this.opts.logDatabase = false;
		this.writeFile(this.fileDatabase, "", pars + "\n");
		this.opts.logDatabase = tmp;
	}

	error(...args) {
		let pars = Logger.args2string(args);
		this.writeConsole("Error".red, pars);
		this.writeFile(this.fileError, "error", pars + "\n");
		if (this.opts.playSoundOn.error) {
			// Taken from https://www.soundjay.com/
			SysUtils.playFile(join("bin", "writing-signature-1.mp3"));
		}
		if (this.opts.exitOnError) {
			this.isShuttingDown = true;
			if (this.shutdown) {
				this.shutdown(); // Graceful shutdown
			}
			process.exit(-1);
		}
	}

	/**
	 * Write a line to separate groups of log entries
	 */
	separatorLine(file, level) {
		this.writeConsole(level, "", true);
		this.writeFile(file, level, "", true);
	}
}
