"use strict";
import { join } from "node:path";
import { AppConfig } from "../generic/config.mjs";
import { Cron } from "../generic/cron.mjs";
import { FileUtils } from "../generic/file-system/files.mjs";

let cfg;

/**
 * Organize cron tasks in a way like anacron
 *
 * @see https://en.wikipedia.org/wiki/Cron
 * @see https://en.wikipedia.org/wiki/Anacron
 */
export class CronTasks {
	constructor() {
		let dir = join(cfg.dirProject, "dev");
		let file = ".cron-cache.json";

		// TODO make sure tasks from settings.json are in .cron-cache.json and deleted tasks will be deleted

		Cron.init(dir, file);
	}

	/**
	 * Show notifications
	 */
	notifications() {
		if (!cfg.options.cron.notifications.length == 0) return;
	}

	/**
	 * Generate a project overview
	 */
	projectOverview() {
		if (!cfg.options.cron.projectOverview) return;
	}

	/**
	 * Run all cron tasks
	 */
	static run() {
		cfg = AppConfig.getInstance();
		let ct = new CronTasks();

		ct.notifications();
		ct.projectOverview();

		Cron.finish();
	}
}
