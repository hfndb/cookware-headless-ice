import { join } from "path";
import { cp, test } from "shelljs";
import { generateWeb } from "../local/misc";
import { generateTsDocs } from "../local/typescript";
import { AppConfig } from "../lib/config";
import { upgrade } from "./upgrades";

let cfg = AppConfig.getInstance();
upgrade(cfg, true);
