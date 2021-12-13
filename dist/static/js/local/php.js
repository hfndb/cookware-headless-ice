"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpUtils = void 0;
const path_1 = require("path");
const lib_1 = require("../lib");
const beautify_1 = require("../lib/beautify");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance(cfg.options.logging);
class PhpUtils {
    static beautify(entry) {
        let toReturn = true;
        if (cfg.options.server.beautify.includes("php")) {
            let fullPath = path_1.join(entry.dir, entry.source);
            let source = lib_1.FileUtils.readFile(fullPath);
            source = beautify_1.Beautify.content(entry.source, source);
            if (source) {
                lib_1.FileUtils.writeFile(entry.dir, entry.source, source, false);
            }
            else {
                toReturn = false;
            }
        }
        return toReturn;
    }
}
exports.PhpUtils = PhpUtils;
//# sourceMappingURL=php.js.map