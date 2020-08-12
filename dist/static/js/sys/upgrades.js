"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const lib_1 = require("../lib");
function upgrade(cfg, system = false) {
    let dir = system ? cfg.dirMain : cfg.dirProject;
    let needsUpdate = false;
    let options = lib_1.FileUtils.readJsonFile(path_1.join(dir, "config.json"));
    let versionTarget = "0.0.1";
    let versionCurrent = Object.getOwnPropertyDescriptor(options, "version");
    if (versionCurrent) {
        versionCurrent = versionCurrent.value;
    }
    else {
        console.error("Couldn't find a version number in config.json. Exiting now... bye!\n");
        return false;
    }
    if (versionCurrent == versionTarget) {
        return true;
    }
    else {
        needsUpdate = true;
    }
    needsUpdate;
    return true;
}
exports.upgrade = upgrade;
//# sourceMappingURL=upgrades.js.map