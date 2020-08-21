"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateJsDocs = generateJsDocs;
exports.JavascriptUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

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

    if (cfg.options.javascript.bundles.length == 0 && cfg.options.javascript.apps.length == 0) {
      return lst;
    }

    for (let i = 0; i < cfg.options.javascript.bundles.length; i++) {
      let bundle = cfg.options.javascript.bundles[i];
      Bundle.create(bundle);
      lst.push(bundle.output);
    }

    for (let i = 0; i < cfg.options.javascript.apps.length; i++) {
      let bundle = cfg.options.javascript.apps[i];
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
  static isChanged(bundle, outDir) {
    if (!(0, _shelljs.test)("-f", (0, _path.join)(outDir, bundle.output))) return true;
    let path = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source);

    let last = _lib.FileUtils.getLastModified(outDir, bundle.output);

    bundle.source.forEach(item => {
      let srcFile = (0, _path.join)(path, item);

      let ths = _lib.FileUtils.getLastModified(path, item);

      if (ths > last) {
        return true;
      }
    });
    return false;
  }

  static create(bundle) {
    let outDir = JavascriptUtils.getOutputDir();
    if (!Bundle.isChanged(bundle, outDir)) return;
    let items = [];
    let outfile = (0, _path.join)(outDir, bundle.output);
    (0, _shelljs.rm)("-f", outfile);
    bundle.source.forEach(item => {
      items.push((0, _path.join)(outDir, item));
    });
    (0, _shelljs.cat)(items).to(outfile);
    log.info(`- written Javascript bundle ${bundle.output}`);
    return;
  }

}

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