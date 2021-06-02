"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SysUtils = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const log_1 = require("./log");
class SysUtils {
    static async playFile(file) {
        let cfg = config_1.AppConfig.getInstance();
        let fullPath = path_1.join(cfg.dirMain, file);
        if (!shelljs_1.test("-f", fullPath)) {
            throw new Error(`File ${file} doesn't exist. Current working directory: ${process.cwd()}`);
        }
        try {
            shelljs_1.exec(`${cfg.options.sys.audio.player} ${fullPath}`, {
                async: true,
                silent: true
            });
        }
        catch (error) {
            let log = log_1.Logger.getInstance();
            log.warn(error);
        }
    }
    static notify(msg) {
        let cfg = config_1.AppConfig.getInstance();
        if (!cfg.options.sys.notifications.command)
            return;
        let cmd = cfg.options.sys.notifications.command +
            ' "' +
            msg +
            '" ' +
            cfg.options.sys.notifications.timeout.toString() +
            ' "' +
            cfg.options.sys.notifications.title +
            '"';
        shelljs_1.exec(cmd, { async: true });
    }
}
exports.SysUtils = SysUtils;
//# sourceMappingURL=sys.js.map