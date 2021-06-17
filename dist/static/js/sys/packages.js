"use strict";

require("source-map-support/register");

var _config = require("../lib//config");

var _packageJson = require("../lib/package-json");

let cfg = _config.AppConfig.getInstance("cookware");

(0, _packageJson.updatePackages)(true);

if (cfg.isProject) {
  (0, _packageJson.updatePackages)(false);
}
//# sourceMappingURL=packages.js.map