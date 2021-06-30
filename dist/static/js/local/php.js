"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PhpUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _lib = require("../lib");

var _beautify = require("../lib/beautify");

let cfg = _lib.AppConfig.getInstance();

let log = _lib.Logger.getInstance(cfg.options.logging);

class PhpUtils {
  static beautify(entry) {
    let toReturn = true;

    if (cfg.options.server.beautify.includes("php")) {
      let fullPath = (0, _path.join)(entry.dir, entry.source);

      let source = _lib.FileUtils.readFile(fullPath);

      source = _beautify.Beautify.content(entry.source, source);

      if (source) {
        _lib.FileUtils.writeFile(entry.dir, entry.source, source, false);
      } else {
        toReturn = false;
      }
    }

    return toReturn;
  }

}

exports.PhpUtils = PhpUtils;
//# sourceMappingURL=php.js.map