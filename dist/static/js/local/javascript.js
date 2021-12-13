"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JavascriptUtils = exports.Bundle = void 0;
exports.generateJsDocs = generateJsDocs;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _stripping = require("../lib/stripping");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

let cfg = _lib.AppConfig.getInstance();

let log = _lib.Logger.getInstance(cfg.options.logging);

class JavascriptUtils {
  static getOutputDir() {
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

    let outputDir = "";

    if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output))) {
      outputDir = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output);
    } else if ((0, _shelljs.test)("-d", cfg.options.javascript.dirs.output)) {
      outputDir = cfg.options.javascript.dirs.output;
    } else {
      log.error("JavaScript output directory couldn't be determined");
    }

    return outputDir;
  }

  static bundle() {
    let outDir = JavascriptUtils.getOutputDir();
    let nodeExec = (0, _path.join)(cfg.dirMain, "node_modules", "node", "bin", "node");
    let execPath = (0, _path.join)(cfg.dirMain, "dist", "static", "js", "local");
    let lst = [];
    let path;
    Bundle.init();

    for (let i = 0; Bundle.bundles && i < Bundle.bundles.length; i++) {
      let bundle = Bundle.bundles[i];
      Bundle.create(bundle, i == 0);
      lst.push(bundle.output);
    }

    for (let i = 0; Bundle.apps && i < Bundle.apps.length; i++) {
      let bundle = Bundle.apps[i];
      let outfile = (0, _path.join)(outDir, bundle.output);
      lst.push(bundle.output);
      (0, _shelljs.rm)("-f", outfile);
      let cmd = `${nodeExec} ${(0, _path.join)(execPath, "create-app.js")} ${cfg.dirProject}` + ` ${i}`;

      if (process.env.NODE_ENV == "production") {
        cmd += " 1";
      }

      (0, _shelljs.exec)(cmd);

      for (let i = 0; bundle.cleanup && i < bundle.cleanup.length; i++) {
        let file = (0, _path.join)(outDir, bundle.cleanup[i]);
        if ((0, _shelljs.test)("-e", file)) (0, _shelljs.rm)("-rf", file);
        file += ".map";
        if ((0, _shelljs.test)("-e", file)) (0, _shelljs.rm)(file);
      }
    }

    return lst;
  }

}

exports.JavascriptUtils = JavascriptUtils;

class Bundle {
  static init() {
    let path;

    if (!Bundle.bundles) {
      path = (0, _path.join)(cfg.dirProject, "dev", "bundles.json");
      Bundle.bundles = (0, _shelljs.test)("-f", (0, _path.join)(path)) ? _lib.FileUtils.readJsonFile(path) : null;
    }

    if (!Bundle.apps) {
      path = (0, _path.join)(cfg.dirProject, "dev", "apps.json");
      Bundle.apps = (0, _shelljs.test)("-f", (0, _path.join)(path)) ? _lib.FileUtils.readJsonFile(path) : null;
    }
  }

  static isChanged(bundle, outDir) {
    if (!(0, _shelljs.test)("-f", (0, _path.join)(outDir, bundle.output))) return true;
    let changed = false;
    let path = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source);

    let last = _lib.FileUtils.getLastModified(outDir, bundle.output);

    bundle.source.forEach(item => {
      let srcFile = (0, _path.join)(path, item);

      let ths = _lib.FileUtils.getLastModified(path, item);

      if (ths > last) {
        changed = true;
      }
    });
    return changed;
  }

  static create(bundle, writeDict) {
    let outDir = JavascriptUtils.getOutputDir();
    if (!Bundle.isChanged(bundle, outDir)) return;
    let content = "";
    let shr = new _stripping.Shrinker();
    let toWrite = "";
    let useStrictNeeded = true;
    (0, _shelljs.rm)("-f", (0, _path.join)(outDir, bundle.output));

    if (bundle.header) {
      toWrite = _lib.FileUtils.readFile((0, _path.join)(cfg.dirProject, bundle.header));
      useStrictNeeded = false;
    }

    bundle.source.forEach(item => {
      content = _lib.FileUtils.readFile((0, _path.join)(outDir, item));

      if (!useStrictNeeded) {
        content = content.replace('"use strict";', "");
      }

      useStrictNeeded = false;
      toWrite += content.trim() + "\n";
    });

    _lib.FileUtils.writeFile(outDir, bundle.output, toWrite, false);

    if (cfg.options.stripping.auto || bundle.compress) {
      toWrite = (0, _stripping.stripJs)(toWrite);

      let file = _lib.FileUtils.getSuffixedFile(bundle.output, cfg.options.stripping.suffix);

      _lib.FileUtils.writeFile(outDir, file + "~", toWrite, false);

      toWrite = shr.shrinkFile(toWrite, writeDict);

      _lib.FileUtils.writeFile(outDir, file, toWrite, false);
    }

    log.info(`- written Javascript bundle ${bundle.output}`);
    return;
  }

  static needsStripping(file) {
    let toReturn = false;
    Bundle.init();

    for (let i = 0; Bundle.bundles && i < Bundle.bundles.length && !toReturn; i++) {
      let bundle = Bundle.bundles[i];

      if (bundle.source.includes(file) && bundle.removeImports) {
        toReturn = true;
      }
    }

    return toReturn;
  }

}

exports.Bundle = Bundle;

_defineProperty(Bundle, "apps", void 0);

_defineProperty(Bundle, "bundles", void 0);

function generateJsDocs() {
  let options = cfg.options.dependencies.jsdoc.config;
  let dir = options.opts.destination;
  options.opts.destination = (0, _path.join)(cfg.dirProject, dir);

  for (let i = 0; i < options.source.include.length; i++) {
    options.source.include[i] = (0, _path.join)(cfg.dirProject, options.source.include[i]);
  }

  _lib.FileUtils.writeJsonFile(options, cfg.dirTemp, ".jsdoc.json", false);

  if ((0, _shelljs.test)("-d", options.opts.destination)) {
    (0, _shelljs.rm)("-rf", (0, _path.join)(options.opts.destination, "*"));
  } else {
    _lib.FileUtils.mkdir(options.opts.destination);
  }

  log.info(`Generating API docs of JavaScript files, in ${dir}`);
  (0, _shelljs.exec)(`jsdoc --configure ${(0, _path.join)(cfg.dirTemp, ".jsdoc.json")}`, {
    async: true
  });
}
//# sourceMappingURL=javascript.js.map