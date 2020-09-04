"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const path_1 = require("path");
const shelljs_1 = require("shelljs");
let cfg = lib_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
class Beautify {
    static standAlone(path) {
        if (path.endsWith("/"))
            path = path.substr(0, path.length - 1);
        let pathIsDir = shelljs_1.test("-d", path_1.join(cfg.dirProject, path));
        let files = pathIsDir
            ? lib_1.FileUtils.getFileList(path_1.join(cfg.dirProject, path))
            : [path];
        if (!pathIsDir)
            path = "";
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let content = lib_1.FileUtils.readFile(path_1.join(cfg.dirProject, path, file));
            let data = Beautify.content(file, content);
            if (data) {
                lib_1.FileUtils.writeFile(cfg.dirProject, path_1.join(path, file), data, false);
            }
        }
    }
    static content(file, content) {
        let cfg = lib_1.AppConfig.getInstance();
        let ext = path_1.extname(file);
        let options = cfg.options.dependencies.prettier.config;
        let parser = "";
        const prettier = require("prettier");
        switch (ext) {
            case ".css":
                parser = "css";
                break;
            case ".scss":
                parser = "css";
                break;
            case ".html":
                parser = "html";
                break;
            case ".js":
                parser = "babel";
                break;
            case ".ts":
                parser = "typescript";
                break;
            default:
                return "";
        }
        Object.assign(options, {
            filepath: file,
            parser: parser
        });
        try {
            let data = prettier.format(content, options || undefined);
            log.info(`- Beautyfied ${file}`);
            return data;
        }
        catch (err) {
            log.warn(`- Failed to render file ${file} `, lib_1.Logger.error2string(err));
            return "";
        }
    }
}
exports.Beautify = Beautify;
//# sourceMappingURL=beautify.js.map