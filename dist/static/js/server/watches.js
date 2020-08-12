"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const config_1 = require("../lib/config");
const babel_1 = require("../local/babel");
const javascript_1 = require("../local/javascript");
const styling_1 = require("../local/styling");
const session_1 = require("../sys/session");
class Double {
    static is(file) {
        let interval = 1 * 2000;
        let now = new Date().getTime();
        let last = Double.reg[file] || now - interval - 10;
        if (now - last > interval) {
            Double.reg[file] = now;
            return false;
        }
        return true;
    }
}
Double.reg = {};
class ConfigWatch extends lib_1.FileWatcher {
    change(event, file) {
        let cfg = config_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        event;
        file;
        cfg.read();
        log.info(`- config.json changed and reloaded`);
    }
}
exports.ConfigWatch = ConfigWatch;
class CssWatch extends lib_1.FileWatcher {
    change(event, file) {
        event;
        if (path_1.extname(file) != ".css") {
            return;
        }
        let cfg = config_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        log.info(`- ${file} changed`);
        shelljs_1.cp(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source, file), styling_1.SassUtils.getOutputDir());
    }
}
exports.CssWatch = CssWatch;
class SassWatch extends lib_1.FileWatcher {
    change(event, file) {
        let cfg = config_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        event;
        if (path_1.extname(file) != ".scss") {
            return;
        }
        if (Double.is(file))
            return;
        log.info(`- ${file} changed`);
        let session = session_1.SessionVars.getInstance();
        session.add(session_1.ProcessingTypes.sass, file);
        if (path_1.basename(file, ".scss").startsWith("_")) {
            styling_1.SassUtils.compile(true);
        }
        else {
            let status = new lib_1.FileStatus(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source));
            status.setSoure(file, ".scss");
            status.setTarget(styling_1.SassUtils.getOutputDir(), ".css");
            styling_1.SassUtils.compileFile(status);
        }
    }
}
exports.SassWatch = SassWatch;
class JsWatch extends lib_1.FileWatcher {
    change(event, file) {
        event;
        if (path_1.extname(file) != ".js" && path_1.extname(file) != ".ts") {
            return;
        }
        if (Double.is(file))
            return;
        let cfg = config_1.AppConfig.getInstance();
        let log = lib_1.Logger.getInstance();
        log.info(`- ${file} changed`);
        let dir = path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source);
        let isTypescript = path_1.extname(file) == ".ts";
        let status = new lib_1.FileStatus(dir);
        status.setSoure(file, isTypescript ? ".ts" : ".js");
        status.setTarget(path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");
        switch (cfg.options.javascript.compiler) {
            case "":
                shelljs_1.cp(path_1.join(dir, file), path_1.join(cfg.dirProject, cfg.options.javascript.dirs.output, file));
            default:
                let session = session_1.SessionVars.getInstance();
                session.add(isTypescript ? session_1.ProcessingTypes.typescript : session_1.ProcessingTypes.javascript, file);
                babel_1.compileFile(status, true);
                javascript_1.JavascriptUtils.bundle();
                if (cfg.options.javascript.generateTags) {
                    shelljs_1.exec(`ctags-exuberant -R  ${path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source)}`, { async: true });
                }
        }
    }
}
exports.JsWatch = JsWatch;
//# sourceMappingURL=watches.js.map