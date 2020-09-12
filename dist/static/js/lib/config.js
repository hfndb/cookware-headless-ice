"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppMenu = exports.AppConfig = void 0;

var _os = require("os");

var _path = require("path");

var _shelljs = require("shelljs");

var _defaultConfig = require("../default-config");

var _log = require("./log");

var _dirs = require("./dirs");

var _files = require("./files");

var _object = require("./object");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class AppConfig {
  constructor(name) {
    _defineProperty(this, "dirHome", void 0);

    _defineProperty(this, "dirMain", void 0);

    _defineProperty(this, "dirProject", void 0);

    _defineProperty(this, "dirTemp", void 0);

    _defineProperty(this, "isProject", void 0);

    _defineProperty(this, "defaults", void 0);

    _defineProperty(this, "options", void 0);

    this.dirHome = (0, _os.homedir)();
    this.dirTemp = (0, _path.join)((0, _os.tmpdir)(), name);

    _files.FileUtils.mkdir(this.dirTemp);

    this.dirProject = (0, _path.normalize)(process.cwd());
    this.dirMain = (0, _path.normalize)(__dirname);
    this.dirMain = AppConfig.getProjectDir(this.dirMain);

    if (process.env.NODE_ENV == "test") {
      this.isProject = false;
      this.dirProject = this.dirMain;
    } else {
      this.isProject = this.dirProject != this.dirMain;
    }

    this.read();
    let dir = (0, _path.join)(this.dirProject, "node_modules");
    let paths = [];
    let sep = (0, _os.platform)() == "win32" ? ";" : ":";

    if (this.isProject && (0, _shelljs.test)("-d", dir)) {
      paths.push(dir);
    }

    paths.push((0, _path.join)(this.dirMain, "node_modules"));

    if (this.options.env.node_path && this.options.env.node_path.length > 0) {
      paths = paths.concat(this.options.env.node_path);
    }

    process.env.NODE_PATH = paths.join(sep);

    require("module").Module._initPaths();
  }

  mergeInto(additional) {
    let options = _files.FileUtils.readJsonFile(additional, false);

    if (!options || Object.keys(options).length == 0) {
      process.exit(-1);
      return;
    }

    if (this.options.version != options.version) {
      console.warn(`Check and correct your project configuration and documentation about it:\n${(0, _path.join)(this.dirMain, "config.json")} \n\nDefault settings and project settings aren't the same version\n`);
    }

    _object.ObjectUtils.mergeDeep(this.options, options);
  }

  static getProjectDir(dir) {
    while (dir.length > 2 && !(0, _shelljs.test)("-f", (0, _path.join)(dir, "config.json"))) {
      dir = (0, _path.normalize)((0, _path.join)(dir, ".."));
    }

    return dir;
  }

  static getInstance(name = "", dirProject = "") {
    if (!AppConfig.instance) {
      if (!name) console.log(new Error("AppConfig initialized without project name"));
      let dirMain = (0, _path.normalize)(process.cwd());

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
    let defaults = JSON.stringify(_defaultConfig.DefaultConfig);
    this.defaults = JSON.parse(defaults);
    this.options = JSON.parse(defaults);

    if (process.env.isNew != undefined) {
      return this.options;
    }

    let settings = (0, _path.join)(this.dirProject, "config.json");

    if (!(0, _shelljs.test)("-f", settings)) {
      console.error(`Project settings ${settings} not found`);
      process.exit(-1);
    }

    this.mergeInto(settings);
  }

  static showConfig(options = null) {
    const diff = require("deep-diff").diff;

    let cfg = AppConfig.getInstance();

    let log = _log.Logger.getInstance();

    let checkProjects = options ? false : true;
    if (!options) options = cfg.defaults;
    let changes = diff(cfg.defaults, cfg.options);
    let cols = [10, 50, 50, 50];
    let line = "".padEnd(cols[0] + cols[1] + cols[2] + cols[3], "-");
    console.log(line);
    console.log("Default configuration settings:");
    console.log(line);
    console.log(_object.ObjectUtils.toString(options, false));
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
    Object.values(changes).forEach(value => {
      let isArrayChange = false;
      let path = value.path.join("/");

      if (paths.includes(path)) {
        return;
      } else {
        paths.push(path);
      }

      let present = value.kind;
      if (present == "D") return;

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
        } else if (typeof value == "object" || Array.isArray(value)) {
          retVal = "\n" + JSON.stringify(value, null, 2);
        }

        return String(retVal);
      }

      if (isArrayChange) {
        output += "\n";
      } else {
        output += convert(value.lhs).padEnd(cols[2], " ");
        output += convert(value.rhs).padEnd(cols[3], " ") + "\n";
      }
    });
    console.log(output);
    if (!checkProjects) return;
    let projects = cfg.options.projects;
    let saydHello = false;
    projects.forEach(project => {
      let opts = _files.FileUtils.readJsonFile(project, true);

      if (opts.version != undefined && opts.version != options.version) {
        if (!saydHello) {
          log.info(`Checking project config(s).Should be version ${options.version}`);
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
    let dir = (0, _path.join)(cfg.dirMain, "default-project");

    if (!(0, _shelljs.test)("-d", dir)) {
      console.error(`Couldn't find directory ${dir}`);
      return;
    }

    console.log("Initializing new project directory");
    (0, _shelljs.cp)("-fr", (0, _path.join)(dir, _path.sep, "*"), (0, _path.join)(cfg.dirProject, _path.sep));
    cfg.read();

    let log = _log.Logger.getInstance(cfg.options.logging);

    process.on("uncaughtException", err => {
      if (!log.isShuttingDown) {
        console.log(_log.Logger.error2string(err));
      }
    });
    (0, _dirs.createDirTree)(cfg.dirProject, cfg.options.newProject.dirStructure, true);
    console.log("... done");
  }

}

exports.AppConfig = AppConfig;

_defineProperty(AppConfig, "instance", null);

class AppMenu {
  constructor() {
    _defineProperty(this, "checkOverridesShortcutC", {
      alias: "c",
      name: "config",
      type: Boolean,
      description: "Check your project config.json; default and overridden settings"
    });

    _defineProperty(this, "initializeNewProjectShortcutI", {
      alias: "i",
      name: "init",
      type: Boolean,
      description: "Initalize new project in current working directory"
    });

    _defineProperty(this, "playgroundShortcutY", {
      alias: "y",
      name: "playground",
      type: Boolean,
      description: "For developement purposes: Play with functionality. Shortcut y for Y-incison during autopsy (from Greek for 'seeing with your own eyes') 😀"
    });

    _defineProperty(this, "helpShortcutH", {
      alias: "h",
      name: "help",
      type: Boolean,
      description: "Display this usage guide."
    });

    _defineProperty(this, "options", []);
  }

  static getInstance() {
    if (!AppMenu.instance) {
      AppMenu.instance = new AppMenu();
    }

    return AppMenu.instance;
  }

  getUserChoice() {
    for (let current = 0; current < this.options.length; current++) {
      if (process.env.NODE_ENV == "production") break;

      for (let toCheck = 0; toCheck < this.options.length; toCheck++) {
        if (toCheck <= current) continue;

        if (this.options[toCheck].alias && this.options[current].alias == this.options[toCheck].alias) {
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
    } catch (error) {}

    return chosen;
  }

  showHelp(opts) {
    const commandLineUsage = require("command-line-usage");

    const usage = commandLineUsage(opts);
    console.log(usage);
  }

  addOption(opt) {
    if (!opt.module) opt.module = "main";
    this.options.push(opt);
  }

}

exports.AppMenu = AppMenu;

_defineProperty(AppMenu, "instance", null);