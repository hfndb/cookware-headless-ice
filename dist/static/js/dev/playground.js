"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playGround = void 0;
const lib_1 = require("../lib");
function playGround() {
    let cfg = lib_1.AppConfig.getInstance();
    let log = lib_1.Logger.getInstance(cfg.options.logging);
    log.info("Start playing...");
}
exports.playGround = playGround;
//# sourceMappingURL=playground.js.map