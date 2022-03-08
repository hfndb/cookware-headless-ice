"use strict";

import date from "date-and-time";
import { AppConfig } from "./config.mjs";

/**
 * Utility class for strings
 */
export class StringExt {
	/**
	 * Count occurrences of a string within a string
	 */
	static occurrences(str, searchFor) {
		let re = new RegExp(`(${searchFor})`, "g");
		let result = str.match(re) || [];
		return result.length;
	}

	/**
	 * str.strip() removes both leading and trailing spaces. Hence...
	 */
	static strip(str, begin, end) {
		let regex = "";
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
	static matchAll(exp, str) {
		let toReturn = [];
		let re = new RegExp(exp, "gim"); // Global, case insensitive, multiline
		let result;
		while ((result = re.exec(str)) !== null) {
			let rw = [];
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
	static initialCapitalized(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Convert number of bytes to readable
	 */
	static bytesToSize(bytes) {
		if (bytes == 0) return "0 Byte";
		let sizes = ["Bytes", "KB", "MB", "GB", "TB"];

		// Values
		let vals = new Array(sizes.length);
		vals.fill(0, 0, sizes.length);

		let factor = 1024,
			prev = bytes;
		for (let i = 0; bytes > 0 && i < sizes.length; i++) {
			bytes = Math.floor(bytes / factor);
			vals[i] = prev - bytes * factor;
			prev = bytes;
		}

		let rt = [];
		for (let i = sizes.length - 1; i >= 0; i--) {
			if (vals[i] == 0) continue;
			rt.push(`${vals[i]} ${sizes[i]}`);
		}

		return new Intl.ListFormat("en").format(rt);
	}

	/**
	 * Micro- or milliseconds to readable
	 *
	 * @param {number} bytes
	 * @param {boolean} isMicro True if micro, false if micro
	 */
	static microSeconds2string(ms, isMicro = true) {
		ms = Math.floor(ms);
		let nts = [
			"microseconds",
			"milliseconds",
			"seconds",
			"minutes",
			"hours",
			"days",
		];
		let start = isMicro ? 0 : 1;

		// Values
		let vals = new Array(nts.length);
		vals.fill(0, 0, nts.length);

		let factor,
			prev = ms;
		for (let i = start; ms > 0 && i < nts.length; i++) {
			switch (i) {
				case 0: // micro
				case 1: // milli
				case 2: // seconds
					factor = 1000;
					break;
				case 3: // minutes
				case 4: // hours
					factor = 60;
					break;
				case 5: // days
					factor = 24;
					break;
			}

			ms = Math.floor(ms / factor);
			vals[i] = prev - ms * factor;
			prev = ms;
		}

		let rt = [];
		for (let i = nts.length - 1; i >= 0; i--) {
			if (vals[i] == 0) continue;
			rt.push(`${vals[i]} ${nts[i]}`);
		}

		return new Intl.ListFormat("en").format(rt);
	}

	/**
	 * Get a random string
	 */
	static getRandom(length) {
		let begin = parseInt("1".padEnd(length, "0"));
		let end = parseInt("9".padEnd(length, "9"));
		// Make the end exclusive, the beginning inclusive
		let rndm = Math.floor(Math.random() * (end - begin)) + begin;
		return rndm.toString();
	}
}

/**
 * Generic formatting of Date objects and numbers
 */
export class Formatter {
	static instance;

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
	static getInstance() {
		if (!Formatter.instance) {
			Formatter.instance = new Formatter();
		}
		return Formatter.instance;
	}

	// Date type
	date(dt, format = "") {
		return date.format(dt, format ? format : this.formatDate);
	}

	time(dt, format = "") {
		return date.format(dt, format ? format : this.formatTime);
	}

	datetime(dt, format = "") {
		return date.format(dt, format ? format : this.formatDateTime);
	}

	// Number type, could also be done using Intl.NumberFormat()
	decimal(nr, decimals, prefix = "", suffix = "") {
		if (!nr) return "";
		let vars = {
			behindComma: "",
			minus: nr < 0 ? "-" : "",
			part: 0,
			rem: nr,
			org: nr.toString(),
			pos: -1,
		}; // Object like this is handy for debugging

		// Remainder % causes float difference. So...
		vars.pos = vars.org.indexOf(".");
		if (vars.pos > 0 && decimals) {
			let tmp = vars.org.substring(vars.pos + 1); // To string behind comma
			// Insert comma for rounding
			tmp = tmp.substring(0, decimals) + "." + tmp.substring(decimals);
			tmp = parseFloat(tmp); // To float for rounding

			vars.behindComma =
				this.decimalSeparator +
				Math.round(tmp)
					.toString()
					.padEnd(decimals, "0");
		}
		if (vars.pos > 0) {
			vars.rem = parseInt(vars.org.substring(0, vars.pos));
		}

		// First collect parts in groups of thousands
		let parts = [];
		while (vars.rem) {
			vars.part = vars.rem % 1000;
			vars.rem = (vars.rem - vars.part) / 1000;
			parts.unshift(vars.part);
		}

		// Then compose a return value
		let rt = prefix + vars.minus;
		for (let i = 0; i < parts.length; i++) {
			vars.part = parts[i];
			if (i == 0) {
				rt += vars.part.toString();
			} else {
				rt += vars.part.toString().padStart(3, "0");
			}
			if (parts[i + 1]) rt += this.thousandsSeparator;
		}

		return rt + vars.behindComma + suffix;
	}

	int(nr) {
		return this.decimal(nr, 0);
	}

	/**
	 * Code from https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
	 */
	static slugify(string) {
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
