"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageReadmeFiles = exports.getPackages = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const files_1 = require("./files");
const log_1 = require("./log");
function getPackages(dir) {
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
exports.getPackages = getPackages;
function getPackageReadmeFiles(sys) {
    let cfg = config_1.AppConfig.getInstance();
    let dir = sys ? cfg.dirMain : cfg.dirProject;
    if (!shelljs_1.test("-f", path_1.join(dir, "package.json"))) {
        let log = log_1.Logger.getInstance();
        log.warn(`No package.json found in directory ${dir}`);
        return [];
    }
    let list = getPackages(dir);
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
exports.getPackageReadmeFiles = getPackageReadmeFiles;
//# sourceMappingURL=package-json.js.map