"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tags = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const lib_1 = require("../lib");
let cfg = lib_1.AppConfig.getInstance();
let log = lib_1.Logger.getInstance();
class Tags {
    static filterFlags() {
        let allowed = cfg.options.tags.styles[cfg.options.tags.style];
        if (allowed == undefined)
            log.error(`Style ${cfg.options.tags.style} for tags doesn't exist`);
        let tstAllow = new RegExp("\\b(" + allowed.join("|") + ")\\b", "i");
        let tstIgnore = new RegExp("^(" + cfg.options.tags.ignore.join("|") + ")\\b", "i");
        let projectTags = lib_1.FileUtils.readFile(path_1.join(cfg.dirProject, "tags"));
        let lines = projectTags.split("\n");
        let fileTags = [];
        for (let i = 0; i < lines.length; i++) {
            if (!tstAllow.test(lines[i]))
                continue;
            if (lines[i].startsWith("$"))
                continue;
            if (cfg.options.tags.ignore.length > 0 && tstIgnore.test(lines[i]))
                continue;
            fileTags.push(lines[i]);
        }
        return fileTags.join("\n");
    }
    static forProject(dir) {
        if (!cfg.options.tags.active)
            return;
        let cmd = "";
        switch (cfg.options.tags.generator) {
            case "exuberant":
                cmd = `ctags-exuberant --fields=nksSaf --file-scope=yes --sort=no  -R ./${dir}`;
                break;
            case "universal":
                cmd = `ctags-universal --fields=nksSaf --file-scope=yes  --sort=no --tag-relative=yes --totals=yes -R ./${dir} &> /dev/null`;
                break;
            default:
                log.error(`Generator ${cfg.options.tags.generator} not supported`);
                return;
        }
        shelljs_1.exec(`cd ${cfg.dirProject}; ${cmd}`, { async: false, silent: true });
        let tags = lib_1.FileUtils.readFile(path_1.join(cfg.dirProject, "tags"));
        lib_1.FileUtils.writeFile(cfg.dirProject, path_1.join(".tags", "tags-original"), tags, false);
        lib_1.FileUtils.writeFile(cfg.dirProject, "tags", Tags.filterFlags(), true);
    }
    static forFile(file) {
        if (!cfg.options.tags.active)
            return;
        let projectTags = lib_1.FileUtils.readFile(path_1.join(cfg.dirProject, "tags"));
        let lines = projectTags.split("\n");
        let fileTags = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(file))
                fileTags.push(lines[i]);
        }
        lib_1.FileUtils.writeFile(cfg.dirProject, path_1.join(".tags", file), fileTags.join("\n"), false);
    }
}
exports.Tags = Tags;
//# sourceMappingURL=tags.js.map