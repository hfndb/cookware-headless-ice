import { join } from "path";
import { exec, test } from "shelljs";
import { AppConfig } from "./config";
import { Logger } from "./log";

export class AudioUtils {
	/**
	 * Play an audio file
	 * @todo Bug, package cannot find mplayer
	 */
	static async playFile(file: string) {
		let cfg = AppConfig.getInstance();
		let fullPath = join(process.cwd(), file);
		if (!test("-f", fullPath)) {
			throw new Error(`File ${file} doesn't exist. Current working directory: ${process.cwd()}`);
		}
		try {
			exec(`${cfg.options.audio.player} ${fullPath}`, { async: true, silent: true });
		} catch (error) {
			let log = Logger.getInstance();
			log.warn(error);
		}
	}
}
