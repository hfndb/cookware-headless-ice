"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPackages = getPackages;
exports.getPackageReadmeFiles = getPackageReadmeFiles;
exports.updatePackages = updatePackages;

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

function updatePackages(sys) {
  let cfg = _config.AppConfig.getInstance();

  let dir = sys ? cfg.dirMain : cfg.dirProject;

  let log = _log.Logger.getInstance(cfg.options.logging);

  let update = [];
  cfg.options.logging.transports.file.active = false;
  let file = (0, _path.join)(dir, "package.json");
  if (!(0, _shelljs.test)("-f", file)) return;
  log.info(`Checking ${sys ? "system" : "project"} packages`);

  let packages = _files.FileUtils.readJsonFile(file, true);

  let deps = Object.entries(packages.dependencies);

  for (let i = 0; i < deps.length; i++) {
    let key = deps[i][0];
    let version = deps[i][1];
    let pkgDir = (0, _path.join)(dir, "node_modules", key);
    let pkgFile = (0, _path.join)(dir, "node_modules", key, "package.json");

    if (version.startsWith("^")) {
      version = version.substring(1);
    }

    let needsAction = false;

    if (!(0, _shelljs.test)("-d", pkgDir)) {
      log.info(`Package ${key} not installed yet`);
      needsAction = true;
    } else if (!(0, _shelljs.test)("-f", pkgFile)) {
      log.info(`Package ${key} incorrectly installed`);
      needsAction = true;
    }

    if (!needsAction) {
      let pkgInf = _files.FileUtils.readJsonFile(pkgFile, true);

      if (!pkgInf.version || pkgInf.version != version) {
        log.info(`Package ${key} needs update, version ${pkgInf.version} to ${version}`);
        needsAction = true;
      }
    }

    if (needsAction) {
      update.push(`${key}@${version}`);
    }
  }

  if (update.length > 0) {
    (0, _shelljs.cd)(dir);
    log.info("Installing updates...");
    (0, _shelljs.exec)(`npm install ${update.join(" ")}`, {
      async: false,
      silent: false
    });
    (0, _shelljs.cd)(cfg.dirMain);
  }
}
//# sourceMappingURL=package-json.js.map