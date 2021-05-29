import { exec } from "shelljs";
import { AppConfig } from "../lib";

// Show a notification
export function notify(msg: string) {
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
