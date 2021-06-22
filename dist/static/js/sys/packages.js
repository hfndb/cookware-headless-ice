"use strict";

require("source-map-support/register");

var _config = require("../lib//config");

var _packageJson = require("../lib/package-json");

let cfg = _config.AppConfig.getInstance("cookware");

_packageJson.Packages.updatePackages(true);

if (cfg.isProject) {
  _packageJson.Packages.updatePackages(false);
}
//# sourceMappingURL=packages.js.map