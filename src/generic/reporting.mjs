"use strict";

/**
 * Generic reporting mechanism, consisting of 3 classes: Report, Group, Item.
 *
 * For usage info, see comments at Report class.
 *
 * @todo Implement items for plain text
 */

/**
 * Line in report
 */
export class Item {
	constructor(report, description) {
		let nrColumns =
			report instanceof Report ? report.columns.length : report.length;
		this.columns = Report.createColumns(nrColumns);
		this.description = description;
		this.isInitialized = false;
	}
}

/**
 * Group in report
 */
export class Group extends Item {
	static fakeMinumum = 123456789;

	constructor(report, description) {
		super(report, description);
		let nrColumns =
			report instanceof Report ? report.columns.length : report.length;
		this.averages = Report.createColumns(nrColumns);
		this.itemCount = 0;
		this.items = [];
		this.min = Report.createColumns(nrColumns, Group.fakeMinumum);
		this.max = Report.createColumns(nrColumns);
		this.percentages = Report.createColumns(nrColumns);
	}

	addItem(report, item) {
		this.itemCount++;
		this.items.push(item);
		report.update(item, this); // Update item total and group totals
		report.addItem(item); // Update report totals
	}
}

/**
 * Highest level of report. Usage:
 *
 *
 * let report = new Report([
 * 	"Row description",
 * 	"Column A",
 * 	"Column B",
 * 	"Column C",
 * ]); // Description followed by captions for columns A-C
 *
 * let group = new Group(report, "Group description");
 *
 * let item = new Item(report, "Item description");
 * item.columns[0] = 17;
 * item.columns[1] = 6;
 * item.columns[2] = 12;
 * // item.columns[3] will contain row total of previous columns  - autamatically calculated, type int or float.
 *
 * group.addItem(report, item); // parameter 'report' is added to prevent a circular reference.
 *
 * console.log(report);
 *
 *
 * Use variable 'report' to feed a template engine.
 * <br>The variables 'report' and 'report.groups[group]' includes arrays averages[], min[] and max[]
 *     (related to array report.groups[group].columns) - type int or float.
 */

export class Report extends Group {
	constructor(columnHeaders) {
		super(columnHeaders, "");
		this.columnHeaders = columnHeaders;
		this.groups = [];
	}

	/**
	 * For internal use only
	 */
	static createColumns(nrColumns, initialValue = 0) {
		let retVal = [];
		for (let i = 0; i < nrColumns; i++) {
			retVal.push(initialValue);
		}
		return retVal;
	}

	/**
	 * For internal use only
	 */
	update(item, registrar) {
		// Update columns[] - horizontal operations first
		let colTotal = registrar.columns.length - 1; // Index last column
		let sum = 0;
		for (let col = 0; col < colTotal; col++) {
			let val = item.columns[col];
			sum += val;
			registrar.columns[col] += val;
			registrar.columns[colTotal] += val; // Row total
			if (registrar.min[col] == Group.fakeMinumum) {
				registrar.min[col] = val;
			} else {
				registrar.min[col] = Math.min(registrar.min[col], val);
			}
			registrar.max[col] = Math.max(registrar.max[col], val);
		}
		if (!item.isInitialized) {
			item.columns[colTotal] = sum; // Item total
			item.isInitialized = true;
		}
		// Registrar: Update percentages[] and averages[]
		for (let col = 0; col < colTotal; col++) {
			let ratio = 0;
			let total = registrar.columns[colTotal];
			if (registrar.columns[col] == 0 || total == 0) {
				registrar.percentages[col] = 0;
			} else {
				ratio = registrar.columns[col] / total;
				registrar.percentages[col] = ratio * 100;
			}
			registrar.averages[col] = registrar.columns[col] / registrar.itemCount;
		}
		// Registrar: Update last column
		registrar.percentages[colTotal] = 100;
		registrar.averages[colTotal] =
			registrar.columns[colTotal] / registrar.itemCount;
		if (registrar.min[colTotal] == Group.fakeMinumum) {
			registrar.min[colTotal] = item.columns[colTotal];
		} else {
			registrar.min[colTotal] = Math.min(
				registrar.min[colTotal],
				item.columns[colTotal],
			);
		}
		registrar.max[colTotal] = Math.max(
			registrar.max[colTotal],
			item.columns[colTotal],
		);
	}

	addGroup(group) {
		if (group.itemCount == 0) return;
		if (this.isInitialized != undefined) {
			Reflect.deleteProperty(this, "isInitialized");
		}
		this.groups.push(group);
	}

	addItem(item) {
		this.update(item, this);
		this.itemCount++;
	}
}

/**
 * Simple ASCII report
 */
export class SimpleASCII {
	constructor(captions, columns, columnSeparator, rowSeparator) {
		this.captions = captions;
		this.columns = columns;
		this.columnSeparator = columnSeparator;
		this.rowSeparator = rowSeparator;
		this.isFirst = true;
	}

	getLine(columns) {
		let retVal = "";
		if (this.isFirst) {
			let rowLine = "";
			for (let i = 0; i < this.columns.length; i++) {
				rowLine += "".padEnd(this.columns[i], this.rowSeparator);
			}
			rowLine += "\n";
			retVal = rowLine;
			for (let i = 0; i < this.columns.length; i++) {
				retVal += this.captions[i].padEnd(this.columns[i], " ");
			}
			retVal += "\n" + rowLine;
			this.isFirst = false;
		}
		for (let i = 0; i < columns.length; i++) {
			retVal += columns[i].padEnd(this.columns[i], " ");
		}
		return retVal;
	}
}
