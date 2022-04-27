"use strict";

/**
 * Generic reporting mechanism, consisting of 3 classes: Report, Group, Item.
 *
 * Use a Report instance like report instance to feed a template engine.
 * The variables 'report' and 'report.groups[group]' include arrays averages[], min[] and max[]
 *   (related to array report.groups[group].columns) - type int or float.
 *
 * @example:
 * // Headers that should reoccur for each report group
 * let report = new Report([
 * 	"Row description",
 * 	"Column A",
 * 	"Column B",
 * 	"Column C",
 * ]);
 *
 * // Start of a new group
 * let group = new Group(report, "Group description");
 *
 * // Item in group
 * let item = new Item(report, "Item description");
 * item.columns = [17,6,12];
 * group.addItem(report, item); // parameter 'report' is added to prevent an internal circular reference.
 * // After addding:
 * // - item.total will contain row total of columns   type int or float.
 * // - group aggregates will be be calculated
 *
 * report.addGroup(group);
 * // After addding:
 * // - report aggregates will be be calculated
 *
 * report.finalize(); // Will add last column to report aggregates
 *
 * console.log(report);
 */

/**
 * Line in report
 *
 * @property {*[]} columns
 * @property {string} columns
 */
export class Item {
	total = 0; // Total of all columns

	/**
	 * @param {Report|String[]} report Instance of Report or array with columns
	 * @param {string} description
	 */
	constructor(report, description) {
		// Create one column more than number of columns
		this.columns = Report.createColumns(report);
		this.description = description;
	}
}

/**
 * Group in report
 *
 * @property {number[]} averages
 * @property {number} itemCount
 * @property {number[]} items 
 * @property {number[]} min 
 * @property {number[]} max
 * @property {number[]} percentages 
 *
 * Inherited from Item
 * @property {*[]} columns
 * @property {string} columns
 */
export class Group extends Item {
	/**
	 * @param {Report|String[]} report Instance of Report or array with columns
	 * @param {string} description
	 */
	constructor(report, description) {
		super(report, description);
		// Create one column more than number of columns
		this.averages = Report.createColumns(report);
		this.itemCount = 0;
		this.items = [];
		this.min = Report.createColumns(report, "undefined");
		this.max = Report.createColumns(report);
		this.percentages = Report.createColumns(report);
	}

	/**
	 * @param {Report} report Instance of Report
	 * @param {Item} item
	 */
	addItem(report, item) {
		this.itemCount++;
		this.items.push(item);
		Report.processItem(item, this); // Update item total and group totals
		report.addItem(item); // Update report totals
	}
}

/**
 * Highest level of report
 *
 * @property {string[]} columnHeaders 
 * @property {Group[]} groups 
 *
 * Inherited from Item
 * @property {*[]} columns
 * @property {string} columns
 *
 * Inherited from Group 
 * @property {number[]} averages
 * @property {number} itemCount
 * @property {number[]} items 
 * @property {number[]} min 
 * @property {number[]} max
 * @property {number[]} percentages 
 */

export class Report extends Group {
	/**
	 * @param {string[]} columnHeaders
	 * @param {string} description Of descriptive left column if any
	 */
	constructor(columnHeaders, description = "") {
		super(columnHeaders, description);
		this.columnHeaders = columnHeaders;
		this.groups = [];
	}

	/**
	 * @param {Group} group
	 */
	addGroup(group) {
		if (group.itemCount == 0) return;
		Report.finalizeAggregates(group);
		this.groups.push(group);
	}

	/**
	 * @param {Item} item
	 */
	addItem(item) {
		Report.processItem(item, this);
		this.itemCount++;
	}

	finalize() {
		Report.finalizeAggregates(this);
	}

	/**
	 * @param {Report|String[]} report
	 * @param {number|string} initialValue
	 * @returns {*[]}
	 */
	static createColumns(report, initialValue = 0) {
		// For calculationg minimum
		if (initialValue == "undefined") initialValue = undefined;

		let nrColumns =
			report instanceof Report ? report.columnHeaders.length : report.length;
		let rt = new Array(nrColumns);

		return rt.fill(initialValue, 0);
	}

	/**
	 * @param {Item} item
	 * @param {Group|Report} registrar
	 */
	static processItem(item, registrar) {
		// In item: Update columns[], total in item
		// In registrar: Min and max values of rows
		let cols = registrar.columns.length; // nr of columns
		let sum = 0;
		for (let col = 0; col < cols; col++) {
			let val = item.columns[col];
			if (typeof val != "number" || val == null || !val) continue;
			sum += val;
			registrar.columns[col] += val;
			registrar.min[col] =
				registrar.min[col] == undefined ? val : Math.min(registrar.min[col], val);
			registrar.max[col] = Math.max(registrar.max[col], val);
		}
		item.total = sum; // Total of all columns in item

		// Registrar: Update percentages[], averages[], total of all items
		registrar.total += sum; // Total of all columns in item
		for (let col = 0; col < cols; col++) {
			let ratio = 0;
			let total = registrar.total;
			if (registrar.columns[col] == 0 || total == 0) {
				registrar.percentages[col] = 0;
			} else {
				ratio = registrar.columns[col] / total;
				registrar.percentages[col] = ratio * 100;
			}
			registrar.averages[col] = registrar.columns[col] / registrar.itemCount;
		}
	}

	/**
	 * @param {Group|Report} registrar
	 */
	static finalizeAggregates(registrar) {
		let step = 1;

		registrar.percentages.push(100);

		let tmp = registrar.total / registrar.itemCount;
		registrar.averages.push(tmp || 0);

		// Use only filled elements in array, otherwise NaN
		let cof = (acc, current) => {
			if (current == null || current == undefined) return acc;
			if (acc == undefined) return current;
			return step == 1 ? Math.min(acc, current) : Math.max(acc, current);
		};

		tmp = registrar.min.reduce(cof, undefined);
		registrar.min.push(tmp || 0);
		step++;

		tmp = registrar.max.reduce(cof, undefined);
		registrar.max.push(tmp || 0);
	}
}
