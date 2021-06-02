"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NunjucksUtils = void 0;
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const files_1 = require("./files");
const log_1 = require("./log");
const nunjucks = require("nunjucks");
class CacheItem {
    constructor(dir, file, stripFoundTags) {
        this.blocks = [];
        this.changedExtends = "";
        this.includes = [];
        this.lastModified = 0;
        this.extends = [];
        this.rawData = "";
        this.variables = [];
        this.template = [dir, file];
        this.rawData = files_1.FileUtils.readFile(path_1.join(dir, file));
        this.stripFoundTags = stripFoundTags;
    }
}
class NunjucksUtils {
    constructor() {
        this.cache = [];
        this.debug = false;
    }
    static setExtends(template, trimBegin = false, trimEnd = false) {
        return `{%${trimBegin ? "- " : ""} extends "${template}" ${trimEnd ? " -" : ""}%}\n`;
    }
    static setVariable(name, value, type, trimBegin = false, trimEnd = false) {
        switch (type) {
            case "boolean":
                value = value ? "true" : "false";
                break;
            case "number":
                break;
            case "object":
                value = JSON.stringify(value, null, "\t");
                break;
            case "string":
                value = `"${value}"`;
                break;
            default:
                console.log(`Unknown type ${type} for variable ${name} received in NunjucksUtils.setVariable()`);
                break;
        }
        return `{% set${trimBegin ? "- " : ""} ${name} = ${value} ${trimEnd ? " -" : ""}%}\n`;
    }
    static setBlock(name, value, trimBegin = false, trimEnd = false, closingTrimBegin = false, closingTrimEnd = false) {
        return `{%${trimBegin ? "- " : ""} block ${name} ${trimEnd ? " -" : ""}%}
${value}
{%${closingTrimBegin ? "- " : ""} endblock ${closingTrimEnd ? " -" : ""}%}\n`;
    }
    static getEnvironment(searchPaths) {
        let cfg = config_1.AppConfig.getInstance();
        let env = nunjucks.configure(searchPaths[0], cfg.options.dependencies.nunjucks.config);
        for (let i = 1; i < searchPaths.length; i++) {
            env.loaders[0].searchPaths.push(searchPaths[i]);
        }
        return env;
    }
    static getSearchPaths() {
        let cfg = config_1.AppConfig.getInstance();
        let searchPaths = [];
        for (let i = 0; i < cfg.options.html.dirs.templates.length; i++) {
            searchPaths.push(path_1.join(cfg.dirProject, cfg.options.html.dirs.templates[i]));
        }
        for (let i = 0; i < cfg.options.html.dirs.includes.length; i++) {
            searchPaths.push(path_1.join(cfg.dirProject, cfg.options.html.dirs.includes[i]));
        }
        return searchPaths;
    }
    static readExtends(item, searchPaths) {
        let log = log_1.Logger.getInstance();
        let regex = new RegExp('{%([-\\s]+)extends\\s*"(.*)"([-\\s]+)%}', "gim");
        let result = regex.exec(item.rawData) || [];
        let found = result.length > 0;
        while (found) {
            let exists = false;
            let fname = result[2];
            for (let i = 0; i < searchPaths.length; i++) {
                if (shelljs_1.test("-f", path_1.join(searchPaths[i], fname))) {
                    exists = true;
                    item.extends = [searchPaths[i], fname];
                    break;
                }
            }
            if (!exists) {
                log.warn(`File ${item.template[1]} extends non-existing file ${fname}`);
            }
            result = regex.exec(item.rawData) || [];
            found = result.length > 0;
        }
        if (item.stripFoundTags) {
            item.rawData = item.rawData.replace(regex, "").trim();
        }
    }
    static readIncludes(item, searchPaths) {
        let log = log_1.Logger.getInstance();
        let regex = new RegExp('{%([-\\s]+)include\\s*"(.*)"([-\\s]+)%}', "gim");
        let result = regex.exec(item.rawData) || [];
        let found = result.length > 0;
        while (found) {
            let exists = false;
            let fname = result[2];
            for (let i = 0; i < searchPaths.length; i++) {
                if (!shelljs_1.test("-f", path_1.join(searchPaths[i], fname)))
                    continue;
                exists = true;
                let lm = files_1.FileUtils.getLastModified(searchPaths[i], fname);
                item.includes.push([searchPaths[i], fname, lm]);
                break;
            }
            if (!exists) {
                log.warn(`File ${item.template[1]} contains non-existing include ${fname}`);
            }
            result = regex.exec(item.rawData) || [];
            found = result.length > 0;
        }
        if (item.stripFoundTags) {
            item.rawData = item.rawData.replace(regex, "").trim();
        }
    }
    static readBlocks(item) {
        let regex = new RegExp("{%([-\\s]+)block\\s*(\\w*?)([-\\s]+)%}([^]*?){%([-\\s]+)endblock\\s*([-\\s]+)%}", "gim");
        let result = regex.exec(item.rawData) || [];
        let found = result.length > 0;
        while (found) {
            item.blocks.push([
                result[2],
                result[4].trim(),
                result[1].trim().length > 0,
                result[3].trim().length > 0,
                result[5].trim().length > 0,
                result[6].trim().length > 0
            ]);
            result = regex.exec(item.rawData) || [];
            found = result.length > 0;
        }
        if (item.stripFoundTags) {
            item.rawData = item.rawData.replace(regex, "").trim();
        }
    }
    static readVariables(item) {
        let regex = new RegExp("{%([-\\s]+)set\\s*(\\w*?)\\s*=\\s*([^]*?)([-\\s]+)%}", "gim");
        let result = regex.exec(item.rawData) || [];
        let found = result.length > 0;
        while (found) {
            let val = result[3].substr(0, 1) == "{" ? JSON.parse(result[3]) : eval(result[3]);
            item.variables.push([
                result[2],
                val,
                result[1].trim().length > 0,
                result[4].trim().length > 0
            ]);
            result = regex.exec(item.rawData) || [];
            found = result.length > 0;
        }
        if (item.stripFoundTags) {
            item.rawData = item.rawData.replace(regex, "").trim();
        }
    }
    static renderFile(dir, file, context, templateDir) {
        let log = log_1.Logger.getInstance();
        let searchPaths = [];
        if (templateDir)
            searchPaths.push(templateDir);
        searchPaths = searchPaths.concat(NunjucksUtils.getSearchPaths());
        try {
            let env = NunjucksUtils.getEnvironment(searchPaths);
            NunjucksUtils.addGlobalFunctions(env);
            let data = files_1.FileUtils.readFile(path_1.join(dir, file));
            return nunjucks.renderString(data, context);
        }
        catch (err) {
            log.warn(`- Failed to render file ${file}`, log_1.Logger.error2string(err));
            return "";
        }
    }
    static addGlobalFunctions(env) {
        env.globals["getVars"] = function () {
            return this.getVariables();
        };
        env.globals["pprint"] = function (arg) {
            return JSON.stringify(arg, null, "    ");
        };
        env.globals["isString"] = function (arg) {
            return typeof arg == "string";
        };
    }
    getCacheIdx(dir, file, readIncludes = false, stripFoundTags = false) {
        for (let i = 0; i < this.cache.length; i++) {
            if (this.cache[i].template[1] == file) {
                return i;
            }
        }
        let item = new CacheItem(dir, file, stripFoundTags);
        let searchPaths = NunjucksUtils.getSearchPaths();
        NunjucksUtils.readExtends(item, searchPaths);
        if (readIncludes)
            NunjucksUtils.readIncludes(item, searchPaths);
        this.cache.push(item);
        return this.cache.length - 1;
    }
    isChanged(dir, file, lastModified) {
        let log = log_1.Logger.getInstance();
        let changed = false;
        if (!lastModified) {
            lastModified = files_1.FileUtils.getLastModified(dir, file);
        }
        let idx = this.getCacheIdx(dir, file, true);
        let item = this.cache[idx];
        item.lastModified = files_1.FileUtils.getLastModified(dir, file);
        while (!changed && item.extends[1]) {
            if (item.lastModified > lastModified) {
                this.cache[idx].changedExtends = item.template[1];
                changed = true;
                break;
            }
            for (let i = 0; !changed && i < item.includes.length; i++) {
                if (item.includes[i][2] > lastModified) {
                    this.cache[idx].changedExtends = item.includes[i][1];
                    changed = true;
                    break;
                }
            }
            if (!changed) {
                let i = this.getCacheIdx(item.extends[0], item.extends[1]);
                item = this.cache[i];
            }
        }
        if (changed && this.debug) {
            let tmp = Object.assign({}, item);
            Reflect.deleteProperty(tmp, "rawData");
            log.info(`Info collected about changed file ${file}: `, tmp);
        }
        return changed;
    }
    getUserData(dir, file, opts) {
        if (opts == undefined)
            opts = {};
        if (opts.debug != undefined)
            this.debug = opts.debug;
        if (opts.inclIncludes == undefined)
            opts.inclIncludes = false;
        if (opts.stripFoundTags == undefined)
            opts.stripFoundTags = false;
        let log = log_1.Logger.getInstance();
        let idx = this.getCacheIdx(dir, file, opts.inclIncludes, opts.stripFoundTags);
        let item = this.cache[idx];
        NunjucksUtils.readBlocks(item);
        NunjucksUtils.readVariables(item);
        let tmp = Object.assign({}, item);
        if (!opts.stripFoundTags) {
            Reflect.deleteProperty(tmp, "rawData");
        }
        if (this.debug) {
            log.info("User data", tmp);
        }
        return tmp;
    }
}
exports.NunjucksUtils = NunjucksUtils;
//# sourceMappingURL=nunjucks.js.map