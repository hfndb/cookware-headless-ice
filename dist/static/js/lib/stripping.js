"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stripHtml = stripHtml;
exports.stripJs = stripJs;
exports.Shrinker = exports.Stripper = void 0;

require("source-map-support/register");

var _path = require("path");

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

class Shrinker {
  constructor() {
    _defineProperty(this, "alpha", void 0);

    _defineProperty(this, "codeZero", void 0);

    _defineProperty(this, "codeNine", void 0);

    _defineProperty(this, "content", void 0);

    _defineProperty(this, "dictTxt", void 0);

    _defineProperty(this, "lastUsed", void 0);

    _defineProperty(this, "numeric", void 0);

    this.codeZero = "0".charCodeAt(0);
    this.codeNine = "9".charCodeAt(0);
    this.content = "";
    this.alpha = [];
    this.dictTxt = "";
    this.numeric = [];
    this.lastUsed = "";

    for (let ll = 97; ll < 123; ll++) {
      this.alpha.push(String.fromCharCode(ll));
    }

    for (let ll = 65; ll < 91; ll++) {
      this.alpha.push(String.fromCharCode(ll));
    }

    for (let nr = 0; nr < 10; nr++) {
      this.numeric.push(nr.toString());
    }
  }

  getChar(what) {
    let charCode = what.single.charCodeAt(0);
    let isNum = charCode >= this.codeZero && charCode <= this.codeNine;

    if (isNum && what.single == "9") {
      what.single = "a";
      what.overflowed = true;
    } else if (isNum) {
      what.single = (parseInt(what.single) + 1).toString();
      what.overflowed = false;
    } else if (what.single == "Z") {
      what.single = "0";
      what.overflowed = false;
    } else {
      let idx = this.alpha.findIndex(val => val == what.single);
      what.single = this.alpha[idx + 1];
      what.overflowed = false;
    }
  }

  getNext() {
    let toReturn = this.lastUsed;

    if (!toReturn) {
      toReturn = "Aa";
      this.lastUsed = toReturn;
      return toReturn;
    }

    let last = toReturn.split("");
    let lastIdx = last.length - 1;
    let go = {
      single: "",
      overflowed: true
    };

    while (true) {
      go.single = last[lastIdx];
      this.getChar(go);

      if (go.overflowed && lastIdx == 0) {
        let len = toReturn.length;
        toReturn = "A".padEnd(len + 1, "a");
        break;
      } else if (go.overflowed) {
        last[lastIdx] = go.single;
        lastIdx -= 1;
      } else {
        last[lastIdx] = go.single;
        break;
      }
    }

    toReturn = last.join("");
    this.lastUsed = toReturn;
    return toReturn;
  }

  shorten(search) {
    let short = this.getNext();
    this.content = this.content.replace(new RegExp(search, "g"), short);
    return short;
  }

  classes(act) {
    let short = this.shorten(act.class);
    this.dictTxt += `${"".padEnd(30, "-")}\n` + `Class: ${act.class}: ${short}\n` + `${"".padEnd(30, "-")}\n`;
    let methods = act.methods;

    for (let i = 0; i < methods.length; i++) {
      short = this.shorten(short + "." + methods[i]);
      this.dictTxt += `- ${short}: ${methods[i]}\n`;
    }
  }

  functions(act) {
    this.dictTxt += `Functions:\n`;

    for (let i = 0; i < act.length; i++) {
      let short = this.shorten(act[i]);
      this.dictTxt += `- ${short}: ${act[i]}\n`;
    }
  }

  writeDict(removeOld = false) {
    let cfg = _lib.AppConfig.getInstance();

    let file = (0, _path.join)("notes", "translate-table.txt");
    if (removeOld) _lib.FileUtils.rmFile(file);

    _lib.FileUtils.writeFile(cfg.dirProject, file, this.dictTxt, false, removeOld ? "w" : "a");
  }

  shrinkFile(content, writeDict) {
    this.content = content;
    this.dictTxt = "";

    let cfg = _lib.AppConfig.getInstance();

    let opts = cfg.options.javascript.browser.shrink;

    for (let i = 0; i < opts.length; i++) {
      let act = opts[i];

      if (act.class != undefined && act.class) {
        this.classes(act);
      } else if (act.functions != undefined && act.functions.length > 0) {
        this.functions(act);
      }
    }

    if (writeDict) this.writeDict(true);
    return this.content;
  }

}

exports.Shrinker = Shrinker;
//# sourceMappingURL=stripping.js.map