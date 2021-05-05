import { StringExt } from "../lib/utils";
import { AppConfig, Logger } from "../lib";

/**
 * Compact an already rendered or transcompiled file.
 * Known as file compression, minifying, to reduce bytes to send to browser.
 *
 * What this really is?
 * - Merging all lines into 1 line.
 * - Removing hiearchy (code indenting)
 * - Removing spaces as in spaces needed to think about what's next
 */
class Stripper {
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
	 */
	isInString(str: string): boolean {
		let sq = StringExt.occurrences(str, "'"); // single quotes
		let dq = StringExt.occurrences(str, '"'); // double quotes
		return sq % 2 != 0 || dq % 2 != 0;
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
