"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPackages = getPackages;
exports.getPackageReadmeFiles = getPackageReadmeFiles;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("./config");

var _files = require("./files");

var _log = require("./log");

function getPackages(dir) {
  let packages = _files.FileUtils.readJsonFile((0, _path.join)(dir, "package.json"), true);

  let pkg = [];

  for (let key in packages.dependencies) {
    if (!key.startsWith("@types")) pkg.push(key);
  }

  for (let key in packages.devDependencies) {
    if (!key.startsWith("@types")) pkg.push(key);
  }

  return pkg;
}

function getPackageReadmeFiles(sys) {
  let cfg = _config.AppConfig.getInstance();

  let dir = sys ? cfg.dirMain : cfg.dirProject;

  if (!(0, _shelljs.test)("-f", (0, _path.join)(dir, "package.json"))) {
    let log = _log.Logger.getInstance();

    log.warn(`No package.json found in directory ${dir}`);
    return [];
  }

  let list = getPackages(dir);
  let mds = [];
  let pkg = "";
  if (!cfg.isProject && !sys) return mds;

  for (let i = 0; i < list.length; i++) {
    pkg = list[i];

    _files.FileUtils.getFileList((0, _path.join)(dir, "node_modules", pkg), {
      allowedExtensions: [".md"],
      recursive: false
    }).forEach(file => {
      if (file.toLowerCase() == "readme.md") {
        mds.push({
          name: pkg,
          file: file
        });
      }
    });
  }

  return mds;
}
//# sourceMappingURL=package-json.js.map