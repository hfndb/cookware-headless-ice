"use strict";
import { AppConfig } from "../generic/config.mjs";
import { Packages } from "../generic/package-json.mjs";

let cfg = AppConfig.getInstance("cookware-headless-ice");

Packages.updatePackages(true, cfg.dirMain); // system packages

if (cfg.isProject) {
	Packages.updatePackages(false, cfg.dirProject); // project packages
}
