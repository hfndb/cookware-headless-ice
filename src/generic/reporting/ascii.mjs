"use strict";
import { Formatter } from "../utils.mjs";
import { Group, Item, Report } from "./index.mjs";

/** @typedef AsciiColumn
 *
 * Options for column in report
 *
 * @property {string} caption
 * @property {string} [type] string (default), int, decimals, float, date, datetime
 * @property {number} [decimals] Required for float values
 * @property {number} [width] For ASCII fixed length. Default 50
 */

/** @typedef AsciiOptions
 *
 * Options for constructor of class Ascii
 *
 * @property {AsciiColumn[]} columns
 * @property {string} columnSeparator Between columns
 * @property {string} rowSeparator Line end
 * @property {boolean} [autoWidth] Default false. Aka .csv or .tsv so no ascii fixed length
 * @property {boolean} [includeItemCount] Default true
 * @property {boolean} [includeAggregates] Default true
 * @property {string} [rowPrefix] Before first column
 * @property {string} [rowSuffix] After last column, before rowSeparator
 */

/**
 * Transform report output to ASCII fixed length, CSV or TSV
 *
 * @see https://en.wikipedia.org/wiki/Comma-separated_values
 * @see https://en.wikipedia.org/wiki/Tab-separated_values
 *
 * @example:
 * // Get .tsv output:
 * let sc = new Ascii({
 *   autoWidth: true, // Aka no ascii fixed length
 *   columns: [
 *     {
 *        caption: "Test"
 *     }
 *   ],
 *   columnSeparator: "\t",
 *   rowSeparator: "\n",
 * });
 * let data = Ascii.getAscii(report, sc);
 */
export class Ascii {
	/**
	 * @type {Formatter}
	 */
	static frmt;

	// For column which will be inserted at the left side
	aggregates = {
		active: true,
		captions: {
			avg: "Average",
			max: "Most",
			min: "Least",
			per: "Percentage",
			sum: "Total",
		},
		width: 12,
	};

	// In case of not ASCII fixed length
	autoWidth = false;

	// Add item count below group header, above group items?
	itemCount = {
		active: true,
		caption: "Item count",
	};

	reportSummary = "Report summary - #0# items in #1# groups";

	row = {
		seperator: "\n",
		prefix: "",
		suffix: "",
	};

	// Add additional column at the right side for item total?
	total = {
		active: true,
		caption: "Total",
		width: 12,
	};

	/**
	 * @param {AsciiOptions} opts
	 */
	constructor(opts) {
		// Required options
		this.columns = opts.columns;
		this.columnSeparator = opts.columnSeparator;

		// Optional options
		if (opts.rowSeparator != undefined) this.row.seperator = opts.rowSeparator;
		if (opts.rowPrefix != undefined) this.row.prefix = opts.rowPrefix;
		if (opts.rowSuffix != undefined) this.row.suffix = opts.rowSuffix;

		// Boolean optional options
		this.autoWidth = opts.autoWidth == undefined ? false : opts.autoWidth;

		if (opts.includeAggregates != undefined)
			this.aggregates.active = opts.includeAggregates;

		if (opts.includeItemCount != undefined)
			this.itemCount.active = opts.includeItemCount;

		// Prepare formatter for usage in method getValue()
		if (!Ascii.frmt) Ascii.frmt = new Formatter();
	}

	/**
	 * Transform data to string
	 *
	 * @private
	 * @param {number} idx Of column
	 * @param {*} value
	 * @param {string} [type]
	 * @returns {string}
	 */
	getValue(idx, value, type) {
		if (value == undefined || value == null || value == 0) return "";

		let col = this.columns[idx] || {};
		if (!type) {
			type = col.type;
		}

		switch (type) {
			case "date":
				return Ascii.frmt.date(value);
				break;
			case "datetime":
				return Ascii.frmt.datetime(value);
				break;
			case "int":
				return value == 0 ? "" : Ascii.frmt.int(value);
				break;
			case "decimals":
				return value == 0 ? "" : Ascii.frmt.decimal(value, col.decimals);
				break;
			default:
				return value.toString();
		}
	}

	/**
	 * Get column data
	 *
	 * @private
	 * @param {number} idx Of column
	 * @param {string} value
	 * @param {number} width In case of aggregate
	 * @returns {string}
	 */
	getColumn(idx, value, width = 0) {
		let isAggregate = width == undefined;
		if (!this.autoWidth && !width) {
			let col = this.columns[idx] || {};
			width = col.width || 50;
		}
		let str = this.getValue(idx, value, isAggregate ? "float" : undefined);

		return (this.autoWidth ? str : str.padEnd(width, " ")) + this.columnSeparator;
	}

	/**
	 * Get string to end a line, somewhere in output
	 */
	getNewLine(isLast = false) {
		let r = this.row.suffix + this.row.seperator;
		if (!isLast) r += this.row.prefix;
		return r;
	}

	/**
	 * @param {Item} item with data
	 * @returns {string}
	 */
	getRow(item) {
		let rt = "";

		// Column data
		if (this.aggregates.active) {
			rt += this.getColumn(-1, item.description, this.aggregates.width);
		}
		for (let i = 0; i < item.columns.length; i++) {
			rt += this.getColumn(i, item.columns[i]);
		}
		if (this.total.active) {
			rt += this.getColumn(-1, item.total.toString(), this.total.width);
		}

		return rt + this.getNewLine();
	}

	/**
	 * Get aggregates for group or report
	 *
	 * @param {Group|Report} item
	 * @param {boolean} all Or only totals
	 * @returns {string}
	 */
	getAggregates(item, all) {
		if (!this.aggregates.active) return "";

		let ths = this,
			aggr = this.aggregates,
			rt = "";

		let addRow = (arr, total) => {
			for (let i = 0; i < arr.length; i++) {
				rt += ths.getColumn(i, arr[i]);
			}
			if (ths.total.active) {
				rt += this.getColumn(-1, total, ths.total.width);
			}
			rt += ths.getNewLine();
		};

		// Totals
		rt += this.getColumn(-1, aggr.captions.sum, aggr.width);
		let arr = item.columns;
		addRow(arr, item.total);

		if (!all) return rt + this.getNewLine();

		// Percentages
		rt += this.getColumn(-1, aggr.captions.per, aggr.width);
		arr = item.percentages;
		addRow(arr);

		// Averages
		rt += this.getColumn(-1, aggr.captions.avg, aggr.width);
		arr = item.averages;
		addRow(arr);

		// Minimums
		rt += this.getColumn(-1, aggr.captions.min, aggr.width);
		arr = item.min;
		addRow(arr);

		// Maximums
		rt += this.getColumn(-1, aggr.captions.max, aggr.width);
		arr = item.max;
		addRow(arr);

		return rt + this.getNewLine();
	}

	/**
	 * Get ASCII report output
	 *
	 * @param {Report} report
	 * @param {Ascii} sc
	 * @returns {string}
	 */
	static get(report, sc) {
		let aggr = sc.aggregates,
			group,
			nl = sc.getNewLine(),
			rt = sc.row.prefix;

		// ----------------------------------
		// Header with column labels
		// ----------------------------------

		// Column for aggregates
		if (aggr.active) {
			rt += sc.getColumn(-1, report.description, aggr.width);
		}

		// Column headers
		for (let i = 0; i < sc.columns.length; i++) {
			rt += sc.getColumn(-1, sc.columns[i].caption, sc.total.width);
		}
		if (sc.total.active) {
			rt += sc.getColumn(-1, sc.total.caption, sc.total.width);
		}
		rt += nl;

		// ----------------------------------
		// Groups
		// ----------------------------------
		for (let i = 0; i < report.groups.length; i++) {
			group = report.groups[i];
			// Group header
			rt += nl;
			rt += group.description + sc.getNewLine();

			// Item count in group
			if (sc.itemCount.active) {
				rt +=
					nl +
					sc.itemCount.caption +
					sc.columnSeparator +
					group.itemCount.toString() +
					nl +
					nl;
			}

			// Items in group
			for (let item = 0; item < group.items.length; item++) {
				rt += sc.getRow(group.items[item]);
			}

			// Group aggregates
			rt += nl + sc.getAggregates(group, true);
		}

		if (report.groups.length == 1) return rt + sc.getNewLine(true);

		// ----------------------------------
		// Report aggregates
		// ----------------------------------
		rt +=
			nl +
			sc.reportSummary
				.replace("#0#", report.itemCount.toString())
				.replace("#1#", report.groups.length.toString()) +
			nl +
			nl;

		for (let i = 0; i < report.groups.length; i++) {
			let grp = report.groups[i];
			rt += sc.getColumn(-1, grp.description, sc.aggregates.width);
			for (let c = 0; c < sc.columns.length; c++) {
				rt += sc.getColumn(c, grp.columns[c]);
			}
			if (sc.total.active) {
				rt += sc.getColumn(-1, grp.total, sc.total.width);
			}
			rt += nl;
		}
		rt += sc.getAggregates(report, true);

		return rt + sc.getNewLine(true);
	}
}
