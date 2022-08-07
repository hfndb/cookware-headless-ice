"use strict";
import { isAbsolute, join } from "node:path";
import { AppConfig, FileUtils } from "../index.mjs";
import { StringExt } from "../utils.mjs";

// ----------------------------------------------------
// Section: For internal usage
// ----------------------------------------------------

/**
 * Carefully deal with the content of CSS selectors with rule sets,
 * while processing output of the Dart Sass transcompiler.
 *
 * This needs specific attention, to not mess up selectors and
 * property declarations with values using filter() and url().
 */
class CssRuleSet {
	canContinue = false;

	/**
	 * @private
	 */
	ruleNr = 0;

	/**
	 * @private
	 */
	isFirst = true;

	/**
	 * @private
	 */
	needsRemainder = false;
	/**
	 * @private
	 * Status:
	 * - 0 Beginning of selector
	 * - 1 Somewhere in selector
	 * - 2 Within rule set
	 */
	status = 0;

	/**
	 * @private
	 * @param {string} line
	 * @param {boolean} prefixSpaceAdded
	 */
	inSelector(line, prefixSpaceAdded) {
		this.canContinue = false;
		let last = line.endsWith("{");
		if (!prefixSpaceAdded) {
			// Don't mess up selectors, preserve space between 'em
			line = " " + line;
		}
		if (last) {
			this.status = 2;
		}
		this.canContinue = true;

		return line;
	}

	/**
	 * @private
	 * @param {string} line
	 */
	inRuleSet(line) {
		this.canContinue = true;
		let last = line.endsWith("}");

		// Remove space after 1st : between property and property value
		line = line.replace(": ", ":"); // Will only replace first occurence

		if (last) {
			// End of rule sets
			this.canContinue = false;
			this.ruleNr++;
			this.status = 0;
			return line;
		}

		return line;
	}

	/**
	 * @param {string} line
	 * @returns {string} for line
	 */
	processLine(line) {
		let prefixSpaceAdded = false;

		// At the beginning of a selector
		if (this.status == 0) {
			// Space as prefix, necessary?
			if (!this.isFirst) {
				line = " " + line;
				prefixSpaceAdded = true;
			}
			if (this.isFirst) this.isFirst = false;
			this.status = 1;
		}

		switch (this.status) {
			case 1:
				line = this.inSelector(line, prefixSpaceAdded);
				break;
			case 2:
				line = this.inRuleSet(line);
				break;
		}

		return line;
	}
}

// ----------------------------------------------------
// Section: Exported
// ----------------------------------------------------

/**
 * Compact an already rendered or transcompiled file.
 * Known as file compression, minifying, to reduce bytes to send to browser.
 *
 * What this really is?
 * - Merging all lines into 1 line.
 * - Removing hiearchy (code indenting)
 * - Removing spaces as in space needed to think about what's next
 */
export class Stripper {
	/**
	 * @param {string} ft File type; css, html or js
	 * @param {string[]} [after] List of commands which needs space after them
	 * @param {string[]} [around] Dito but around
	 * @param {string[]} [before[]] Dito but before
	 */
	constructor(ft, after, around, before) {
		this.fileType = ft;
		this.after = after || [];
		this.around = around || [];
		this.before = before || [];

		this.cm = {
			sl: /\s\/\/\s(.)+/, // Single line comment starts with
			mss: "/*", // Multi line comment starts with
			mse: "*/", // Multi line comment end with
		};
		// For css and js the same.
		// Html ignored since comments should be filtered out by template engine
	}

	/** Remove comments, leave line numbering as is
	 * @param {string} src File type js
	 */
	removeComments(src) {
		let mlnComment = false, // Is in multi line comment
			lines = src.split(/\r?\n/),
			result,
			toReturn = "";

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();

			// Handle single line comments
			result = this.cm.sl.exec(line) || null;
			if (result) {
				// Strip single line comment
				line = line.substring(0, result.index).trim();
			}

			// Handle multi line comments
			if (line.startsWith(this.cm.mss)) {
				if (!line.endsWith(this.cm.mse)) mlnComment = true;
				line = "";
			}
			if (mlnComment) {
				if (line.endsWith(this.cm.mse)) mlnComment = false;
				line = "";
			}
			toReturn += line + "\n";
		}
		return toReturn;
	}

	/**
	 * @param {string} src File type; css, html or js
	 */
	stripFile(src) {
		let crs = this.fileType == "css" ? new CssRuleSet() : null,
			mlnComment = false, // Is in multi line comment
			mlnTemplate = 0, // Status of multi line templates in js
			lines = src.split(/\r?\n/),
			result,
			toReturn = "";

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].trim();

			if (i == 0) {
				// First line with charset
				toReturn += line;
				continue;
			}
			if (!line) continue; // Empty line

			// Strip single line comment
			result = this.cm.sl.exec(line) || null;
			if (result) {
				line = line.substring(0, result.index).trim();
			}

			// Handle multi line comments
			if (line.startsWith(this.cm.mss)) {
				if (!line.endsWith(this.cm.mse)) mlnComment = true;
				continue;
			}
			if (mlnComment) {
				if (line.endsWith(this.cm.mse)) mlnComment = false;
				continue;
			}

			// Make sure that there's a space between rule sets
			// and only what's WITHIN a rule sets is stripped
			if (crs) {
				line = crs.processLine(line);
				if (crs.canContinue) {
					toReturn += line;
					continue;
				}
			}

			// Handle multiline string templates in JavaScript
			if (
				this.fileType == "js" &&
				!mlnTemplate &&
				line.includes("`") &&
				StringExt.occurrences(line, "`") == 1
			) {
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
			if (this.fileType == "html") {
				if (!line.endsWith(">")) line += " ";
			} else {
				line = this.stripLine(line);
			}
			toReturn += line;
		}
		return toReturn;
	}

	/**
	 * Strip empty space within a line
	 *
	 * @param {string} line
	 * @todo Still needs to be improved further
	 */
	stripLine(line) {
		let keyword,
			preserve,
			rt = "",
			str,
			words = line.split(" ");
		for (let i = 0; i < words.length; i++) {
			str = words[i];
			[keyword, preserve] = this.preserveSpace(str);
			if (preserve == 2) {
				// Add space before keyword
				str = ` ${str}`;
			}
			if (this.isInString(rt + str) || preserve > 0) {
				// Add space after keyword
				str += " ";
			}
			rt += str;
		}

		return rt;
	}

	/**
	 * Check whether space is within encapculated string
	 *
	 * @param {string} str
	 * @todo Within template string, escaped double quotes also count. Fix.
	 */
	isInString(str) {
		let sq = StringExt.occurrences(str, "'"); // single quotes
		let dq = StringExt.occurrences(str, '"'); // double quotes
		let cm = StringExt.occurrences(str, "/"); // comment like /* */
		return sq % 2 != 0 || dq % 2 != 0 || cm % 2 != 0;
	}

	/**
	 * Check wether spaces is to be preserved based on defined keywords
	 *
	 * @private
	 * @param {string} part
	 */
	preserveSpace(part) {
		let rt;
		for (let i = 0; i < this.after.length && !rt; i++) {
			if (part.endsWith(this.after[i])) {
				rt = [this.after[i], 1];
			}
		}
		for (let i = 0; i < this.around.length && !rt; i++) {
			if (part.endsWith(this.around[i])) {
				rt = [this.around[i], 2];
			}
		}
		return rt || ["", 0];
	}

	/**
	 * Remove imports at the top of a source file.
	 * While doing so, also strip exports.
	 *
	 * @param {string} src
	 */
	static stripImports(src) {
		let lines = src.split("\n");
		for (let i = 0; i < lines.length; i++) {
			// Strip import statement
			if (lines[i].startsWith("import")) {
				lines[i] = ""; // Don't desorientate sourcemap
			}
			// If import statements are obsolete, then exports too
			if (lines[i].startsWith("exports.")) {
				lines[i] = ""; // Don't desorientate sourcemap
			} else if (lines[i].startsWith("export ")) {
				lines[i] = lines[i].replace("export ", "");
			}
		}
		return lines.join("\n");
	}

	/**
	 * @param {string} source
	 */
	static stripCss(source) {
		let s = new Stripper("css");
		return s.stripFile(source);
	}

	/**
	 * @param {string} source
	 * @param {boolean} [override]
	 * @todo Also consider content of HTML code and pre tags
	 */
	static stripHtml(source, override) {
		let strip = override;
		if (strip == undefined) {
			let cfg = AppConfig.getInstance();
			strip = cfg.options.html.stripper.active;
		}
		if (!strip) return source;
		let s = new Stripper("html");
		return s.stripFile(source);
	}

	/**
	 * @param {string} source
	 */
	static stripJs(source, removeComments = false) {
		let cfg = AppConfig.getInstance();
		let spaces = cfg.options.javascript.lineStripping.needsSpace;
		let s = new Stripper("js", spaces.after, spaces.around, spaces.before);
		return removeComments ? s.removeComments(source) : s.stripFile(source);
	}

	/**
	 * To prepare production environment; remove obsolete files.
	 * Method written for cookware-texts.
	 *
	 * @param {string} dir
	 * @param {string} ext
	 * @param {boolean} stripped Remove originals (true) or stripped versions (false)
	 * @param {string} suffix
	 */
	static removeObsoleteFiles(dir, ext, stripped, suffix = "") {
		let cfg = AppConfig.getInstance();
		if (!suffix) suffix = cfg.options.stripping.suffix;

		let fi,
			file,
			files = FileUtils.getFileList(dir, {
				allowedExtensions: [ext],
				recursive: true,
			});

		for (let i = 0; i < files.length; i++) {
			file = files[i];
			fi = FileUtils.getFileInfo(isAbsolute(file) ? "" : cfg.dirProject, file);

			if (stripped) {
				if (!fi.file.stem.includes(suffix)) continue;
				// Original to remove
				file = fi.full.replace(`-${suffix}`, "");
			} else {
				if (fi.file.stem.includes(suffix)) continue;
				// Stripped version to remove
				file = join(fi.path.full, `${fi.file.stem}-${suffix}${fi.file.ext}`);
			}

			FileUtils.rmFile(file); // Remove if exists
		}
	}
}
