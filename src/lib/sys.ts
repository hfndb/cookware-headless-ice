import { join } from "path";
import { exec, test } from "shelljs";
import { AppConfig } from "./config";
import { Logger } from "./log";

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
	static async playFile(file: string) {
		let cfg = AppConfig.getInstance();
		let fullPath = join(cfg.dirMain, file);
		if (!test("-f", fullPath)) {
			throw new Error(
				`File ${file} doesn't exist. Current working directory: ${process.cwd()}`
			);
		}
		try {
			exec(`${cfg.options.audio.player} ${fullPath}`, {
				async: true,
				silent: true
			});
		} catch (error) {
			let log = Logger.getInstance();
			log.warn(error);
		}
	}
	static notify(msg: string) {
		let cfg = AppConfig.getInstance();

		if (!cfg.options.notifications.command) return;
		let cmd =
			cfg.options.notifications.command +
			' "' +
			msg +
			'" ' +
			cfg.options.notifications.timeout.toString() +
			' "' +
			cfg.options.notifications.title +
			'"';
		exec(cmd, { async: true });
	}
}
