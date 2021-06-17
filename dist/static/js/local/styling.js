"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SassUtils = exports.SassFiles = exports.Double = void 0;

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
    let now = new Date().getTime();
    let last = Double.reg[file] || now - Double.interval - 10;

    if (now - last > Double.interval) {
      Double.reg[file] = now;
      return false;
    }

    return true;
  }

}

exports.Double = Double;

_defineProperty(Double, "_instance", void 0);

_defineProperty(Double, "interval", 1 * 1900);

_defineProperty(Double, "reg", {});

class SassFiles {
  constructor() {
    _defineProperty(this, "changeList", void 0);

    _defineProperty(this, "deps", new Map());

    let outDir = SassUtils.getOutputDir();
    this.changeList = (0, _lib.getChangeList)({
      sourcePath: (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source),
      targetPath: outDir,
      sourceExt: [".scss"],
      targetExt: ".css"
    });
    this.changeList.forEach(entry => {
      this.read(entry);
    });
  }

  getEntry(file) {
    return this.changeList.find(el => el.source == file);
  }

  getImport(fromDir, file) {
    let [d, f] = this.getDirFile(fromDir, file);
    if (!f.startsWith("_")) f = "_" + file;
    if (!f.endsWith(".scss")) f += ".scss";
    return (0, _path.join)(d, f);
  }

  getDirFile(fromDir, file) {
    let path = (0, _path.join)(fromDir, file);
    let r = ["", path];

    if (path.includes(_path.sep)) {
      r[0] = (0, _path.normalize)((0, _path.dirname)(path));
      r[1] = (0, _path.basename)(path);
    }

    return r;
  }

  importChanged(compareWith, file) {
    return compareWith < this.importsLatestChange(file);
  }

  importsLatestChange(file) {
    let imports = this.deps.get(file) || [];
    let latest = 0;

    for (let i = 0; i < imports.length; i++) {
      let im = imports[i];
      let fl = this.getEntry(im);
      if (fl) latest = Math.max(latest, fl.lastModified);
      latest = Math.max(latest, this.importsLatestChange(im));
    }

    return latest;
  }

  static isImport(file) {
    return (0, _path.basename)(file).startsWith("_");
  }

  read(entry) {
    let fullPath = (0, _path.join)(entry.dir, entry.source);

    let result = _utils.StringExt.matchAll(`@import ["']+(.*)["']+;`, _files.FileUtils.readFile(fullPath));

    let [d, f] = this.getDirFile("", entry.source);

    for (let i = 0; i < result.length; i++) {
      let lst = this.deps.get(entry.source) || [];
      let fl = this.getImport(d, result[i][0]);
      lst.push(fl);
      this.deps.set(entry.source, lst);
    }
  }

}

exports.SassFiles = SassFiles;

class SassUtils {
  static addPrefixes(content) {
    const autoprefixer = require("autoprefixer");

    const postcss = require("postcss");

    let result = postcss([autoprefixer]).process(content);
    result.warnings().forEach(function (warn) {
      log.warn("Warning autoprefixer: " + warn.toString());
    });
    return result.css;
  }

  static beautify(entry) {
    let toReturn = true;

    if (cfg.options.server.beautify.includes("sass") && entry.source != cfg.options.sass.colors.sass) {
      let fullPath = (0, _path.join)(entry.dir, entry.source);

      let source = _files.FileUtils.readFile(fullPath);

      source = _beautify.Beautify.content(entry.source, source);

      if (source) {
        _files.FileUtils.writeFile(entry.dir, entry.source, source, false);
      } else {
        toReturn = false;
      }
    }

    return toReturn;
  }

  static compile(verbose, isWatching = false) {
    let srcDir = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source);

    if (!(0, _shelljs.test)("-d", srcDir)) {
      log.info(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`);
      return;
    }

    let fls = new SassFiles();
    let outDir = SassUtils.getOutputDir();
    let processed = [];
    let saydHello = false;
    let path = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source);

    if (!(0, _shelljs.test)("-e", path)) {
      log.info(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to transcompile ignored`);
      return;
    }

    function write(entry) {
      if (!saydHello && verbose) {
        saydHello = true;
        log.info("Transcompiling Sass");
      }

      SassUtils.compileFile(entry, true);
      processed.push(entry.target);
    }

    fls.changeList.forEach(entry => {
      if (SassFiles.isImport(entry.source)) return;
      if (isWatching && Double.is(entry.source)) return;

      if (entry.isNewOrModified() || fls.importChanged(entry.lastModified, entry.source)) {
        write(entry);
      }

      processed.push(entry.target);
    });

    _files.FileUtils.getFileList((0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source), {
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

    if (SassFiles.isImport(entry.source) || !SassUtils.beautify(entry)) {
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

      _files.FileUtils.writeFile(entry.targetDir, entry.target, prefixed, verbose);

      session.add(_session.ProcessingTypes.sass, entry.target);
      Object.assign(options, {
        indentedSyntax: true,
        outputStyle: "compressed",
        sourceMap: undefined
      });
      result = sass.renderSync(options);

      if (!result) {
        throw new Error("");
      }

      prefixed = SassUtils.addPrefixes(result.css);

      let file = _files.FileUtils.getSuffixedFile(entry.target, cfg.options.stripping.suffix);

      _files.FileUtils.writeFile(entry.targetDir, file, prefixed, false);
    } catch (err) {
      log.warn(`- Failed to trancompile file: ${entry.source}`, _lib.Logger.error2string(err));
      return false;
    }

    return true;
  }

  static getOutputDir() {
    let outputDir = "";

    if ((0, _shelljs.test)("-d", (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.output))) {
      outputDir = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.output);
    } else if ((0, _shelljs.test)("-d", cfg.options.sass.dirs.output)) {
      outputDir = cfg.options.sass.dirs.output;
    } else {
      log.error("Sass output directory couldn't be determined");
    }

    return outputDir;
  }

}

exports.SassUtils = SassUtils;
//# sourceMappingURL=styling.js.map