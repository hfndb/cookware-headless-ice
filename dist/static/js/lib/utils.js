"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Formatter = exports.StringUtils = void 0;
const date = require("date-and-time");
const config_1 = require("./config");
class StringUtils {
    static occurrences(str, searchFor) {
        let searchFrom = 0;
        let retVal = 0;
        while (str.indexOf(searchFor, searchFrom) >= 0) {
            retVal++;
            searchFrom = str.indexOf(searchFor, searchFrom) + 1;
        }
        return retVal;
    }
    static strip(str, begin, end) {
        let regex = "";
        if (begin && !end) {
            regex = "^[\\t\\s]*(.*)$";
        }
        else if (!begin && end) {
            regex = "^*(.*)[\\t\\s]*$";
        }
        else {
            regex = "^[\\t\\s]*(.*)[\\t\\s]*$";
        }
        let result = new RegExp(regex).exec(str);
        return result ? result[1] : "";
    }
    static initialCapitalized(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
exports.StringUtils = StringUtils;
class Formatter {
    constructor() {
        let cfg = config_1.AppConfig.getInstance();
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
        if (!nr)
            return "";
        if (decimals == 0)
            return this.int(nr);
        let beforeComma = Math.trunc(nr);
        let behindComma = Math.round(Math.abs(nr % 1) * Math.pow(10, decimals));
        return (prefix +
            this.int(beforeComma) +
            this.decimalSeparator +
            behindComma.toString().padEnd(decimals, "0") +
            suffix);
    }
    int(nr) {
        if (!nr)
            return "";
        if (!Number.isInteger(nr)) {
            nr = Math.round(nr);
        }
        let isNegative = nr < 0;
        let portion;
        let thousands = [];
        nr = Math.abs(nr);
        while (nr) {
            portion = nr % 1000;
            thousands.push(portion);
            nr -= portion;
            if (nr)
                nr /= 1000;
        }
        return ((isNegative ? "-" : "") + thousands.reverse().join(this.thousandsSeparator));
    }
    static slugify(string) {
        const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź'·/_,:;";
        const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz-------";
        const p = new RegExp(a.split("").join("|"), "g");
        return string
            .toString()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(p, c => b.charAt(a.indexOf(c)))
            .replace(/&/g, "-and-")
            .replace(/[^\w\-]+/g, "")
            .replace(/\-\-+/g, "-")
            .replace(/^-+/, "")
            .replace(/-+$/, "");
    }
}
exports.Formatter = Formatter;
Formatter.instance = null;
//# sourceMappingURL=utils.js.map