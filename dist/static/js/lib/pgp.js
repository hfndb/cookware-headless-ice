"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signFile = signFile;

var _shelljs = require("shelljs");

var _log = require("./log");

function signFile(file) {
  let log = _log.Logger.getInstance();

  try {
    (0, _shelljs.exec)(`gpg --clearsign ${file}`, {});
    log.info(`File signed: ${file}`);
    (0, _shelljs.rm)(file);
    (0, _shelljs.mv)(file.concat(".asc"), file);
  } catch (err) {
    log.error(`- Failed to sign file ${file}`, _log.Logger.error2string(err));
  }
}