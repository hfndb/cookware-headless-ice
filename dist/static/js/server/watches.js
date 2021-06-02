"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateWatches = exports.initWatches = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
const config_1 = require("../lib/config");
const babel_1 = require("../local/babel");
const javascript_1 = require("../local/javascript");
const styling_1 = require("../local/styling");
const session_1 = require("../sys/session");
let cfg = config_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance();
class ConfigWatch extends lib_1.FileWatcher {
    change(event, file) {
        event;
        file;
        cfg.read();
        log.info(`- settings.json changed and reloaded`);
    }
}
class SassWatch extends lib_1.FileWatcher {
    change(event, file) {
        event;
        if (path_1.extname(file) != ".scss") {
            return;
        }
        if (styling_1.Double.is(file))
            return;
        log.info(`- ${file} changed`);
        let session = session_1.SessionVars.getInstance();
        session.add(session_1.ProcessingTypes.sass, file);
        let status = new lib_1.FileStatus(path_1.join(cfg.dirProject, cfg.options.sass.dirs.source));
        status.setSoure(file, ".scss");
        status.setTarget(styling_1.SassUtils.getOutputDir(), ".css");
        if (styling_1.SassFiles.isImport(file)) {
            styling_1.SassUtils.beautify(status);
            styling_1.SassUtils.compile(true, true);
        }
        else {
            styling_1.SassUtils.compileFile(status);
        }
    }
}
class JsWatch extends lib_1.FileWatcher {
    change(event, file) {
        event;
        if (path_1.extname(file) != ".js" && path_1.extname(file) != ".ts") {
            return;
        }
        if (styling_1.Double.is(file))
            return;
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
                    shelljs_1.exec(`ctags-exuberant --fields=nksSaf --file-scope=yes -R  ${path_1.join(cfg.dirProject, cfg.options.javascript.dirs.source)}`, { async: true });
                }
        }
    }
}
function initWatches() {
    ConfigWatch.instance = new ConfigWatch(cfg.dirProject, "", "settings.json", cfg.options.server.watchTimeout, "project settings file (settings.json)");
    SassWatch.instance = new SassWatch(cfg.dirProject, cfg.options.sass.dirs.source, "", cfg.options.server.watchTimeout, "Sass files");
    if (cfg.options.javascript.useWatch) {
        let tp = "JavaScript";
        switch (cfg.options.javascript.compiler) {
            case "flow":
                tp = "Flow";
                break;
            case "typescript":
                tp = "TypeScript";
                break;
        }
        JsWatch.instance = new JsWatch(cfg.dirProject, cfg.options.javascript.dirs.source, "", cfg.options.server.watchTimeout, `${tp} files`);
    }
}
exports.initWatches = initWatches;
function terminateWatches() {
    if (ConfigWatch.instance instanceof Object) {
        ConfigWatch.instance.stop();
    }
    if (SassWatch.instance instanceof Object) {
        SassWatch.instance.stop();
    }
    if (JsWatch.instance instanceof Object) {
        JsWatch.instance.stop();
    }
}
exports.terminateWatches = terminateWatches;
//# sourceMappingURL=watches.js.map