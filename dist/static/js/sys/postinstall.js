"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const misc_1 = require("../local/misc");
const typescript_1 = require("../local/typescript");
const config_1 = require("../lib/config");
const upgrades_1 = require("./upgrades");
let cfg = config_1.AppConfig.getInstance();
if (!shelljs_1.test("-f", path_1.join(cfg.dirProject, "config-org.json"))) {
    shelljs_1.cp(path_1.join(cfg.dirMain, "default-project", "config.json"), path_1.join(cfg.dirProject, "config-org.json"));
}
upgrades_1.upgrade(cfg, true);
misc_1.generateWeb(false);
typescript_1.generateTsDocs();
//# sourceMappingURL=postinstall.js.map