import { basename, dirname, join } from "path";
import { AudioUtils } from "./audio";
import { FileUtils } from "./files";
import { Formatter } from "./utils";
const color = require("colors/safe");

interface PlaySound {
	error: boolean;
	warning: boolean;
}

interface Transport {
	active: boolean;
	dir: string;
	format: string;
}

interface LogConfig {
	logDatabase?: boolean;
	dir: string;
	exitOnError: boolean;
	level: string;
	transports: { [key: string]: Transport };
	playSoundOn: PlaySound;
}

/**
 * Organize logging to application logfiles and possibly console
 */
export class Logger {
	private opts: LogConfig;
	private fileAll: string = "";
	private fileDatabase: string = "";
	private fileError: string = "";
	private lineLenght: number = 80; // For writeConsole() etc.

	/**
	 * Indicating that the application is in the process of shutting down,
	 * after logging a thrown error and throwing a fresh error to escalate.
	 */
	isShuttingDown: boolean = false;

	/**
	 * Function to be set for graceful shutdown
	 */
	shutdown: Function | null;

	/**
	 * Function for user defined logging
	 */
	udfLogging: Function | null = null;

	static instance: Logger;

	constructor(options: LogConfig) {
		this.shutdown = null;
		this.opts = options;
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

		if (this.opts.transports.file.active) {
			FileUtils.mkdir(this.opts.transports.file.dir);
		}
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance(options?: LogConfig): Logger {
		if (!Logger.instance) {
			if (options) {
				Logger.instance = new Logger(options);
			} else {
				console.log(
					"Programming error? Logger.getInstance() called without options"
				);
			}
		}

		return Logger.instance;
	}

	static error2string(err: Error): string {
		return err.stack == undefined ? "" : err.stack;
		// err.message.concat("\n").concat(err.name).concat("\n").concat(
	}

	static args2string(arg: any[]): string {
		let retVal = "";
		arg.forEach((row: string) => {
			if (typeof row == "object") {
				retVal = retVal.concat(JSON.stringify(row, null, 4)).concat("\n"); //@@
			} else {
				retVal = retVal.concat(row).concat("\n");
			}
		});
		return retVal.substr(0, retVal.length - 1);
	}

	private writeConsole(level: string, pars: string, line = false) {
		if (!this.opts.transports.console.active) return;
		const frmtr = Formatter.getInstance();
		let stamp = frmtr.date(new Date(), this.opts.transports.console.format);
		if (line) {
			console.log("-".repeat(this.lineLenght));
		} else {
			console.log(stamp, level, pars);
		}
	}

	private writeFile(
		file: string,
		level: string,
		args: string,
		line = false
	): void {
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
			"a"
		);
	}

	private getStackInfo(): object {
		// Stack trace format :
		// https://github.com/v8/v8/wiki/Stack%20Trace%20API
		let data = {
			method: "",
			path: "",
			line: "",
			pos: "",
			dir: "",
			file: "",
			stack: [""]
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

			["dist/src", "static/js"].forEach(search => {
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
	public writeUdf(level: string, args: string): boolean {
		if (!this.opts.transports.udf || !this.udfLogging) return false;
		return this.udfLogging(level, args);
	}

	public debug(...args: any[]): void {
		if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "test") {
			return;
		}
		let stack: any = this.getStackInfo();
		args.unshift(
			`  [ ${stack.dir}/${stack.file}:${stack.line}:${stack.pos}, ${
				stack.method
			} ]`
		);
		let pars = Logger.args2string(args);
		this.writeConsole(color.blue("Debug"), pars);
		this.writeFile(this.fileAll, "debug", pars + "\n");
	}

	public warn(...args: any[]): void {
		let pars = Logger.args2string(args);
		this.writeConsole(color.red("Warn "), pars);
		this.writeFile(this.fileAll, "warning", pars + "\n");
		if (this.opts.playSoundOn.warning) {
			// Taken from https://www.soundjay.com/
			AudioUtils.playFile(join("bin", "writing-signature-1.mp3"));
		}
	}

	public info(...args: any[]): void {
		let pars = Logger.args2string(args);
		this.writeConsole(color.green("Info "), pars);
		this.writeFile(this.fileAll, "info", pars + "\n");
	}

	public sql(...args: any[]): void {
		let tmp = this.opts.logDatabase;
		if (!tmp) return;
		let pars = Logger.args2string(args);
		this.writeConsole(color.green("Info "), pars);
		this.opts.logDatabase = false;
		this.writeFile(this.fileDatabase, "", pars + "\n");
		this.opts.logDatabase = tmp;
	}

	public error(...args: any[]): void {
		let pars = Logger.args2string(args);
		this.writeConsole(color.red("Error"), pars);
		this.writeFile(this.fileError, "error", pars + "\n");
		if (this.opts.playSoundOn.error) {
			// Taken from https://www.soundjay.com/
			AudioUtils.playFile(join("bin", "writing-signature-1.mp3"));
		}
		if (this.opts.exitOnError) {
			this.isShuttingDown = true;
			if (this.shutdown == null) {
				throw new Error();
			} else {
				this.shutdown(); // Graceful shutdown
			}
			process.exit(-1);
		}
	}

	/**
	 * Write a line to separate groups of log entries
	 */
	public separatorLine(file: string, level: string) {
		this.writeConsole(level, "", true);
		this.writeFile(file, level, "", true);
	}
}
