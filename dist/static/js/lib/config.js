"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppMenu = exports.AppConfig = void 0;
const os_1 = require("os");
const path_1 = require("path");
const shelljs_1 = require("shelljs");
const shelljs_2 = require("shelljs");
const default_settings_1 = require("../default-settings");
const log_1 = require("./log");
const dirs_1 = require("./dirs");
const files_1 = require("./files");
const object_1 = require("./object");
class AppConfig {
    constructor(name) {
        this.dirHome = os_1.homedir();
        this.dirTemp = path_1.join(os_1.tmpdir(), name);
        files_1.FileUtils.mkdir(this.dirTemp);
        this.dirProject = path_1.normalize(process.cwd());
        this.dirMain = path_1.normalize(__dirname);
        this.dirMain = AppConfig.getProjectDir(this.dirMain);
        if (process.env.NODE_ENV == "test") {
            this.isProject = false;
            this.dirProject = this.dirMain;
        }
        else {
            this.isProject = this.dirProject != this.dirMain;
        }
        this.read();
        let dir = path_1.join(this.dirProject, "node_modules");
        let paths = [];
        let sep = os_1.platform() == "win32" ? ";" : ":";
        if (this.isProject && shelljs_2.test("-d", dir)) {
            paths.push(dir);
        }
        paths.push(path_1.join(this.dirMain, "node_modules"));
        if (this.options.env.node_path && this.options.env.node_path.length > 0) {
            paths = paths.concat(this.options.env.node_path);
        }
        process.env.NODE_PATH = paths.join(sep);
        require("module").Module._initPaths();
    }
    mergeInto(additional) {
        let options = files_1.FileUtils.readJsonFile(additional, false);
        if (!options || Object.keys(options).length == 0) {
            process.exit(-1);
            return;
        }
        if (this.options.version != options.version) {
            console.warn(`Check and correct your project configuration and documentation about it:\n${path_1.join(this.dirMain, "settings.json")} \n\nDefault settings and project settings aren't the same version\n`);
        }
        object_1.ObjectUtils.mergeDeep(this.options, options);
    }
    static getProjectDir(dir) {
        while (dir.length > 2 && !shelljs_2.test("-f", path_1.join(dir, "settings.json"))) {
            dir = path_1.normalize(path_1.join(dir, ".."));
        }
        return dir;
    }
    static getInstance(name = "", dirProject = "") {
        if (!AppConfig.instance) {
            if (!name)
                console.log(new Error("AppConfig initialized without project name"));
            let dirMain = path_1.normalize(process.cwd());
            if (dirProject) {
                dirProject = AppConfig.getProjectDir(dirProject);
                process.chdir(dirProject);
            }
            AppConfig.instance = new AppConfig(name);
            if (dirProject) {
                process.chdir(dirMain);
            }
        }
        return AppConfig.instance;
    }
    read() {
        let defaults = JSON.stringify(default_settings_1.DefaultConfig);
        this.defaults = JSON.parse(defaults);
        this.options = JSON.parse(defaults);
        if (process.env.isNew != undefined) {
            return this.options;
        }
        let settings = path_1.join(this.dirProject, "settings.json");
        if (!shelljs_2.test("-f", settings)) {
            console.error(`Project settings ${settings} not found`);
            process.exit(-1);
        }
        this.mergeInto(settings);
    }
    static showConfig(options = null) {
        const diff = require("deep-diff").diff;
        let cfg = AppConfig.getInstance();
        let log = log_1.Logger.getInstance();
        let checkProjects = options ? false : true;
        if (!options)
            options = cfg.defaults;
        let changes = diff(cfg.defaults, cfg.options);
        let cols = [10, 50, 50, 50];
        let line = "".padEnd(cols[0] + cols[1] + cols[2] + cols[3], "-");
        console.log(line);
        console.log("Default configuration settings:");
        console.log(line);
        console.log(object_1.ObjectUtils.toString(options, false));
        console.log("");
        console.log(line);
        console.log("Project configuration changes, overrides of default settings:");
        let output = "Kind".padEnd(cols[0], " ");
        output += "Path".padEnd(cols[1], " ");
        output += "Application".padEnd(cols[2], " ");
        output += "Project".padEnd(cols[3], " ");
        console.log(output);
        console.log(line);
        output = "";
        let paths = [];
        Object.values(changes).forEach((value) => {
            let isArrayChange = false;
            let path = value.path.join("/");
            if (paths.includes(path)) {
                return;
            }
            else {
                paths.push(path);
            }
            let present = value.kind;
            if (present == "D")
                return;
            switch (present) {
                case "N":
                    present = "Added";
                    break;
                case "A":
                    isArrayChange = true;
                case "E":
                    present = "Edited";
                    break;
            }
            output += present.padEnd(cols[0], " ");
            output += path.padEnd(cols[1], " ");
            function convert(value) {
                let retVal = value;
                if (value == undefined) {
                    retVal = "";
                }
                else if (typeof value == "object" || Array.isArray(value)) {
                    retVal = "\n" + JSON.stringify(value, null, 2);
                }
                return String(retVal);
            }
            if (isArrayChange) {
                output += "\n";
            }
            else {
                output += convert(value.lhs).padEnd(cols[2], " ");
                output += convert(value.rhs).padEnd(cols[3], " ") + "\n";
            }
        });
        console.log(output);
        if (!checkProjects)
            return;
        let projects = cfg.options.projects;
        let saydHello = false;
        projects.forEach(project => {
            let opts = files_1.FileUtils.readJsonFile(project, true);
            if (opts.version != undefined && opts.version != options.version) {
                if (!saydHello) {
                    log.info(`Checking project setting(s).Should be version ${options.version}`);
                    saydHello = true;
                }
                log.warn(`- Version number ${opts.version} in ${project}`);
            }
        });
        if (saydHello) {
            log.info("... done");
        }
    }
    static initNewProject() {
        process.env.isNew = "true";
        let cfg = AppConfig.getInstance("cookware-headless-ice");
        let dir = path_1.join(cfg.dirMain, "default-project");
        if (!shelljs_2.test("-d", dir)) {
            console.error(`Couldn't find directory ${dir}`);
            return;
        }
        console.log("Initializing new project directory");
        shelljs_1.cp("-fr", path_1.join(dir, path_1.sep, "*"), path_1.join(cfg.dirProject, path_1.sep));
        cfg.read();
        let log = log_1.Logger.getInstance(cfg.options.logging);
        process.on("uncaughtException", err => {
            if (!log.isShuttingDown) {
                console.log(log_1.Logger.error2string(err));
            }
        });
        dirs_1.createDirTree(cfg.dirProject, cfg.options.newProject.dirStructure, true);
        console.log("... done");
    }
}
exports.AppConfig = AppConfig;
AppConfig.instance = null;
class AppMenu {
    constructor() {
        this.checkOverridesShortcutC = {
            alias: "c",
            name: "config",
            type: Boolean,
            description: "Check your project settings.json; default and overridden settings"
        };
        this.initializeNewProjectShortcutI = {
            alias: "i",
            name: "init",
            type: Boolean,
            description: "Initalize new project in current working directory"
        };
        this.playgroundShortcutY = {
            alias: "y",
            name: "playground",
            type: Boolean,
            description: "For developement purposes: Play with functionality."
        };
        this.helpShortcutH = {
            alias: "h",
            name: "help",
            type: Boolean,
            description: "Display this usage guide."
        };
        this.options = [];
    }
    static getInstance() {
        if (!AppMenu.instance) {
            AppMenu.instance = new AppMenu();
        }
        return AppMenu.instance;
    }
    getUserChoice() {
        for (let current = 0; current < this.options.length; current++) {
            if (process.env.NODE_ENV == "production")
                break;
            for (let toCheck = 0; toCheck < this.options.length; toCheck++) {
                if (toCheck <= current)
                    continue;
                if (this.options[toCheck].alias &&
                    this.options[current].alias == this.options[toCheck].alias) {
                    console.log(`- Double shortcut ${this.options[toCheck].alias} in modules ${this.options[current].module} and ${this.options[toCheck].module}`);
                    delete this.options[toCheck].alias;
                }
                if (this.options[current].name == this.options[toCheck].name) {
                    console.log(`- Double name ${this.options[toCheck].name} in modules ${this.options[current].module} and ${this.options[toCheck].module}`);
                }
            }
        }
        const commandLineArgs = require("command-line-args");
        let chosen = {};
        try {
            chosen = commandLineArgs(this.options);
        }
        catch (error) {
        }
        return chosen;
    }
    showHelp(opts) {
        const commandLineUsage = require("command-line-usage");
        const usage = commandLineUsage(opts);
        console.log(usage);
    }
    addOption(opt) {
        if (!opt.module)
            opt.module = "main";
        this.options.push(opt);
    }
}
exports.AppMenu = AppMenu;
AppMenu.instance = null;
//# sourceMappingURL=config.js.map