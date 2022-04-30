"use strict";
import { join } from "node:path";
import shelljs from "shelljs";
import { FileUtils } from "../generic/index.mjs";
import { AppConfig } from "../generic/config.mjs";
const { test } = shelljs;

export function check() {
	let cfg = AppConfig.getInstance();
	let ok = test("-f", join(cfg.dirMain, "bin", "sass"));

	if (!ok) {
		console.error(
			"Sass binary not available yet. For installation, see README.md of this project\n",
		);
	}

	return ok;
}

/**
 * Perform upgrade to a newer version of the config file
 */
export function upgrade(cfg, system = false) {
	let dir = system ? cfg.dirMain : cfg.dirProject;
	let needsUpdate = false;
	let options = FileUtils.readJsonFile(join(dir, "settings.json"));
	let versionTarget = "0.0.1";
	let versionCurrent = Object.getOwnPropertyDescriptor(options, "version");
	if (versionCurrent) {
		versionCurrent = versionCurrent.value;
	} else {
		console.error(
			"Couldn't find a version number in settings.json. Exiting now... bye!\n",
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
