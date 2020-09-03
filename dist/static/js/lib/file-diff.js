"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChangeList = getChangeList;
exports.FileStatus = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _files = require("./files");

var _object = require("./object");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FileStatus {
  constructor(path) {
    _defineProperty(this, "lastModified", 0);

    _defineProperty(this, "source", "");

    _defineProperty(this, "dir", void 0);

    _defineProperty(this, "status", "");

    _defineProperty(this, "target", "");

    _defineProperty(this, "targetDir", "");

    _defineProperty(this, "targetLastModified", 0);

    _defineProperty(this, "ext", "");

    _defineProperty(this, "targetExt", "");

    this.dir = path;
  }

  static containsChange(list) {
    let changeFound = false;
    list.forEach(entry => {
      if (entry.isNewOrModified()) {
        changeFound = true;
      }
    });
    return changeFound;
  }

  setSoure(file, ext) {
    this.source = file;
    this.ext = ext;
    this.lastModified = _files.FileUtils.getLastModified(this.dir, this.source);
    this.status = "unknown";
  }

  setTarget(path, ext, flatten = false) {
    this.targetDir = path;
    this.targetExt = ext;

    if (flatten) {
      this.target = (0, _path.join)((0, _path.basename)(this.source, this.ext).concat(this.targetExt));
    } else {
      this.target = (0, _path.join)((0, _path.dirname)(this.source), (0, _path.basename)(this.source, this.ext)).concat(this.targetExt);
    }

    if ((0, _shelljs.test)("-e", (0, _path.join)(this.targetDir, this.target))) {
      this.targetLastModified = _files.FileUtils.getLastModified(this.targetDir, this.target);
      this.status = this.lastModified > this.targetLastModified ? "modified" : "unchanged";
    } else {
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

  let sources = _files.FileUtils.getFileList(opts.sourcePath, {
    allowedExtensions: opts.sourceExt
  });

  sources.forEach(file => {
    if (_object.ArrayUtils.inExcludeList(opts.excludeList || [], file)) return;
    let status = new FileStatus(opts.sourcePath);
    status.setSoure(file, (0, _path.extname)(file));
    status.setTarget(opts.targetPath, opts.targetExt, opts.flatten != undefined && opts.flatten);
    changes.push(status);
  });
  return changes;
}
//# sourceMappingURL=file-diff.js.map