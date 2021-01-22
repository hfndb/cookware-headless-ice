"use strict";

require("source-map-support/register");

var _config = require("../lib/config");

var _upgrades = require("./upgrades");

let cfg = _config.AppConfig.getInstance();

(0, _upgrades.upgrade)(cfg, true);
//# sourceMappingURL=postinstall.js.map