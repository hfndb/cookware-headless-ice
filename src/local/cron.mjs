"use strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { Cron, Task } from "../generic/cron.mjs";
import { FileUtils } from "../generic/file-system/files.mjs";
import { AppConfig, Logger } from "../generic/index.mjs";
import { test, SysUtils } from "../generic/sys.mjs";
import { writeStats } from "./overview.mjs";

let cfg, log;

/**
 * Organize cron tasks in a way like anacron
 *
 * @see https://en.wikipedia.org/wiki/Cron
 * @see https://en.wikipedia.org/wiki/Anacron
 */
export class CronTasks {
	constructor() {
		this.changed = false; // Changes for settings.json?
		this.dir = join(cfg.dirProject, "dev");
		this.file = "cron-cache.json";
		Cron.init(this.dir, this.file);

		// Fresh cache file?
		if (Cron.data.sys == undefined) Cron.data.sys = {}; // 'Plugin'
		if (!Cron.data.notifications) Cron.data.notifications = {};
		if (Cron.data.sys.projectOverview == undefined)
			Cron.data.sys.projectOverview = "";

		this.syncSettingsAndCache();
	}

	/**
	 * After all tasks...
	 */
	finish() {
		Cron.finish();

		// Changes for project settings.json?
		if (this.changed) {
			let options = FileUtils.readJsonFile(join(cfg.dirProject, "settings.json"));
			options.cron = cfg.options.cron;
			FileUtils.writeJsonFile(options, cfg.dirProject, "settings.json", false);
		}
	}

	/**
	 * Settings are configured in project settings.json,
	 * cache for anacron like behavior is in another file.
	 * @private
	 */
	syncSettingsAndCache() {
		let task;

		// Remove tasks from cache if deleted from settings.json
		Object.keys(Cron.data.notifications).forEach(entry => {
			task = Cron.data.notifications[entry];
			if (!cfg.options.cron.notifications.find(el => el.id == task.id))
				Reflect.deleteProperty(Cron.data.notifications, entry);
		});
	}

	/**
	 * Show notifications
	 *
	 * @param {Object} task For calling class Cron
	 */
	notifications(task) {
		if (cfg.options.cron.notifications.length == 0) return;

		let path = join(cfg.dirMain, "bin", "env.sh");
		if (!test("-f", path)) {
			log.warn(
				`File for environment variables not found. \nExpected path: ${path}`,
			);
			return;
		}

		let id = Date.now(),
			result,
			tsk;
		for (let i = 0; i < cfg.options.cron.notifications.length; i++) {
			// Make sure that there's a unique id for task
			if (cfg.options.cron.notifications[i].uuid == undefined) {
				cfg.options.cron.notifications[i].uuid = randomUUID();
				this.changed = true;
			}

			tsk = new Task(
				"notification_" + cfg.options.cron.notifications[i].uuid,
				cfg.options.cron.notifications[i].crontab,
			);

			if (Cron.shouldRun(task)) {
				path = cfg.options.cron.notificationsTempFile;
				FileUtils.writeFile(
					"",
					cfg.options.cron.notificationsTempFile,
					cfg.options.cron.notifications[i].message,
					false,
				);
				path = join(cfg.dirMain, "bin", "show-notifications.sh");
				result = SysUtils.execBashCmd(path, true);
				if (!result.stderr) Cron.taskCompleted(task);
				FileUtils.rmFile(cfg.options.cron.notificationsTempFile);
			}
		}
	}

	/**
	 * Generate a project overview.
	 * First task called from CronTasks.run()
	 */
	projectOverview() {
		if (!cfg.options.cron.projectOverview) return;

		let tsk = new Task("projectOverview", cfg.options.cron.projectOverview);
		if (Cron.shouldRun(tsk)) {
			writeStats();
			Cron.taskCompleted(tsk);
		}
	}

	/**
	 * Run all cron tasks
	 */
	static run() {
		let ct = new CronTasks();
		ct.projectOverview();
		ct.notifications();
		ct.finish();
	}
}
