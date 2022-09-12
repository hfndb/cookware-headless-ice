"use strict";
import { join } from "node:path";
import { FileUtils } from "../generic/index.mjs";
import { AppConfig } from "../generic/config.mjs";
import { test } from "../generic/sys.mjs";

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
