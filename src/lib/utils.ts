const date = require("date-and-time");
import { AppConfig } from "./config";

/**
 * Utility class for strings
 */
export class StringExt {
	/**
	 * Count occurrences of a string within a string
	 */
	static occurrences(str: string, searchFor: string): number {
		let searchFrom = 0;
		let retVal = 0;

		while (str.indexOf(searchFor, searchFrom) >= 0) {
			retVal++;
			searchFrom = str.indexOf(searchFor, searchFrom) + 1;
		}
		return retVal;
	}

	/**
	 * str.strip() removes both leading and trailing spaces. Hence...
	 */
	static strip(str: string, begin: boolean, end: boolean): string {
		let regex: string = "";
		if (begin && !end) {
			regex = "^[\\t\\s]*(.*)$";
		} else if (!begin && end) {
			regex = "^*(.*)[\\t\\s]*$";
		} else {
			regex = "^[\\t\\s]*(.*)[\\t\\s]*$";
		}

		let result = new RegExp(regex).exec(str);
		return result ? result[1] : "";
	}

	/**
	 * Return array with all matches of a pattern with groups
	 */
	static matchAll(exp: string, str: string): any[] {
		let toReturn: any[] = [];
		let re = new RegExp(exp, "gim"); // Global, case insensitive, multiline
		let result: any | null[];
		while ((result = re.exec(str)) !== null) {
			let rw: any[] = [];
			for (let i = 1; i < result.length; i++) {
				// Ignore element 0 with source line
				rw.push(result[i]);
			}
			toReturn.push(rw);
		}
		return toReturn;
	}

	/**
	 * Capitalize only the first character
	 */
	static initialCapitalized(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Convert number of bytes to readable
	 */
	static bytesToSize(bytes: number): string {
		let sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		if (bytes == 0) return "0 Byte";
		let i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
	}
}

/**
 * Generic formatting of Date objects and numbers
 */
export class Formatter {
	static instance: Formatter | null = null;
	formatDate: string;
	formatTime: string;
	formatDateTime: string;
	decimalSeparator: string;
	thousandsSeparator: string;

	constructor() {
		let cfg = AppConfig.getInstance();
		this.formatDate = cfg.options.formats.date;
		this.formatTime = cfg.options.formats.time;
		this.formatDateTime = cfg.options.formats.datetime;
		this.decimalSeparator = cfg.options.formats.decimalSeparator;
		this.thousandsSeparator = cfg.options.formats.thousandsSeparator;
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance(): Formatter {
		if (!Formatter.instance) {
			Formatter.instance = new Formatter();
		}

		return Formatter.instance;
	}

	// Date type
	date(dt: Date, format: string = ""): string {
		return date.format(dt, format ? format : this.formatDate);
	}

	time(dt: Date, format: string = ""): string {
		return date.format(dt, format ? format : this.formatTime);
	}

	datetime(dt: Date, format: string = ""): string {
		return date.format(dt, format ? format : this.formatDateTime);
	}

	// Number type

	decimal(
		nr: number,
		decimals: number,
		prefix: string = "",
		suffix: string = ""
	): string {
		if (!nr) return "";
		if (decimals == 0) return this.int(nr);

		let beforeComma = Math.trunc(nr);
		let behindComma = Math.round(Math.abs(nr % 1) * Math.pow(10, decimals));

		return (
			prefix +
			this.int(beforeComma) +
			this.decimalSeparator +
			behindComma.toString().padEnd(decimals, "0") +
			suffix
		);
	}

	int(nr: number): string {
		if (!nr) return "";
		if (!Number.isInteger(nr)) {
			nr = Math.round(nr);
		}

		let isNegative = nr < 0;
		let portion: number;
		let thousands: number[] = [];
		nr = Math.abs(nr);
		while (nr) {
			portion = nr % 1000;
			thousands.push(portion);
			nr -= portion;
			if (nr) nr /= 1000;
		}

		return (
			(isNegative ? "-" : "") + thousands.reverse().join(this.thousandsSeparator)
		);
	}

	/**
	 * Code from https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
	 */
	static slugify(string: string): string {
		const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź'·/_,:;";
		const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz-------";
		const p = new RegExp(a.split("").join("|"), "g");

		return string
			.toString()
			.toLowerCase()
			.replace(/\s+/g, "-") // Replace spaces with -
			.replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
			.replace(/&/g, "-and-") // Replace & with 'and'
			.replace(/[^\w\-]+/g, "") // Remove all non-word characters
			.replace(/\-\-+/g, "-") // Replace multiple - with single -
			.replace(/^-+/, "") // Trim - from start of text
			.replace(/-+$/, ""); // Trim - from end of text
	}
}
