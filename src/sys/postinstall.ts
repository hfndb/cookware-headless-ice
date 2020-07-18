import { join } from "path";
import { cp, test } from "shelljs";
import { generateWeb } from "../local/misc";
import { generateTsDocs } from "../local/typescript";
import { AppConfig } from "../lib/config";
import { upgrade } from "./upgrades";

let cfg = AppConfig.getInstance();
if (!test("-f", join(cfg.dirProject, "config-org.json"))) {
	cp(join(cfg.dirMain, "default-project", "config.json"), join(cfg.dirProject, "config-org.json"));
}

upgrade(cfg, true);
generateWeb(false);
generateTsDocs();
