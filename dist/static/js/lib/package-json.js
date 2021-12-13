"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Packages = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const files_1 = require("./files");
const log_1 = require("./log");
class Packages {
    static getPackages(dir) {
        let packages = files_1.FileUtils.readJsonFile(path_1.join(dir, "package.json"), true);
        let pkg = [];
        for (let key in packages.dependencies) {
            if (!key.startsWith("@types"))
                pkg.push(key);
        }
        for (let key in packages.devDependencies) {
            if (!key.startsWith("@types"))
                pkg.push(key);
        }
        return pkg;
    }
    static getPackageReadmeFiles(sys) {
        let cfg = config_1.AppConfig.getInstance();
        let dir = sys ? cfg.dirMain : cfg.dirProject;
        if (!shelljs_1.test("-f", path_1.join(dir, "package.json"))) {
            let log = log_1.Logger.getInstance();
            log.warn(`No package.json found in directory ${dir}`);
            return [];
        }
        let list = Packages.getPackages(dir);
        let mds = [];
        let pkg = "";
        if (!cfg.isProject && !sys)
            return mds;
        for (let i = 0; i < list.length; i++) {
            pkg = list[i];
            files_1.FileUtils.getFileList(path_1.join(dir, "node_modules", pkg), {
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
            if (vrsVal[i] < vrsRef[i])
                toReturn = true;
        }
        return toReturn;
    }
    static updatePackages(sys) {
        let cfg = config_1.AppConfig.getInstance();
        let dir = sys ? cfg.dirMain : cfg.dirProject;
        let log = log_1.Logger.getInstance(cfg.options.logging);
        let update = [];
        cfg.options.logging.transports.file.active = false;
        let file = path_1.join(dir, "package.json");
        if (!shelljs_1.test("-f", file))
            return;
        log.info(`Checking ${sys ? "system" : "project"} packages`);
        let packages = files_1.FileUtils.readJsonFile(file, true);
        let deps = Object.entries(packages.dependencies);
        for (let i = 0; i < deps.length; i++) {
            let key = deps[i][0];
            let version = deps[i][1];
            let pkgDir = path_1.join(dir, "node_modules", key);
            let pkgFile = path_1.join(dir, "node_modules", key, "package.json");
            let needsAction = false;
            if (!shelljs_1.test("-d", pkgDir)) {
                log.info(`Package ${key} not installed yet`);
                needsAction = true;
            }
            else if (!shelljs_1.test("-f", pkgFile)) {
                log.info(`Package ${key} incorrectly installed`);
                needsAction = true;
            }
            if (!needsAction) {
                let pkgInf = files_1.FileUtils.readJsonFile(pkgFile, true);
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
            shelljs_1.cd(dir);
            log.info("Installing updates...");
            shelljs_1.exec(`npm install ${update.join(" ")}`, { async: false, silent: false });
            shelljs_1.cd(cfg.dirMain);
        }
    }
}
exports.Packages = Packages;
//# sourceMappingURL=package-json.js.map