import { AppConfig } from "../lib/config.mjs";
import { upgrade } from "./upgrades.mjs";

let cfg = AppConfig.getInstance("cookware");
upgrade(cfg, true);
