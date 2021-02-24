"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../lib/config");
const upgrades_1 = require("./upgrades");
let cfg = config_1.AppConfig.getInstance();
upgrades_1.upgrade(cfg, true);
//# sourceMappingURL=postinstall.js.map