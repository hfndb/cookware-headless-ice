"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirList = exports.createDirTree = void 0;
const path_1 = require("path");
const { fdir } = require("fdir");
const shelljs_1 = require("shelljs");
const files_1 = require("./files");
function createDirTree(rootDir, tree, sourceControl = false) {
    Object.entries(tree).forEach((entry) => {
        let key = entry[0];
        if (key == "dirs") {
            let value = entry[1];
            for (let i = 0; i < value.length; i++) {
                files_1.FileUtils.mkdir(path_1.join(rootDir, value[i]));
                if (sourceControl) {
                    shelljs_1.touch(path_1.join(rootDir, value[i], "delete-me.txt"));
                }
            }
        }
        else if (key != "length") {
            if (path_1.join(rootDir, key).includes("length")) {
                throw new Error("test error");
            }
            let value = entry[1];
            files_1.FileUtils.mkdir(path_1.join(rootDir, key));
            createDirTree(path_1.join(rootDir, key), value, sourceControl);
        }
    });
}
exports.createDirTree = createDirTree;
function getDirList(path, recursive = true) {
    if (!shelljs_1.test("-e", path)) {
        throw new Error(`Path ${path} doesn't exist`);
    }
    let opts = {
        group: true
    };
    if (!recursive)
        Object.assign(opts, { maxDepth: 0 });
    const fl = new fdir().crawlWithOptions(path, opts).sync();
    let dirs = [];
    for (let d = 0; d < fl.length; d++) {
        let dir = fl[d].dir;
        dir = dir.substring(path.length + 1);
        if (!dir)
            continue;
        if (!recursive && dir.includes(path_1.sep))
            continue;
        dirs.push(dir);
    }
    return dirs;
}
exports.getDirList = getDirList;
//# sourceMappingURL=dirs.js.map