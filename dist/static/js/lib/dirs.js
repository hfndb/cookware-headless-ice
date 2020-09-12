"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDirTree = createDirTree;
exports.getDirList = getDirList;

var _fs = require("fs");

var _path = require("path");

var _shelljs = require("shelljs");

var _files = require("./files");

function createDirTree(rootDir, tree, sourceControl = false) {
  Object.entries(tree).forEach(entry => {
    let key = entry[0];

    if (key == "dirs") {
      let value = entry[1];

      for (let i = 0; i < value.length; i++) {
        _files.FileUtils.mkdir((0, _path.join)(rootDir, value[i]));

        if (sourceControl) {
          (0, _shelljs.touch)((0, _path.join)(rootDir, value[i], "delete-me.txt"));
        }
      }
    } else if (key != "length") {
      if ((0, _path.join)(rootDir, key).includes("length")) {
        throw new Error("test error");
      }

      let value = entry[1];

      _files.FileUtils.mkdir((0, _path.join)(rootDir, key));

      createDirTree((0, _path.join)(rootDir, key), value, sourceControl);
    }
  });
}

function getDirList(path, recursive = true) {
  if (!(0, _shelljs.test)("-e", path)) {
    throw new Error(`Path ${path} doesn't exist`);
  }

  let dirs = [];

  function addPath(dirname) {
    (0, _fs.readdirSync)(dirname).forEach(file => {
      const realpath = (0, _path.join)(dirname, file);

      if ((0, _shelljs.test)("-d", realpath)) {
        if (recursive) addPath(realpath);
        dirs.push(realpath.substr(path.length + 1));
      }
    });
  }

  if ((0, _shelljs.test)("-d", path)) {
    addPath(path);
  }

  return dirs;
}