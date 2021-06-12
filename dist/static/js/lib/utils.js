"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Formatter = exports.StringExt = void 0;

require("source-map-support/register");

var _config = require("./config");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const date = require("date-and-time");

class StringExt {
  static occurrences(str, searchFor) {
    let re = new RegExp(`(${searchFor})`, "g");
    let result = str.match(re) || [];
    return result.length;
  }

  static strip(str, begin, end) {
    let regex = "";

    if (begin && !end) {
      regex = "^[\\t\\s]*(.*)$";
    } else if (!begin && end) {
      regex = "^*(.*)[\\t\\s]*$";
    } else {
      regex = "^[\\t\\s]*(.*)[\\t\\s]*$";
    }

    let result = new RegExp(regex).exec(str);
    return result ? result[1] : "";
  }

  static matchAll(exp, str) {
    let toReturn = [];
    let re = new RegExp(exp, "gim");
    let result;

    while ((result = re.exec(str)) !== null) {
      let rw = [];

      for (let i = 1; i < result.length; i++) {
        rw.push(result[i]);
      }

      toReturn.push(rw);
    }

    return toReturn;
  }

  static initialCapitalized(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static bytesToSize(bytes) {
    let sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes == 0) return "0 Byte";
    let i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
  }

  static getRandom(length) {
    let begin = parseInt("1".padEnd(length, "0"));
    let end = parseInt("9".padEnd(length, "9"));
    let rndm = Math.floor(Math.random() * (end - begin)) + begin;
    return rndm.toString();
  }

}

exports.StringExt = StringExt;

class Formatter {
  constructor() {
    _defineProperty(this, "formatDate", void 0);

    _defineProperty(this, "formatTime", void 0);

    _defineProperty(this, "formatDateTime", void 0);

    _defineProperty(this, "decimalSeparator", void 0);

    _defineProperty(this, "thousandsSeparator", void 0);

    let cfg = _config.AppConfig.getInstance();

    this.formatDate = cfg.options.formats.date;
    this.formatTime = cfg.options.formats.time;
    this.formatDateTime = cfg.options.formats.datetime;
    this.decimalSeparator = cfg.options.formats.decimalSeparator;
    this.thousandsSeparator = cfg.options.formats.thousandsSeparator;
  }

  static getInstance() {
    if (!Formatter.instance) {
      Formatter.instance = new Formatter();
    }

    return Formatter.instance;
  }

  date(dt, format = "") {
    return date.format(dt, format ? format : this.formatDate);
  }

  time(dt, format = "") {
    return date.format(dt, format ? format : this.formatTime);
  }

  datetime(dt, format = "") {
    return date.format(dt, format ? format : this.formatDateTime);
  }

  decimal(nr, decimals, prefix = "", suffix = "") {
    if (!nr) return "";
    let minus = nr < 0 ? "-" : "";
    let part = nr % 1;
    let rem = nr - part;

    if (decimals) {
      part = part.toPrecision(decimals);
    }

    part *= 100;
    let toReturn = decimals == 0 ? "" : this.decimalSeparator + part.toString().substring(0, decimals - 1).padEnd(decimals, "0");

    while (rem) {
      part = rem % 1000;
      rem = (rem - part) / 1000;
      part = part.toString();

      if (rem) {
        part = part.padStart(3, "0");
      }

      toReturn = this.thousandsSeparator + part + toReturn;
    }

    if (toReturn.startsWith(this.thousandsSeparator)) {
      toReturn = toReturn.substring(1);
    }

    return prefix + minus + toReturn + suffix;
  }

  int(nr) {
    return this.decimal(nr, 0);
  }

  static slugify(string) {
    const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź'·/_,:;";
    const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz-------";
    const p = new RegExp(a.split("").join("|"), "g");
    return string.toString().toLowerCase().replace(/\s+/g, "-").replace(p, c => b.charAt(a.indexOf(c))).replace(/&/g, "-and-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
  }

}

exports.Formatter = Formatter;

_defineProperty(Formatter, "instance", null);
//# sourceMappingURL=utils.js.map