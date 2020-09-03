"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Dataset = exports.ObjectUtils = exports.ArrayUtils = void 0;

require("source-map-support/register");

var _log = require("./log");

var _config = require("./config");

const {
  stringify
} = require("q-i");

const arraySort = require("array-sort");

class ArrayUtils {
  static contains(str, searchIn) {
    let retVal = false;

    for (let i = 0; i < searchIn.length; i++) {
      if (str.includes(searchIn[i])) {
        retVal = true;
      }
    }

    return retVal;
  }

  static exactMatch(str, searchIn) {
    return searchIn.includes(str);
  }

  static startsWith(str, searchIn) {
    let retVal = false;

    for (let i = 0; i < searchIn.length; i++) {
      if (str.startsWith(searchIn[i])) {
        retVal = true;
      }
    }

    return retVal;
  }

  static endsWith(str, searchIn) {
    let retVal = false;

    for (let i = 0; i < searchIn.length; i++) {
      if (str.endsWith(searchIn[i])) {
        retVal = true;
      }
    }

    return retVal;
  }

  static inExcludeList(list, search) {
    if (list == undefined || list.length == 0) return false;
    let inList = false;

    if (list instanceof Array) {
      let cfg = _config.AppConfig.getInstance();

      if (cfg.options.excludeList.contains) {
        inList = ArrayUtils.contains(search, list);
      }

      if (cfg.options.excludeList.exactMatch) {
        inList = inList || ArrayUtils.exactMatch(search, list);
      }

      if (cfg.options.excludeList.startsWith) {
        inList = inList || ArrayUtils.startsWith(search, list);
      }

      if (cfg.options.excludeList.endsWith) {
        inList = inList || ArrayUtils.endsWith(search, list);
      }
    } else {
      if (list.contains instanceof Array) {
        inList = ArrayUtils.contains(search, list.contains);
      }

      if (list.exactMatch instanceof Array) {
        inList = inList || ArrayUtils.exactMatch(search, list.exactMatch);
      }

      if (list.startsWith instanceof Array) {
        inList = inList || ArrayUtils.startsWith(search, list.startsWith);
      }

      if (list.endsWith instanceof Array) {
        inList = inList || ArrayUtils.endsWith(search, list.endsWith);
      }
    }

    return inList;
  }

}

exports.ArrayUtils = ArrayUtils;

class ObjectUtils {
  static clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static mergeDeep(target, src) {
    Object.keys(src).forEach(key => {
      let value = src[key];

      if (target[key] == undefined) {
        target[key] = value;
        return;
      }

      let type = typeof value;

      if (type == "object" && !Array.isArray(value)) {
        ObjectUtils.mergeDeep(target[key], value);
      } else {
        target[key] = value;
      }
    });
  }

  static toString(obj, color = false, maxNrOfItems = 30) {
    if (color) {
      return stringify(obj, {
        maxItems: maxNrOfItems
      });
    } else {
      return JSON.stringify(obj, null, "    ");
    }
  }

}

exports.ObjectUtils = ObjectUtils;

class Dataset {
  static sort(data, fields) {
    return arraySort(data, fields);
  }

  static extractFields(data, fields) {
    let log = _log.Logger.getInstance();

    let retVal = [];

    for (let rec = 0; rec < data.length; rec++) {
      let record = {};

      for (let fld = 0; fld < fields.length; fld++) {
        const key = fields[fld];

        if (data[rec][key] == undefined) {
          log.info(`Key ${key} not found in record ${rec}`);
        } else {
          record[key] = data[rec][key];
        }
      }

      retVal.push(record);
    }

    return retVal;
  }

}

exports.Dataset = Dataset;
//# sourceMappingURL=object.js.map