"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compileTypeScript = compileTypeScript;
exports.watchTypeScript = watchTypeScript;
exports.generateTsDocs = generateTsDocs;

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _files = require("../lib/files");

var _session = require("../sys/session");

var _javascript = require("./javascript");

function compileTypeScript() {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let session = _session.SessionVars.getInstance();

  let changeList = (0, _lib.getChangeList)({
    sourcePath: (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source),
    targetPath: (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output),
    sourceExt: [".ts"],
    targetExt: ".js"
  });
  let processed = [];

  _lib.FileUtils.getFileList((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source), {
    allowedExtensions: [".js"]
  }).forEach(file => {
    let path = (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output, file);

    if (!(0, _shelljs.test)("-f", path)) {
      (0, _shelljs.cp)((0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.source, file), path);
    }

    processed.push((0, _path.join)(cfg.options.javascript.dirs.output, file));
  });

  if (!_lib.FileStatus.containsChange(changeList)) {
    log.info("No changes in TypeScript files found");
    return;
  }

  changeList.forEach(entry => {
    processed.push(entry.target);
    session.add(_session.ProcessingTypes.typescript, entry.source);
  });
  log.info("Transcompiling Typescript");

  try {
    (0, _shelljs.exec)(`cd ${cfg.dirProject}; tsc -b`, {
      async: true
    });

    _javascript.JavascriptUtils.bundle().forEach(file => {
      processed.push(file);
    });

    (0, _files.removeObsolete)(cfg.options.javascript.removeObsolete, processed, (0, _path.join)(cfg.dirProject, cfg.options.javascript.dirs.output), ".js");
  } catch (err) {
    log.error(`- Transcompile failed: `, _lib.Logger.error2string(err));
  }

  log.info("... Typescript transcompiled");
}

function watchTypeScript() {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let blockOutput = true;
  let timeOut = setTimeout(() => {
    blockOutput = false;
    clearTimeout(timeOut);
  }, 1 * 60 * 1000);
  (0, _shelljs.exec)(`cd ${cfg.dirProject}; tsc -b -w`, function (code, stdout, stderr) {
    if (blockOutput) return;

    if (code != 0) {
      log.error("Exit code:", code);
    }

    if (stdout) {
      log.info("Program output:", stdout);
    }

    if (stderr) {
      log.error("Program stderr:", stderr);
    }
  });
}

function generateTsDocs() {
  let cfg = _lib.AppConfig.getInstance();

  let dir = (0, _path.join)(cfg.dirProject, cfg.options.dependencies.typedoc.output);

  let log = _lib.Logger.getInstance(cfg.options.logging);

  if (!dir) {
    log.error("Output dir for typedoc not found in config.json");
    return;
  }

  if ((0, _shelljs.test)("-d", dir)) {
    (0, _shelljs.rm)("-rf", (0, _path.join)(dir, "*"));
  } else {
    _lib.FileUtils.mkdir(dir);
  }

  let options = cfg.options.dependencies.typedoc.config;
  Object.assign(options, {
    tsconfig: "tsconfig.json"
  });

  try {
    const typedoc = require("typedoc");

    const app = new typedoc.Application(options);
    const src = app.expandInputFiles([(0, _path.join)(cfg.dirProject, "src")]);
    log.info(`Generating API docs of TypeScript files, in ${dir}`);
    app.generateDocs(src, dir);

    if (app.logger.hasErrors()) {
      log.error("There were errors generating TypeDoc output, see above.");
    }
  } catch (err) {
    log.error("Failed to generate load TypeDoc project.", _lib.Logger.error2string(err));
  }
}