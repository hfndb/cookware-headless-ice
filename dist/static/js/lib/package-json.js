"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Packages = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("./config");

var _files = require("./files");

var _log = require("./log");

class Packages {
  static getPackages(dir) {
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

  static getPackageReadmeFiles(sys) {
    let cfg = _config.AppConfig.getInstance();

    let dir = sys ? cfg.dirMain : cfg.dirProject;

    if (!(0, _shelljs.test)("-f", (0, _path.join)(dir, "package.json"))) {
      let log = _log.Logger.getInstance();

      log.warn(`No package.json found in directory ${dir}`);
      return [];
    }

    let list = Packages.getPackages(dir);
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

  static isOlder(ref, val) {
    if (ref.startsWith("^")) {
      ref = ref.substring(1);
    }

    let vrsRef = ref.split(".");
    let vrsVal = val.split(".");

    for (let i = 0; i < vrsRef.length; i++) {
      vrsRef[i] = parseInt(vrsRef[i]);
      vrsVal[i] = parseInt(vrsVal[i]);
    }

    let toReturn = false;

    for (let i = 0; !toReturn && i < vrsRef.length; i++) {
      if (vrsVal[i] < vrsRef[i]) toReturn = true;
    }

    return toReturn;
  }

  static updatePackages(sys) {
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

        if (Packages.isOlder(version, pkgInf.version)) {
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

}

exports.Packages = Packages;
//# sourceMappingURL=package-json.js.map