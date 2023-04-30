"use strict";
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "../index.mjs";
import { ObjectUtils } from "../object.mjs";
import { test, touch } from "../sys.mjs";
import { CodeJs } from "./javascript.mjs";

/**
 * Whatever is needed to scan JavaScript code for shrinking.
 * Look for classes, methods and register 'em in one or more .json files
 */
export class ShrinkConfig {
	static dir = "";
	static f2s = {
		lst: {}, // content of files2scan
		path: "", // Full path to files2scan.json
	};

	/**
	 * Since used version of Babel doesn't recognise static constructor yet...
	 * initialize static variables
	 */
	static init() {
		if (ShrinkConfig.dir) return; // Already initialized
		let cfg = AppConfig.getInstance();

		ShrinkConfig.dir = join("dev", "shrinking"); // Relative to project directory

		// files2scan.json
		ShrinkConfig.f2s.path = join(
			cfg.dirProject,
			ShrinkConfig.dir,
			"files2scan.json",
		);
		ShrinkConfig.f2s.lst = test("-f", ShrinkConfig.f2s.path)
			? FileUtils.readJsonFile(ShrinkConfig.f2s.path)
			: [];
	}

	/**
	 * Update configuration for shrinking as far as necessary
	 */
	static scanAll() {
		ShrinkConfig.init();

		let files,
			parts = Object.keys(ShrinkConfig.f2s.lst);

		for (let p = 0; p < parts.length; p++) {
			files = ShrinkConfig.f2s.lst[parts[p]];
			ShrinkConfig.scanPart(parts[p], files);
		}
	}

	/**
	 * Update configuration for shrinking. Part as configured in one .json file
	 *
	 * @private
	 * @param {string} part Name of part
	 * @param {string[]} files
	 */
	static scanPart(part, files) {
		let cfg = AppConfig.getInstance(),
			changed = false,
			classes,
			cls,
			idx,
			entry,
			file,
			filePart = join(ShrinkConfig.dir, part + ".json"),
			src;

		let isNew = !test("-f", join(cfg.dirProject, filePart));

		let lastModified = isNew
			? -1
			: FileUtils.getLastModified(cfg.dirProject, filePart);

		let cfgPart = isNew
			? []
			: FileUtils.readJsonFile(join(cfg.dirProject, filePart));

		for (let f = 0; f < files.length; f++) {
			file = join(cfg.dirProject, cfg.options.javascript.dirs.source, files[f]);

			// Ignore if...
			if (!test("-f", file)) continue; // Shouldn't occur
			if (!isNew && FileUtils.getLastModified("", file) < lastModified) continue; // Not changed

			// Scan file
			src = FileUtils.readFile(file);
			classes = CodeJs.getClasses(src);
			for (let c = 0; c < classes.length; c++) {
				cls = classes[c];
				idx = cfgPart.findIndex(el => el?.class == cls);
				entry = {
					class: cls,
					location: files[f],
				};
				if (idx >= 0) {
					cfgPart[idx] = Object.assign(cfgPart[idx], entry); // Overwrite entry
				} else {
					Object.assign(entry, { methods: {} });
					idx = cfgPart.push(entry) - 1; // Add entry
				}
				cfgPart[idx].methods = ShrinkConfig.updateMethods(
					cfgPart[idx].methods,
					cls,
					src,
				);
				changed = true;
			}
		}
		if (changed) {
			FileUtils.writeJsonFile(cfgPart, cfg.dirProject, filePart, false);
		}
	}

	/**
	 * While running ShrinkConfig.scanPart(), updated methods in class
	 *
	 * @private
	 * @param {Object} entry with already known methods as keys
	 * @param {string} cls
	 * @param {string} src
	 */
	static updateMethods(entry, cls, src) {
		let method,
			methods = CodeJs.getMethods(src, cls),
			rt = {};
		for (let i = 0; i < methods.length; i++) {
			method = methods[i];
			if (!entry[method]) {
				entry[method] = {
					short: "",
				};
			}
		}

		return entry;
	}

	/**
	 * Get a full list of entries for shrinking
	 *
	 * @returns {Object}
	 */
	static getList4Shrinking() {
		ShrinkConfig.init();

		let cfg = AppConfig.getInstance(),
			file,
			log = Logger.getInstance(),
			lst,
			part,
			parts = Object.keys(ShrinkConfig.f2s.lst),
			path,
			rt = {};

		for (let p = 0; p < parts.length; p++) {
			part = parts[p];
			file = part + ".json";
			path = join(cfg.dirProject, ShrinkConfig.dir, file);
			if (!test("-f", path)) {
				log.warn(`Config file ${file} not found`, path);
				continue;
			}
			rt[part] = FileUtils.readJsonFile(path);
		}

		return rt;
	}

	/**
	 * Update a .json file
	 *
	 * @param {string} part Name of part, to be translated to a .json file path
	 * @param {Object} obj
	 * @param (boolean) changed
	 */
	static updatePart(part, obj, changed) {
		let cfg = AppConfig.getInstance();
		let file = join(ShrinkConfig.dir, part + ".json");
		// Not changed and also already available?
		if (!changed && test("-f", join(cfg.dirProject, file))) return;
		FileUtils.writeJsonFile(obj, cfg.dirProject, file, true);
	}
}
