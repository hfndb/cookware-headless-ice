"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stripHtml = stripHtml;
exports.stripJs = stripJs;
exports.Stripper = void 0;

require("source-map-support/register");

var _utils = require("../lib/utils");

var _lib = require("../lib");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Stripper {
  constructor(after, around, before) {
    _defineProperty(this, "after", void 0);

    _defineProperty(this, "around", void 0);

    _defineProperty(this, "before", void 0);

    this.after = after || [];
    this.around = around || [];
    this.before = before || [];
  }

  stripFile(src) {
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

      line = this.stripLine(line);
      toReturn += line;
    }

    return toReturn;
  }

  stripLine(line) {
    let lastIdx = -1;
    let idx = line.indexOf(" ", lastIdx) + 1;

    while (idx >= 0 && idx > lastIdx) {
      let strPart1 = line.substring(0, idx);
      let strPart2 = line.substring(idx);
      if (!this.isInString(strPart1) && !this.preserveSpace(strPart1, strPart2)) strPart1 = strPart1.trimRight();
      line = strPart1 + strPart2;
      lastIdx = idx;
      idx = line.indexOf(" ", lastIdx) + 1;
    }

    return line;
  }

  isInString(str) {
    let sq = _utils.StringExt.occurrences(str, "'");

    let dq = _utils.StringExt.occurrences(str, '"');

    return sq % 2 != 0 || dq % 2 != 0;
  }

  preserveSpace(part1, part2) {
    let r = false;

    for (let i = 0; i < this.after.length && !r; i++) {
      if (part1.endsWith(this.after[i] + " ")) r = true;
    }

    for (let i = 0; i < this.around.length && !r; i++) {
      if (part1.endsWith(this.around[i] + " ")) r = true;
    }

    return r;
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

}

exports.Stripper = Stripper;

function stripHtml(source) {
  let cfg = _lib.AppConfig.getInstance();

  if (!cfg.options.html.stripper.active) return source;
  let s = new Stripper();
  return s.stripFile(source);
}

function stripJs(source) {
  let cfg = _lib.AppConfig.getInstance();

  let spaces = cfg.options.javascript.lineStripping.needsSpace;
  let s = new Stripper(spaces.after, spaces.around, spaces.before);
  return s.stripFile(source);
}
//# sourceMappingURL=stripping.js.map