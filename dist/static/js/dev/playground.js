"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.playGround = playGround;

require("source-map-support/register");

var _lib = require("../lib");

function playGround() {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  log.info("Start playing...");
}
//# sourceMappingURL=playground.js.map