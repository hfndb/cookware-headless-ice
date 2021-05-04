"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateJsDocs = generateJsDocs;
exports.Bundle = exports.JavascriptUtils = void 0;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _utils = require("../lib/utils");

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

  static stripImports(src) {
    let lines = src.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import")) {
        lines[i] = "";
      }

      if (lines[i].startsWith("exports.")) {
        lines[i] = "";
      } else if (lines[i].startsWith("export ")) {
        lines[i] = lines[i].replace("export ", "");
      }
    }

    return lines.join("\n");
  }

  static stripLine(line) {
    let lastIdx = -1;
    let idx = line.indexOf(" ", lastIdx) + 1;
    let spaces = cfg.options.javascript.lineStripping.needsSpace;

    function toPreserve(part1, part2) {
      let r = false;

      for (let i = 0; i < spaces.after.length && !r; i++) {
        if (part1.endsWith(spaces.after[i] + " ")) r = true;
      }

      for (let i = 0; i < spaces.around.length && !r; i++) {
        if (part1.endsWith(spaces.around[i] + " ")) r = true;
      }

      return r;
    }

    while (idx >= 0 && idx > lastIdx) {
      let strPart1 = line.substring(0, idx);
      let strPart2 = line.substring(idx);

      let sq = _utils.StringExt.occurrences(strPart1, "'");

      let dq = _utils.StringExt.occurrences(strPart1, '"');

      let inString = sq % 2 != 0 || dq % 2 != 0;
      if (!inString && !toPreserve(strPart1, strPart2)) strPart1 = strPart1.trimRight();
      line = strPart1 + strPart2;
      lastIdx = idx;
      idx = line.indexOf(" ", lastIdx) + 1;
    }

    return line;
  }

  static stripFile(src) {
    let mlnTemplate = 0;
    let lines = src.split("\n");
    let toReturn = "";

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (!mlnTemplate && line.includes("multiline template")) {
        mlnTemplate = 1;
        continue;
      } else if (mlnTemplate == 1) {
        mlnTemplate = 2;
        continue;
      } else if (mlnTemplate == 2) {
        toReturn += line + "\n";
        if (line.includes("`")) mlnTemplate = 0;
        continue;
      }

      line = JavascriptUtils.stripLine(line);
      toReturn += line;
    }

    return toReturn;
  }

}

exports.JavascriptUtils = JavascriptUtils;

class Bundle {
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

  static create(bundle) {
    let outDir = JavascriptUtils.getOutputDir();
    if (!Bundle.isChanged(bundle, outDir)) return;
    let content = "";
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

    if (bundle.compress) {
      toWrite = JavascriptUtils.stripFile(toWrite);
    }

    _lib.FileUtils.writeFile(outDir, bundle.output, toWrite, false);

    log.info(`- written Javascript bundle ${bundle.output}`);
    return;
  }

  static needsStripping(file) {
    let toReturn = false;

    for (let i = 0; i < cfg.options.javascript.bundles.length && !toReturn; i++) {
      let bundle = cfg.options.javascript.bundles[i];

      if (bundle.source.includes(file) && bundle.removeImports) {
        toReturn = true;
      }
    }

    return toReturn;
  }

}

exports.Bundle = Bundle;

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