import { AppConfig } from "../lib/config";
import { upgrade } from "./upgrades";

let cfg = AppConfig.getInstance("cookware");
upgrade(cfg, true);
