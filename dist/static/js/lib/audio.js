"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const log_1 = require("./log");
class AudioUtils {
    static async playFile(file) {
        let cfg = config_1.AppConfig.getInstance();
        let fullPath = path_1.join(cfg.dirMain, file);
        if (!shelljs_1.test("-f", fullPath)) {
            throw new Error(`File ${file} doesn't exist. Current working directory: ${process.cwd()}`);
        }
        try {
            shelljs_1.exec(`${cfg.options.audio.player} ${fullPath}`, {
                async: true,
                silent: true
            });
        }
        catch (error) {
            let log = log_1.Logger.getInstance();
            log.warn(error);
        }
    }
}
exports.AudioUtils = AudioUtils;
//# sourceMappingURL=audio.js.map