"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SassUtils = exports.Double = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _beautify = require("../lib/beautify");

var _files = require("../lib/files");

var _utils = require("../lib/utils");

var _session = require("../sys/session");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

let cfg = _lib.AppConfig.getInstance();

let log = _lib.Logger.getInstance(cfg.options.logging);

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

exports.Double = Double;

_defineProperty(Double, "_instance", void 0);

_defineProperty(Double, "reg", {});

class SassUtils {
  constructor() {
    _defineProperty(this, "changeList", []);

    _defineProperty(this, "deps", {});
  }

  getEntry(file) {
    return this.changeList.find(el => el.source == file);
  }

  importChanged(entry) {
    let maxImport = 0;
    let imports = this.deps[entry.source] || [];

    for (let i = 0; i < imports.length; i++) {
      let im = imports[i];
      if (!im.startsWith("_")) im = "_" + im;
      if (!im.endsWith(".scss")) im += ".scss";
      let file = this.getEntry(im);
      if (file) maxImport = Math.max(maxImport, file.lastModified);
    }

    return entry.targetLastModified < maxImport;
  }

  read(entry) {
    let fullPath = (0, _path.join)(entry.dir, entry.source);

    let result = _utils.StringExt.matchAll(`@import ["']+(.*)["']+;`, _lib.FileUtils.readFile(fullPath));

    for (let i = 0; i < result.length; i++) {
      if (!this.deps[entry.source]) this.deps[entry.source] = [];
      this.deps[entry.source].push(result[i][0]);
    }
  }

  static beautify(entry) {
    let toReturn = true;

    if (cfg.options.server.beautify.includes("sass")) {
      let fullPath = (0, _path.join)(entry.dir, entry.source);

      let source = _lib.FileUtils.readFile(fullPath);

      source = _beautify.Beautify.content(entry.source, source);

      if (source) {
        _lib.FileUtils.writeFile(entry.dir, entry.source, source, false);
      } else {
        toReturn = false;
      }
    }

    return toReturn;
  }

  static isImport(file) {
    return (0, _path.basename)(file).startsWith("_");
  }

  static getOutputDir() {
    let outputDir = "";

    if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.output))) {
      outputDir = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.output);
    } else if ((0, _shelljs.test)("-d", cfg.options.sass.dirs.output)) {
      outputDir = cfg.options.sass.dirs.output;
    } else {
      log.error("JavaScript output directory couldn't be determined");
    }

    return outputDir;
  }

  static addPrefixes(content) {
    const autoprefixer = require("autoprefixer");

    const postcss = require("postcss");

    let result = postcss([autoprefixer]).process(content);
    result.warnings().forEach(function (warn) {
      log.warn("Warning autoprefixer: " + warn.toString());
    });
    return result.css;
  }

  static compile(verbose, isWatching = false) {
    let deps = new SassUtils();
    let outDir = SassUtils.getOutputDir();
    let processed = [];
    let saydHello = false;
    let path = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source);

    if (!(0, _shelljs.test)("-e", path)) {
      log.warn(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`);
      return;
    }

    deps.changeList = (0, _lib.getChangeList)({
      sourcePath: (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source),
      targetPath: outDir,
      sourceExt: [".scss"],
      targetExt: ".css"
    });

    function write(entry) {
      if (!saydHello && verbose) {
        saydHello = true;
        log.info("Transcompiling Sass");
      }

      SassUtils.compileFile(entry, true);
      processed.push(entry.target);
    }

    deps.changeList.forEach(entry => {
      deps.read(entry);
    });
    deps.changeList.forEach(entry => {
      if (SassUtils.isImport(entry.source)) return;
      if (isWatching && Double.is(entry.source)) return;

      if (entry.isNewOrModified() || deps.importChanged(entry)) {
        write(entry);
      }

      processed.push(entry.target);
    });

    _lib.FileUtils.getFileList((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source), {
      allowedExtensions: [".css"]
    }).forEach(file => {
      let path = (0, _path.join)(outDir, file);

      if (!(0, _shelljs.test)("-f", path)) {
        (0, _shelljs.cp)((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source, file), path);
      }

      processed.push(path);
    });

    (0, _files.removeObsolete)(cfg.options.sass.removeObsolete, processed, outDir, ".css");

    if (saydHello && verbose) {
      log.info("... done");
    } else if (verbose) {
      log.info("No changes in Sass files found");
    }
  }

  static compileFile(entry, verbose = true) {
    const sass = require("node-sass");

    let options = cfg.options.dependencies.nodeSass.config;

    let session = _session.SessionVars.getInstance();

    if (SassUtils.isImport(entry.source) || !SassUtils.beautify(entry)) {
      return false;
    }

    Object.assign(options, {
      file: (0, _path.join)(entry.dir, entry.source),
      outFile: (0, _path.join)(entry.targetDir, entry.target),
      sourceMap: entry.target.concat(".map")
    });

    try {
      let result = sass.renderSync(options);

      if (!result) {
        throw new Error("");
      }

      let prefixed = SassUtils.addPrefixes(result.css);

      _lib.FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);

      session.add(_session.ProcessingTypes.sass, entry.target);
    } catch (err) {
      log.warn(`- Failed to compile file: ${entry.source}`, _lib.Logger.error2string(err));
      return false;
    }

    return true;
  }

}

exports.SassUtils = SassUtils;

_defineProperty(SassUtils, "preventDoubles", []);
//# sourceMappingURL=styling.js.map