"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChangeList = exports.FileStatus = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const files_1 = require("./files");
const object_1 = require("./object");
class FileStatus {
    constructor(path) {
        this.lastModified = 0;
        this.source = "";
        this.status = "";
        this.target = "";
        this.targetDir = "";
        this.targetLastModified = 0;
        this.ext = "";
        this.targetExt = "";
        this.dir = path;
    }
    static containsChange(list) {
        let changeFound = false;
        list.forEach((entry) => {
            if (entry.isNewOrModified()) {
                changeFound = true;
            }
        });
        return changeFound;
    }
    setSoure(file, ext) {
        this.source = file;
        this.ext = ext;
        this.lastModified = files_1.FileUtils.getLastModified(this.dir, this.source);
        this.status = "unknown";
    }
    setTarget(path, ext, flatten = false) {
        this.targetDir = path;
        this.targetExt = ext;
        if (flatten) {
            this.target = path_1.join(path_1.basename(this.source, this.ext).concat(this.targetExt));
        }
        else {
            this.target = path_1.join(path_1.dirname(this.source), path_1.basename(this.source, this.ext)).concat(this.targetExt);
        }
        if (shelljs_1.test("-e", path_1.join(this.targetDir, this.target))) {
            this.targetLastModified = files_1.FileUtils.getLastModified(this.targetDir, this.target);
            this.status =
                this.lastModified > this.targetLastModified ? "modified" : "unchanged";
        }
        else {
            this.status = "new";
        }
    }
    isNewOrModified() {
        return this.status == "new" || this.status == "modified";
    }
}
exports.FileStatus = FileStatus;
function getChangeList(opts) {
    let changes = [];
    let sources = files_1.FileUtils.getFileList(opts.sourcePath, {
        allowedExtensions: opts.sourceExt
    });
    sources.forEach((file) => {
        if (object_1.ArrayUtils.inExcludeList(opts.excludeList || [], file))
            return;
        let status = new FileStatus(opts.sourcePath);
        status.setSoure(file, path_1.extname(file));
        status.setTarget(opts.targetPath, opts.targetExt, opts.flatten != undefined && opts.flatten);
        changes.push(status);
    });
    return changes;
}
exports.getChangeList = getChangeList;
//# sourceMappingURL=file-diff.js.map