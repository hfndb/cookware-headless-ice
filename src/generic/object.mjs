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
 * Class to deal with datasets of records, like resultsets from database or similar entries in a .json file
 */
export class Dataset {
	/**
	 * Sort an array with results
	 *
	 * @param {object[]} data
	 * @param {string[]} fields
	 */
	static sort(data, fields) {
		return arraySort(data, fields);
	}

	/**
	 * Take data from an array with results and return a resultset with the same entries, though including only specified fields. Another approach than array.filter()
	 *
	 * @param {object[]} data
	 * @param {string[]} fields
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
