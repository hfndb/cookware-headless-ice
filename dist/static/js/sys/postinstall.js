"use strict";

var _path = require("path");

var _shelljs = require("shelljs");

var _misc = require("../local/misc");

var _typescript = require("../local/typescript");

var _config = require("../lib/config");

var _upgrades = require("./upgrades");

let cfg = _config.AppConfig.getInstance();

if (!(0, _shelljs.test)("-f", (0, _path.join)(cfg.dirProject, "config-org.json"))) {
  (0, _shelljs.cp)((0, _path.join)(cfg.dirMain, "default-project", "config.json"), (0, _path.join)(cfg.dirProject, "config-org.json"));
}

(0, _upgrades.upgrade)(cfg, true);
(0, _misc.generateWeb)(false);
(0, _typescript.generateTsDocs)();