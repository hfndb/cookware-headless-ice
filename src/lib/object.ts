import { Logger } from "./log";
import { AppConfig } from "./config";
const { stringify } = require("q-i");
const arraySort = require("array-sort");

export class ArrayUtils {
	static contains(str: string, searchIn: string[]): boolean {
		let retVal = false;
		for (let i = 0; i < searchIn.length; i++) {
			if (str.includes(searchIn[i])) {
				retVal = true;
			}
		}
		return retVal;
	}

	static exactMatch(str: string, searchIn: string[]): boolean {
		return searchIn.includes(str);
	}

	static startsWith(str: string, searchIn: string[]): boolean {
		let retVal = false;
		for (let i = 0; i < searchIn.length; i++) {
			if (str.startsWith(searchIn[i])) {
				retVal = true;
			}
		}
		return retVal;
	}

	static endsWith(str: string, searchIn: string[]): boolean {
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
	static inExcludeList(list: any, search: string): boolean {
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
}

export class ObjectUtils {
	/**
	 * Merge src object into target, like .json
	 *
	 * @param target {Object}
	 * @param src {Object}
	 */
	static mergeDeep(target: any, src: any): void {
		Object.keys(src).forEach((key: string) => {
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
	 * Get object as colored structure, using package q-i
	 */
	static toString(
		obj: Object,
		color: boolean = false,
		maxNrOfItems: number = 30
	): string {
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
	static sort(data: any[], fields: any[]): any[] {
		return arraySort(data, fields);
	}

	/**
	 * Take data from an array with results and return a resultset with the same entries, though including only specified fields
	 *
	 * @param data
	 * @param fields
	 */
	static extractFields(data: any[], fields: any[]): any[] {
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
