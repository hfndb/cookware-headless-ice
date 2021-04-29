import { join } from "path";
import { FileUtils } from "../lib";
import { AppConfig } from "../lib/config";

/**
 * @todo Perhaps this file is obsolte, unless settings.json will need specal conversions in the future
 */

/**
 * Perform upgrade to a newer version of the config file
 */
export function upgrade(cfg: AppConfig, system: boolean = false): boolean {
	let dir = system ? cfg.dirMain : cfg.dirProject;
	let needsUpdate = false;
	let options = FileUtils.readJsonFile(join(dir, "settings.json"));
	let versionTarget = "0.0.1";
	let versionCurrent = Object.getOwnPropertyDescriptor(options, "version");
	if (versionCurrent) {
		versionCurrent = versionCurrent.value;
	} else {
		console.error(
			"Couldn't find a version number in settings.json. Exiting now... bye!\n"
		);
		return false;
	}

	if (versionCurrent == versionTarget) {
		return true;
	} else {
		needsUpdate = true;
	}

	// For future usage: Perform some magic here...

	needsUpdate; // Fool compiler - unused variable

	// If (system and needs update) then replace config-org.json and default-project/config-org.json

	return true;
}
