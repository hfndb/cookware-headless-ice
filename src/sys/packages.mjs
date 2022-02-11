"use strict";

import { AppConfig } from "../generic//config.mjs";
import { Packages } from "../generic/package-json.mjs";

let cfg = AppConfig.getInstance("cookware");

Packages.updatePackages(true); // system packages

if (cfg.isProject) {
	Packages.updatePackages(false); // project packages
}
