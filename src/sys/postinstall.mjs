"use strict";
import { AppConfig } from "../generic/config.mjs";
import { Packages } from "../generic/package-json.mjs";

// npm run-script postinstall

let cfg = AppConfig.getInstance("cookware-headless-ice");

Packages.updatePackages(true, cfg.dirMain);
