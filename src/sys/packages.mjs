"use strict";

import { AppConfig } from "../lib//config.mjs";
import { Packages } from "../lib/package-json.mjs";

let cfg = AppConfig.getInstance("cookware");

Packages.updatePackages(true); // system packages

if (cfg.isProject) {
	Packages.updatePackages(false); // project packages
}
