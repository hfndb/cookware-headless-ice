"use strict";

import { join } from "path";
import shelljs from "shelljs";
import { AppConfig } from "./config.mjs";
import { Logger } from "./log.mjs";
const { exec, test } = shelljs;

/**
 * Outgoing to system level
 */
export class SysUtils {
	/**
	 * Play an audio file
	 *
	 * @param file Relative to program dir
	 * @todo Bug, package cannot find mplayer
	 */
	static async playFile(file) {
		let cfg = AppConfig.getInstance();
		let fullPath = join(cfg.dirMain, file);
		if (!test("-f", fullPath)) {
			throw new Error(
				`File ${file} doesn't exist. Current working directory: ${process.cwd()}`,
			);
		}
		try {
			exec(`${cfg.options.sys.audio.player} ${fullPath}`, {
				async: true,
				silent: true,
			});
		} catch (error) {
			let log = Logger.getInstance();
			log.warn(error);
		}
	}

	static notify(msg) {
		let cfg = AppConfig.getInstance();
		if (!cfg.options.sys.notifications.command) return;
		let cmd =
			cfg.options.sys.notifications.command +
			' "' +
			msg +
			'" ' +
			cfg.options.sys.notifications.timeout.toString() +
			' "' +
			cfg.options.sys.notifications.title +
			'"';
		exec(cmd, { async: true });
	}
}
