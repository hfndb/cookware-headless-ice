"use strict";
import { join } from "node:path";
import parser from "cron-parser";
import { AppConfig } from "./config.mjs";
import { FileUtils } from "./file-system/files.mjs";
import { Logger } from "./log.mjs";
import { test } from "./sys.mjs";

let cfg, log;

export class Task {
	/**
	 * @param {string} crontab
	 * @param {string} name
	 * @param {string} [plugin]
	 * @param {boolean} [runAtstartup]
	 *
	 * @see http://en.wikipedia.org/wiki/Crontab
	 * @see https://github.com/harrisiirak/cron-parser
	 *
	 * Format crontab:
	 * *    *    *    *    *    *
	 * ┬    ┬    ┬    ┬    ┬    ┬
	 * │    │    │    │    │    └ day of week (0 - 7, 1L - 7L) (0 or 7 is Sun)
	 * │    │    │    │    └───── month (1 - 12)
	 * │    │    │    └────────── day of month (1 - 31, L)
	 * │    │    └─────────────── hour (0 - 23)
	 * │    └──────────────────── minute (0 - 59)
	 * └───────────────────────── second (0 - 59, optional)
	 *
	 */
	constructor(name, crontab, plugin = "", runAtstartup = false) {
		this.crontab = crontab;
		this.name = name;
		this.plugin = plugin || "generic";
		this.runAtstartup = runAtstartup;
	}
}

class TaskInternal {
	/**
	 * @param {Date} next
	 */
	constructor(next) {
		this.last = "";
		this.next = next;
	}
}

/**
 * Manage cron tasks.
 * Written for cookware-texts for usage with plugins.
 *
 * @property {Object} data Structure grouped by plugin name
 * @example
 * {
 *   pluginName: {
 *     taskName1: "[ crontab here ]",
 *     taskName2: "[ crontab here ]",
 *     taskName3: "[ crontab here ]",
 *   }
 * }
 */
export class Cron {
	static data;
	static dir;
	static file;

	/**
	 * Initialize. Check for and read cache file, in which
	 * last and next datetimes for execution of tasks is
	 * registered.
	 *
	 * @param {string} dir Directory
	 * @param {string} file
	 */
	static init(dir, file) {
		cfg = AppConfig.getInstance();
		log = Logger.getInstance();

		Cron.dir = dir;
		Cron.file = file;

		let path = join(Cron.dir, Cron.file);
		if (test("-f", path)) {
			Cron.data = FileUtils.readJsonFile(path, false);
		} else {
			Cron.data = {};
		}

		/**
		 * Structure of cache file:
		 * @example
		 * {
		 *   pluginName: {
		 *     taskName1: {
		 *       last: "[ serialized datetime here ]",
		 *       next: "[ serialized datetime here ]",
		 *     },
		 *     taskName2: {
		 *       last: "[ serialized datetime here ]",
		 *       next: "[ serialized datetime here ]",
		 *     },
		 *     taskName3: {
		 *       last: "[ serialized datetime here ]",
		 *       next: "[ serialized datetime here ]",
		 *     }
		 *   }
		 * }
		 */
	}

	/**
	 * Finish by writing status quo to disk
	 */
	static finish() {
		FileUtils.writeJsonFile(Cron.data, Cron.dir, Cron.file, false);
	}

	/**
	 * Get next date to execute a cron task
	 *
	 * @param {string} plgn Plugin, just directory name
	 * @param {string} which Internal name of task
	 * @param {string} str Using cron syntax
	 * @returns {Date|null}
	 */
	static getNextCron(plgn, which, str) {
		let rt = null;
		try {
			const interval = parser.parseExpression(str, {
				tz: cfg.options.cron.timeZone,
			});
			rt = interval.next();
			rt = new Date(rt);
		} catch (err) {
			log.warn(
				`Error passing cron expression for task '${plgn}/${which}': ${str}`,
				err,
			);
		}
		return rt;
	}

	/**
	 * See whether a task should run
	 *
	 * @param {Task} opts
	 * @returns {boolean}
	 */
	static shouldRun(opts) {
		let overrule = false,
			name = opts.name,
			next,
			plgn = opts.plugin,
			rt = false;

		if (!Cron.data[plgn]) {
			Cron.data[plgn] = {};
		}

		if (!Cron.data[plgn][name]) {
			next = Cron.getNextCron(plgn, name, opts.crontab);
			Cron.data[plgn][name] = new TaskInternal(next);
			if (opts.runAtstartup) overrule = true;
		}

		next = Cron.data[plgn][name].next;
		if (typeof next == "string") {
			next = new Date(next); // From .json
		}

		if (overrule || next.getTime() <= Date.now()) rt = true;

		return rt;
	}

	/**
	 * Register a completed task
	 *
	 * @param {Task} opts
	 */
	static taskCompleted(opts) {
		let name = opts.name,
			plgn = opts.plugin;

		Cron.data[plgn][name].last = Cron.data[plgn][name].next;
		Cron.data[plgn][name].next = Cron.getNextCron(plgn, name, opts.crontab);
	}
}
