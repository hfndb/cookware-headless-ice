"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.upgrade = upgrade;

require("source-map-support/register");

var _path = require("path");

var _lib = require("../lib");

function upgrade(cfg, system = false) {
  let dir = system ? cfg.dirMain : cfg.dirProject;
  let needsUpdate = false;

  let options = _lib.FileUtils.readJsonFile((0, _path.join)(dir, "config.json"));

  let versionTarget = "0.0.1";
  let versionCurrent = Object.getOwnPropertyDescriptor(options, "version");

  if (versionCurrent) {
    versionCurrent = versionCurrent.value;
  } else {
    console.error("Couldn't find a version number in config.json. Exiting now... bye!\n");
    return false;
  }

  if (versionCurrent == versionTarget) {
    return true;
  } else {
    needsUpdate = true;
  }

  needsUpdate;
  return true;
}
//# sourceMappingURL=upgrades.js.map