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

var _beautify = require("../lib/beautify");

var _session = require("../sys/session");

var _javascript = require("./javascript");

var _tags = require("./tags");

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
    _tags.Tags.forProject(cfg.options.javascript.dirs.source);

    changeList.forEach(entry => {
      if (entry.isNewOrModified()) {
        _tags.Tags.forFile((0, _path.join)(cfg.options.javascript.dirs.source, entry.source));
      }
    });
    log.info(`... done`);
  } else if (verbose) {
    log.info(`No changed ${cfg.options.javascript.compiler} files found`);
  }
}

function compileFile(entry, verbose = true) {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let fullPath = (0, _path.join)(entry.dir, entry.source);
  let plugins = ["@babel/plugin-proposal-class-properties", "@babel/proposal-object-rest-spread"];
  let presets = [];

  let source = _lib.FileUtils.readFile(fullPath);

  if (cfg.options.server.beautify.includes("src")) {
    source = _beautify.Beautify.content(entry.source, source);

    if (source) {
      _lib.FileUtils.writeFile(entry.dir, entry.source, source, false);
    } else {
      return false;
    }
  }

  if (source.includes("antd")) {
    presets.push(["@babel/preset-react"]);
  } else if (source.includes('"react')) {
    presets.push(["@babel/preset-react"]);
  }

  if (process.env.NODE_ENV == "production") {
    presets.push("minify");
  } else if (!(0, _path.dirname)(entry.source).includes("browser") && cfg.options.javascript.sourceMapping) {
    plugins.push("source-map-support");
  }

  if (cfg.options.javascript.compiler == "typescript") {
    presets.push("@babel/preset-typescript");
  }

  if (cfg.options.javascript.compiler == "flow") {
    presets.push("@babel/preset-flow");
  }

  if ((0, _path.dirname)(entry.source).includes("browser")) {
    presets.push(["@babel/preset-env", {
      targets: cfg.options.javascript.browserTargets
    }]);
  } else {
    presets.push(["@babel/preset-env", {
      targets: {
        node: cfg.options.javascript.nodeVersion
      }
    }]);
  }

  try {
    let results = (0, _core.transformSync)(source, {
      ast: true,
      comments: false,
      filename: fullPath,
      plugins: plugins,
      presets: presets,
      sourceMaps: true
    });

    if (!results) {
      throw new Error("");
    }

    if (process.env.NODE_ENV == "production") {
      let fl = (0, _path.join)(entry.targetDir, entry.target + ".ast");
      if ((0, _shelljs.test)("-f", fl)) (0, _shelljs.rm)(fl);
      fl = (0, _path.join)(entry.targetDir, entry.target + ".map");
      if ((0, _shelljs.test)("-f", fl)) (0, _shelljs.rm)(fl);
    } else if (!(0, _path.dirname)(entry.source).includes("browser") && cfg.options.javascript.sourceMapping) {
      results.code += `\n//# sourceMappingURL=${(0, _path.basename)(entry.target)}.map`;

      _lib.FileUtils.writeFile(entry.targetDir, entry.target + ".map", JSON.stringify(results.map), false);

      if (cfg.options.javascript.ast) _lib.FileUtils.writeFile(entry.targetDir, entry.target + ".ast", JSON.stringify(results.ast), false);
    }

    _lib.FileUtils.writeFile(entry.targetDir, entry.target, results.code, verbose);
  } catch (err) {
    log.warn(`- Failed to compile file: ${entry.source}`, _lib.Logger.error2string(err));
    return false;
  }

  return true;
}
//# sourceMappingURL=babel.js.map