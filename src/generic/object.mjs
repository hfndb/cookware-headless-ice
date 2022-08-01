"use strict";
import { Logger } from "./log.mjs";
import { AppConfig } from "./config.mjs";
import qi from "q-i";
import arraySort from "array-sort";
const { stringify } = qi;

export class ArrayUtils {
	static contains(str, searchIn) {
		let retVal = false;
		for (let i = 0; i < searchIn.length; i++) {
			if (str.includes(searchIn[i])) {
				retVal = true;
			}
		}
		return retVal;
	}

	static exactMatch(str, searchIn) {
		return searchIn.includes(str);
	}

	static startsWith(str, searchIn) {
		let retVal = false;
		for (let i = 0; i < searchIn.length; i++) {
			if (str.startsWith(searchIn[i])) {
				retVal = true;
			}
		}
		return retVal;
	}

	static endsWith(str, searchIn) {
		let retVal = false;
		for (let i = 0; i < searchIn.length; i++) {
			if (str.endsWith(searchIn[i])) {
				retVal = true;
			}
		}
		return retVal;
	}

	/**
	 * <p>
	 *   Method to determine if a search string is in an exclude list. Two procedures possible:
	 * </p>
	 *
	 * @example Simple exclude list
	 *
	 * let exclude = ArrayUtils.inExcludeList([
	 *   "abc",
	 *   "def",
	 *   "ghi"
	 * ], "abc");
	 *
	 * @example Detailed exclude list. All keys are optional
	 *
	 * let exclude = ArrayUtils.inExcludeList({
	 *     contains: [
	 *       "abc"
	 *     ],
	 *     exactMatch: [
	 *       "def"
	 *     ],
	 *     startsWith: [
	 *       "ghi"
	 *     ],
	 *     endsWith: [
	 *       "jkl"
	 *     ]
	 *   }, "abc");
	 *
	 */
	static inExcludeList(list, search) {
		if (list == undefined || list.length == 0) return false;
		let inList = false;
		if (list instanceof Array) {
			// Use default config for exclude list
			let cfg = AppConfig.getInstance();
			if (cfg.options.excludeList.contains) {
				inList = ArrayUtils.contains(search, list);
			}
			if (cfg.options.excludeList.exactMatch) {
				inList = inList || ArrayUtils.exactMatch(search, list);
			}
			if (cfg.options.excludeList.startsWith) {
				inList = inList || ArrayUtils.startsWith(search, list);
			}
			if (cfg.options.excludeList.endsWith) {
				inList = inList || ArrayUtils.endsWith(search, list);
			}
		} else {
			// Use detailed exclude list
			if (list.contains instanceof Array) {
				inList = ArrayUtils.contains(search, list.contains);
			}
			if (list.exactMatch instanceof Array) {
				inList = inList || ArrayUtils.exactMatch(search, list.exactMatch);
			}
			if (list.startsWith instanceof Array) {
				inList = inList || ArrayUtils.startsWith(search, list.startsWith);
			}
			if (list.endsWith instanceof Array) {
				inList = inList || ArrayUtils.endsWith(search, list.endsWith);
			}
		}
		return inList;
	}

	/**
	 * Method to swap rows in an array.
	 * The array itself is, of course, passed by reference.
	 */
	static swapRow(list, idxFrom, idxTo) {
		let toSwap = list.splice(idxFrom, 1); // Delete source row
		list.splice(idxTo, 0, toSwap[0]); // Add source row
	}
}

/** @typedef DateDiff
 * @property {number} days
 * @property {number} weeks
 * @property {number} months
 */

export class DateUtils {
	/**
	 * @returns {number} minute in ms
	 */
	static getMinuteAsMs() {
		return 1000 * 60;
	}

	/**
	 * @returns {number} hour in ms
	 */
	static getHourAsMs() {
		return DateUtils.getMinuteAsMs() * 60;
	}

	/**
	 * @returns {number} natural day of 24 hrs in ms
	 */
	static getDayAsMs() {
		return DateUtils.getHourAsMs() * 24;
	}

	/**
	 * @returns {number} week of 7 natural days in ms
	 */
	static getWeekAsMs() {
		return DateUtils.getDayAsMs() * 7;
	}

	/**
	 * Same calendar day?
	 *
	 * @param {Date} a
	 * @param {Date} b
	 * @returns {boolean}
	 */
	static isSameDay(a, b) {
		return DateUtils.isSameMonth(a, b) && a.getDate() == b.getDate();
	}

	/**
	 * Same calendar month?
	 *
	 * @param {Date} a
	 * @param {Date} b
	 * @returns {boolean}
	 */
	static isSameMonth(a, b) {
		return a.getMonth() == b.getMonth() && DateUtils.isSameYear(a, b);
	}

	/**
	 * Same calendar year?
	 *
	 * @param {Date} a
	 * @param {Date} b
	 * @returns {boolean}
	 */
	static isSameYear(a, b) {
		return a.getFullYear() == b.getFullYear();
	}

	/**
	 * Add days to a date
	 *
	 * @param {Date} dt
	 * @param (number) days
	 * @param (boolean) change Change existiting instance or return new instance
	 */
	static addDays(dt, days, change = true) {
		// Pointer to original or new instance?
		let rt = change ? dt : new Date(dt.valueOf());
		// Set to go
		rt.setDate(rt.getDate() + days);

		return rt;
	}

	/**
	 * Go from a Date instance to string parts in an object
	 *
	 * @param {Date} dt
	 * @returns {Object}
	 */
	static date2parts(dt) {
		return {
			year: dt.getFullYear().toString(),
			// Month index starts with 0, so correct
			month: (dt.getMonth() + 1).toString().padStart(2, "0"),
			day: dt
				.getDate()
				.toString()
				.padStart(2, "0"),
			hours: dt
				.getHours()
				.toString()
				.padStart(2, "0"),
			minutes: dt
				.getMinutes()
				.toString()
				.padStart(2, "0"),
			seconds: dt
				.getSeconds()
				.toString()
				.padStart(2, "0"),
		};
	}

	/**
	 * Calculate the difference between two days in days, weeks and months
	 *
	 * @param {Date} dtFrom
	 * @param {Date} dtTo
	 * @param {boolean} floorEm Floor days and months
	 * @returns {DateDiff}
	 * @see https://stackoverflow.com/questions/2536379/difference-in-months-between-two-dates-in-javascript#2536445
	 */
	static dateDiff(dtFrom, dtTo, floorEm = true) {
		let diffT = dtTo.getTime() - dtFrom.getTime(); // Time

		let rt = {
			days: diffT / (1000 * 60 * 60 * 24),
			months:
				dtTo.getMonth() -
				dtFrom.getMonth() +
				12 * (dtTo.getFullYear() - dtFrom.getFullYear()),
			weeks: 0,
		};

		rt.weeks = rt.days / 7;

		if (floorEm) {
			rt.days = Math.floor(rt.days);
			rt.weeks = Math.floor(rt.weeks);
		}

		return rt;
	}
}

export class ObjectUtils {
	/**
	 * Safely clone an object
	 *
	 * As from Node.js v17.0.0... uses structuredClone()
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
	 */
	static clone(obj) {
		let ver = parseInt(process.versions.node.split(".")[0]);
		if (ver >= 17) {
			return structuredClone(obj);
		}
		return JSON.parse(JSON.stringify(obj));
	}

	/**
	 * Return Map instance as generic object
	 */
	static map2object(mp) {
		let r = {};
		if (typeof mp != "object" || !(mp instanceof Map)) return r;
		for (let key of mp.keys()) {
			r[key] = mp.get(key);
		}
		return r;
	}

	/**
	 * Merge src object into target, like .json
	 *
	 * @param {Object} target Passed by reference
	 * @param {Object} src Passed by reference
	 */
	static mergeDeep(target, src) {
		Object.keys(src).forEach(key => {
			let value = src[key];
			if (target[key] == undefined) {
				target[key] = value; // Key doesn't exist yet, add
				return;
			}
			let type = typeof value;
			if (type == "object" && !Array.isArray(value)) {
				ObjectUtils.mergeDeep(target[key], value); // Go level deeper
			} else {
				target[key] = value; // Overwrite
			}
		});
	}

	/**
	 * After deleting keys in an object, that object could be empty like {} or []
	 * So... remove those empty entries as far as they aren't in a preserve list
	 *
	 * @param {Object} src Passed by reference
	 * @param {number} wipes Qty of wipes after first cleaning, depends on how many levels of hierarchy
	 * @param {string[]} preserve
	 * @param {boolean} topLevel Internal for recursive calling
	 */
	static removeEmptyObjects(src, wipes = 3, preserve = [], topLevel = true) {
		Object.keys(src).forEach(key => {
			// Skip?
			if (preserve.includes(key)) return;

			// Array or not an object?
			let value = src[key];
			if (Array.isArray(value)) {
				if (value.length == 0) Reflect.deleteProperty(src, key);
				return;
			}
			if (typeof value != "object") return;

			// Empty object?
			if (Object.keys(value).length == 0) {
				Reflect.deleteProperty(src, key);
				return;
			}

			ObjectUtils.removeEmptyObjects(src[key], wipes, preserve, false); // Go level deeper
		});

		// Perhaps... removing an array 'created' an empty object
		// Which could create another empty object. So... let's wipe clean
		for (let i = 0; topLevel && i < wipes; i++) {
			ObjectUtils.removeEmptyObjects(src, wipes, preserve, false);
		}
	}

	/**
	 * Get object as colored structure, using package q-i
	 */
	static toString(obj, color = false, maxNrOfItems = 30) {
		if (color) {
			return stringify(obj, { maxItems: maxNrOfItems });
			// print(obj); (after import from q-i)
		} else {
			return JSON.stringify(obj, null, "    ");
		}
	}
}

/**
 * Class to deal with dataasets of records, like resultsets from database or similar entries in a .json file
 */
export class Dataset {
	/**
	 * Sort an array with results
	 *
	 * @param data
	 * @param fields
	 */
	static sort(data, fields) {
		return arraySort(data, fields);
	}

	/**
	 * Take data from an array with results and return a resultset with the same entries, though including only specified fields
	 *
	 * @param data
	 * @param fields
	 */
	static extractFields(data, fields) {
		let log = Logger.getInstance();
		let retVal = [];
		for (let rec = 0; rec < data.length; rec++) {
			let record = {};
			for (let fld = 0; fld < fields.length; fld++) {
				const key = fields[fld];
				if (data[rec][key] == undefined) {
					log.info(`Key ${key} not found in record ${rec}`);
				} else {
					record[key] = data[rec][key];
				}
			}
			retVal.push(record);
		}
		return retVal;
	}
}
