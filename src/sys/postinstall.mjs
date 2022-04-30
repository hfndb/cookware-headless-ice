"use strict";
import { AppConfig } from "../generic/config.mjs";
import { upgrade } from "./upgrades.mjs";

let cfg = AppConfig.getInstance("cookware");
upgrade(cfg, true);
