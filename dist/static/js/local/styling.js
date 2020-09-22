"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SassUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _beautify = require("../lib/beautify");

var _files = require("../lib/files");

var _session = require("../sys/session");

class SassUtils {
  static getOutputDir() {
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance();

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
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance(cfg.options.logging);

    const autoprefixer = require("autoprefixer");

    const postcss = require("postcss");

    let result = postcss([autoprefixer]).process(content);
    result.warnings().forEach(function (warn) {
      log.warn("Warning autoprefixer: " + warn.toString());
    });
    return result.css;
  }

  static compile(verbose) {
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance(cfg.options.logging);

    let outDir = SassUtils.getOutputDir();
    let processed = [];
    let saydHello = false;
    let path = (0, _path.join)(cfg.dirProject, cfg.options.sass.dirs.source);

    if (!(0, _shelljs.test)("-e", path)) {
      log.warn(`Path ./${cfg.options.sass.dirs.source} doesn't exist. Request to compile ignored`);
      return;
    }

    let changeList = (0, _lib.getChangeList)({
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

    let maxMixin = 0;
    let maxSass = 0;
    changeList.forEach(entry => {
      let isMixin = (0, _path.basename)(entry.source).startsWith("_");

      if (isMixin) {
        maxMixin = Math.max(maxMixin, entry.lastModified);
      } else {
        maxSass = Math.max(maxSass, entry.targetLastModified);
      }

      if (!isMixin && entry.isNewOrModified()) {
        write(entry);
      }
    });
    changeList.forEach(entry => {
      if ((0, _path.basename)(entry.source).startsWith("_") || entry.isNewOrModified()) {
        return;
      }

      if (maxMixin > maxSass) {
        write(entry);
        (0, _shelljs.touch)((0, _path.join)(entry.dir, entry.source));
      } else {
        processed.push(entry.target);
      }
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
    let cfg = _lib.AppConfig.getInstance();

    let log = _lib.Logger.getInstance(cfg.options.logging);

    const sass = require("node-sass");

    let options = cfg.options.dependencies.nodeSass.config;

    let session = _session.SessionVars.getInstance();

    if ((0, _path.basename)(entry.source).startsWith("_")) {
      return false;
    }

    let fullPath = (0, _path.join)(entry.dir, entry.source);

    let source = _lib.FileUtils.readFile(fullPath);

    if (cfg.options.server.beautify.includes("sass")) {
      source = _beautify.Beautify.content(entry.source, source);

      if (source) {
        _lib.FileUtils.writeFile(entry.dir, entry.source, source, false);
      } else {
        return false;
      }
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
//# sourceMappingURL=styling.js.map