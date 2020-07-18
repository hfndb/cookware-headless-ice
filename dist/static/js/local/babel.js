"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = compile;
exports.compileFile = compileFile;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _core = require("@babel/core");

var _lib = require("../lib");

var _files = require("../lib/files");

var _session = require("../sys/session");

var _javascript = require("./javascript");

function compile(verbose) {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let outDir = _javascript.JavascriptUtils.getOutputDir();

  let saydHello = false;

  let session = _session.SessionVars.getInstance();

  let sourceExt = cfg.options.javascript.compiler == _session.ProcessingTypes.typescript ? ".ts" : ".js";
  let path = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source);

  if (!(0, _shelljs.test)("-e", path)) {
    log.warn(`Path ./${cfg.options.javascript.dirs.source} doesn't exist. Request to compile ignored`);
    return;
  }

  function write(entry) {
    if (!saydHello && verbose) {
      saydHello = true;
      log.info(`Transcompiling ${cfg.options.javascript.compiler}`);
    }

    compileFile(entry, true);
  }

  let changeList = (0, _lib.getChangeList)({
    sourcePath: (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source),
    targetPath: outDir,
    sourceExt: [sourceExt],
    targetExt: ".js",
    excludeList: cfg.options.javascript.removeObsolete.exclude
  });
  let processed = [];
  changeList.forEach(entry => {
    processed.push(entry.target);

    if (entry.isNewOrModified()) {
      session.add(cfg.options.javascript.compiler == "flow" ? "javascript" : cfg.options.javascript.compiler, entry.source);
      write(entry);
    }
  });

  _javascript.JavascriptUtils.bundle().forEach(file => {
    processed.push(file);
  });

  (0, _files.removeObsolete)(cfg.options.javascript.removeObsolete, processed, outDir, ".js");

  if (saydHello && verbose) {
    log.info(`... done`);
  } else if (verbose) {
    log.info(`No changed ${cfg.options.javascript.compiler} files found`);
  }
}

function compileFile(entry, verbose = true) {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let plugins = ["@babel/plugin-proposal-class-properties", "@babel/proposal-object-rest-spread"];
  let presets = [];

  if (cfg.options.javascript.compress) {
    presets.push("minify");
  } else if (cfg.options.javascript.sourceMapping) {
    plugins.push("source-map-support");
  }

  if (cfg.options.javascript.compiler == "typescript") {
    presets.push("@babel/preset-typescript");
  }

  if (cfg.options.javascript.compiler == "flow") {
    presets.push("@babel/preset-flow");
  }

  if ((0, _path.dirname)(entry.source).includes("browser")) {
    if (Object.keys(cfg.options.javascript.browserTargets).length > 0) {
      presets.push(["@babel/preset-env", {
        targets: cfg.options.javascript.browserTargets
      }]);
    } else {
      presets.push(["@babel/preset-env"]);
    }
  } else {
    presets.push(["@babel/preset-env", {
      targets: {
        node: cfg.options.javascript.nodeVersion
      }
    }]);
  }

  let source = _lib.FileUtils.readFile((0, _path.join)(entry.dir, entry.source));

  try {
    let results = (0, _core.transformSync)(source, {
      ast: true,
      comments: false,
      filename: (0, _path.join)(entry.dir, entry.source),
      plugins: plugins,
      presets: presets,
      sourceMaps: true
    });

    if (!results) {
      throw new Error("");
    }

    if (cfg.options.javascript.compress) {
      let map = (0, _path.join)(entry.targetDir, entry.target + ".map");
      if ((0, _shelljs.test)("-f", map)) (0, _shelljs.rm)(map);
    } else if (cfg.options.javascript.sourceMapping) {
      results.code += `\n//# sourceMappingURL=${(0, _path.basename)(entry.target)}.map`;

      _lib.FileUtils.writeFile(entry.targetDir, entry.target + ".map", JSON.stringify(results.map), false);
    }

    _lib.FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
  } catch (err) {
    log.warn(`- Failed to compile file: ${entry.source}`, _lib.Logger.error2string(err));
    return false;
  }

  return true;
}
//# sourceMappingURL=babel.js.map