"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.playGround = playGround;

require("source-map-support/register");

var _lib = require("../lib");

var _utils = require("../lib/utils");

function playGround() {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let frm = new _utils.Formatter();
  let nr = 1071;
  let r = frm.decimal(nr, 2);
  log.info(r);
}
//# sourceMappingURL=playground.js.map