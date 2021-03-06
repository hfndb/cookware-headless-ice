"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SessionVars = exports.ProcessingTypes = void 0;

require("source-map-support/register");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

let ProcessingTypes;
exports.ProcessingTypes = ProcessingTypes;

(function (ProcessingTypes) {
  ProcessingTypes["epub"] = "epub";
  ProcessingTypes["html"] = "html";
  ProcessingTypes["javascript"] = "javascript";
  ProcessingTypes["pdf"] = "pdf";
  ProcessingTypes["php"] = "php";
  ProcessingTypes["sass"] = "sass";
  ProcessingTypes["typescript"] = "typescript";
})(ProcessingTypes || (exports.ProcessingTypes = ProcessingTypes = {}));

class SessionVars {
  constructor() {
    _defineProperty(this, "epub", new Map());

    _defineProperty(this, "html", new Map());

    _defineProperty(this, "javascript", new Map());

    _defineProperty(this, "php", new Map());

    _defineProperty(this, "pdf", new Map());

    _defineProperty(this, "sass", new Map());

    _defineProperty(this, "typescript", new Map());

    this.reset();
  }

  static getInstance() {
    if (!SessionVars._instance) {
      SessionVars._instance = new SessionVars();
    }

    return SessionVars._instance;
  }

  reset() {
    function resetMap(mp) {
      mp.clear();
      mp.set("all", 0);
    }

    resetMap(this.epub);
    resetMap(this.html);
    resetMap(this.javascript);
    resetMap(this.php);
    resetMap(this.pdf);
    resetMap(this.sass);
    resetMap(this.typescript);
  }

  add(type, file, increment = 1) {
    let counter;

    switch (type) {
      case ProcessingTypes.epub:
        counter = this.epub;
        break;

      case ProcessingTypes.html:
        counter = this.html;
        break;

      case ProcessingTypes.javascript:
        counter = this.javascript;
        break;

      case ProcessingTypes.sass:
        counter = this.sass;
        break;

      case ProcessingTypes.php:
        counter = this.php;
        break;

      case ProcessingTypes.pdf:
        counter = this.pdf;
        break;

      case ProcessingTypes.typescript:
        counter = this.typescript;
        break;

      default:
        throw new Error(`Unknown type: ${type}`);
        return;
    }

    let qty = counter.get("all") || 0;
    counter.set("all", qty + increment);
    qty = counter.get(file) || 0;

    if (qty == undefined) {
      qty = 0;
    }

    counter.set(file, qty + increment);
  }

  toString() {
    let parent = this;
    let retVal = "";

    function add2retval(mp, txt) {
      let tmp = parent.getCounter(mp);

      if (tmp[1] > 0) {
        retVal += `${txt.padEnd(15, " ")}: ${tmp[1]}\n`;
      }
    }

    add2retval(this.epub, "ePub");
    add2retval(this.html, "HTML");
    add2retval(this.javascript, "JavaScript");
    add2retval(this.php, "php");
    add2retval(this.pdf, "PDF");
    add2retval(this.sass, "Sass");
    add2retval(this.typescript, "TypeScript");
    return retVal.length > 0 ? "\n".concat("------------------------------------------------\n").concat("Number of changed files during this session:\n").concat(retVal).concat("------------------------------------------------\n") : "No changed source files detected during this session";
  }

  getCounter(counter) {
    let all = counter.get("all");
    let specific = counter.size == 1 ? 0 : counter.size - 1;
    return [all, specific];
  }

}

exports.SessionVars = SessionVars;

_defineProperty(SessionVars, "_instance", void 0);
//# sourceMappingURL=session.js.map