"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../lib//config");
const package_json_1 = require("../lib/package-json");
let cfg = config_1.AppConfig.getInstance("cookware");
package_json_1.Packages.updatePackages(true);
if (cfg.isProject) {
    package_json_1.Packages.updatePackages(false);
}
//# sourceMappingURL=packages.js.map