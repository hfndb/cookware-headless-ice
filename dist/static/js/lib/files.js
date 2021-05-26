"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.removeObsolete = removeObsolete;
exports.LineReader = exports.FileWatcher = exports.FileUtils = void 0;

require("source-map-support/register");

var _fs = require("fs");

var _path = require("path");

var _shelljs = require("shelljs");

var _config = require("./config");

var _dirs = require("./dirs");

var _log = require("./log");

var _object = require("./object");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FileUtils {
  static rmFile(path) {
    if ((0, _shelljs.test)("-f", path)) (0, _shelljs.rm)(path);
  }

  static readJsonFile(path, ignoreErrors = true) {
    let parsed = {};
    let file = (0, _path.basename)(path);

    if (!(0, _shelljs.test)("-f", path)) {
      let log = _log.Logger.getInstance();

      log.warn(`File ${file} not found in directory ${(0, _path.dirname)(path)}`);
      return {};
    }

    let data = FileUtils.readFile(path);

    if (data) {
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        console.error(`Error parsing ${path}\n`, _log.Logger.error2string(err));
        console.error(`\

The structure of this file is invalid, meaning, messed up.
`);
      }
    } else if (!ignoreErrors) throw new Error(`No data retured whle reading ${file}`);

    return parsed;
  }

  static writeJsonFile(content, dir, file, verbose = true) {
    let data = JSON.stringify(content, null, "\t");

    let log = _log.Logger.getInstance();

    if (FileUtils.writeFile(dir, file, data, false) && verbose && process.env.NODE_ENV !== "test") {
      log.info(`Data written to file ${file}`);
    }
  }

  static readFile(path) {
    let data = "";

    try {
      data = (0, _fs.readFileSync)(path, FileUtils.ENCODING_UTF8);
    } catch (err) {
      let log = _log.Logger.getInstance();

      log.error(`Error reading ${path}`, _log.Logger.error2string(err));
      throw err;
    }

    return data;
  }

  static writeFile(dir, file, content, verbose, flag = "w") {
    let log = _log.Logger.getInstance();

    let fullPath = (0, _path.join)(dir, file);
    let dir4sure = (0, _path.dirname)(fullPath);

    if (dir4sure && !(0, _shelljs.test)("-d", dir4sure)) {
      FileUtils.mkdir(dir4sure);
    }

    try {
      (0, _fs.writeFileSync)(fullPath, content, {
        encoding: FileUtils.ENCODING_UTF8,
        flag: flag
      });

      if (verbose && process.env.NODE_ENV !== "test") {
        log.info(`- File written: ${file}`);
      }
    } catch (err) {
      log.error(`- Failed to write file ${fullPath}`, _log.Logger.error2string(err));
      throw err;
    }

    return true;
  }

  static getFileList(path, opts = {}) {
    if (!(0, _shelljs.test)("-e", path)) {
      throw new Error("Path " + path + " doesn't exist");
    }

    let allowedExtensions = opts.allowedExtensions == undefined ? [] : opts.allowedExtensions;
    let excludeList = opts.excludeList == undefined ? [] : opts.excludeList;
    let recursive = opts.recursive == undefined ? true : opts.recursive;
    let files = [];

    function addFile(file) {
      file = file.substr(path.length + 1);
      if (excludeList.includes(file)) return;

      if (allowedExtensions.length == 0 || allowedExtensions.includes((0, _path.extname)(file))) {
        files.push(file);
      }
    }

    function addPath(dirname) {
      if (excludeList.includes((0, _path.basename)(dirname))) return;
      (0, _fs.readdirSync)(dirname).forEach(file => {
        const realpath = (0, _path.join)(dirname, file);

        if (recursive && (0, _shelljs.test)("-d", realpath)) {
          addPath(realpath);
        } else if ((0, _shelljs.test)("-f", realpath)) {
          addFile(realpath);
        }
      });
    }

    if ((0, _shelljs.test)("-f", path)) {
      addFile(path);
    } else {
      addPath(path);
    }

    return files;
  }

  static getSuffixedFile(path, suffix) {
    let dir = path.includes(_path.sep) || path.includes("/") ? (0, _path.dirname)(path) : "";
    let file = (0, _path.basename)(path);
    let ext = (0, _path.extname)(file);
    file = (0, _path.basename)(file, ext);
    return (0, _path.join)(dir, `${file}-${suffix}${ext}`);
  }

  static dir(path, recursive = false) {
    let lst = new Map();
    let src = FileUtils.getFileList(path, {
      recursive: recursive
    });

    for (let i = 0; i < src.length; i++) {
      let file = src[i];
      let fullPath = (0, _path.join)(path, file);
      let info = (0, _fs.statSync)(fullPath);
      let entry = {
        bytes: info.size,
        fullPath: fullPath,
        lastModified: info.mtime,
        lastModifiedMs: info.mtimeMs,
        type: (0, _path.extname)(file),
        needsAction: false
      };
      lst.set(file, entry);
    }

    return lst;
  }

  static getLastModified(path, file) {
    let fullPath = (0, _path.join)(path, file);
    return (0, _fs.statSync)(fullPath).mtimeMs;
  }

  static getLastChangeInDirectory(path, extensions, startAt = 0) {
    let retVal = startAt;
    let lst = FileUtils.getFileList(path, {
      allowedExtensions: extensions
    });
    lst.forEach(file => {
      retVal = Math.max(retVal, (0, _fs.statSync)((0, _path.join)(path, file)).mtimeMs);
    });
    return retVal;
  }

  static getUniqueFileName(dir, file, ext) {
    let orgFile = file;
    let i = 1;

    while ((0, _shelljs.test)("-f", (0, _path.join)(dir, file + ext))) {
      file = orgFile + "-" + i.toString().padStart(2, "0");
      i++;
    }

    return file + ext;
  }

  static getTempFileName(lengthSuffix) {
    let begin = parseInt("1".padEnd(lengthSuffix, "0"));
    let end = parseInt("9".padEnd(lengthSuffix, "9"));
    let rndm = Math.floor(Math.random() * (end - begin)) + begin;
    return Date.now() + "-" + rndm.toString();
  }

  static searchInFile(path, searchFor, opts) {
    const regex = new RegExp(searchFor, opts.ignoreCase ? "i" : undefined);

    if (opts.markFound != "") {
      opts.markFound = opts.markFound.replace("$", searchFor);
    }

    let lr = new LineReader(path);
    let lineNr = 0;
    let retVal = [];

    do {
      let line = lr.next();
      if (line === false) break;
      lineNr++;
      let matched = line.match(regex);

      if (opts.inverse && !matched || !opts.inverse && matched) {
        if (opts.markFound != "") {
          line = line.replace(regex, opts.markFound);
        }

        if (opts.processor != undefined) {
          line = opts.processor(line);
        }

        retVal.push([lineNr, line.replace("\t", "")]);
      }
    } while (true);

    return retVal;
  }

  static mkdir(path) {
    if (!(0, _shelljs.test)("-e", path)) {
      (0, _shelljs.mkdir)("-p", path);
    }
  }

  static touchRecursive(path, opts) {
    if (!opts) opts = {};
    if (opts.recursive == undefined) opts.recursive = true;
    let files = FileUtils.getFileList(path, opts);

    for (let i = 0; i < files.length; i++) {
      (0, _shelljs.touch)((0, _path.join)(path, files[i]));
    }
  }

}

exports.FileUtils = FileUtils;

_defineProperty(FileUtils, "ENCODING_UTF8", "utf8");

class FileWatcher {
  constructor(workingDir, projectDir, path, timeout, description, verbose = true) {
    _defineProperty(this, "nowChanging", []);

    _defineProperty(this, "description", void 0);

    _defineProperty(this, "timeout", void 0);

    _defineProperty(this, "watchers", []);

    this.description = description;
    this.timeout = timeout;
    this.addWatch(workingDir, projectDir, path, verbose);
  }

  addWatch(workingDir, projectDir, path, verbose = true) {
    let log = _log.Logger.getInstance();

    let fullPath = (0, _path.join)(workingDir, projectDir, path);

    if (!(0, _shelljs.test)("-e", fullPath)) {
      log.warn(`Path ./${(0, _path.join)(projectDir, path)} doesn't exist. Request to watch ${this.description} ignored`);
      return;
    }

    let isDir = (0, _shelljs.test)("-d", fullPath);

    if (isDir && FileUtils.getFileList(fullPath, {
      recursive: false
    }).length == 0) {
      return;
    } else if (!isDir) {
      fullPath = (0, _path.join)(workingDir, projectDir);
    }

    this.watchers.push((0, _fs.watch)(fullPath, {
      persistent: true,
      recursive: false,
      encoding: FileUtils.ENCODING_UTF8
    }, (event, filename) => {
      if (!filename) return;
      let file = isDir ? filename.toString() : path;

      if (isDir && !(0, _shelljs.test)("-f", (0, _path.join)(fullPath, file))) {
        return;
      } else if (isDir) {
        file = (0, _path.join)(path, file);
      } else if (!isDir && filename != path) {
        return;
      }

      if (this.nowChanging.includes(file)) return;
      let recycle = this.nowChanging.indexOf("-");

      if (recycle >= 0) {
        this.nowChanging[recycle] = file;
      } else {
        this.nowChanging.push(file);
      }

      setTimeout(() => {
        this.nowChanging[this.nowChanging.indexOf(file)] = "-";
        this.change(event, file);
      }, this.timeout);
    }));

    if (isDir) {
      (0, _dirs.getDirList)((0, _path.join)(workingDir, projectDir, path)).forEach(dir => {
        this.addWatch(workingDir, projectDir, (0, _path.join)(path, dir), false);
      });
    }

    if (verbose) {
      log.info(`Watching ${this.description} for changes`);
    }
  }

  change(event, file) {
    event;
    file;
  }

  stop() {
    this.watchers.forEach(watcher => {
      watcher.close();
    });
  }

}

exports.FileWatcher = FileWatcher;

function removeObsolete(removeObsolete, processed, outputDir, ext) {
  if (!removeObsolete.active) return 0;

  let cfg = _config.AppConfig.getInstance();

  let log = _log.Logger.getInstance(cfg.options.logging);

  let sources = FileUtils.getFileList(outputDir, {
    allowedExtensions: [ext]
  });
  let stripped = cfg.options.stripping && cfg.options.stripping.suffix ? cfg.options.stripping.suffix : "";
  sources.forEach(file => {
    let ext = (0, _path.extname)(file);
    let fl = (0, _path.basename)(file, ext);
    let skip = _object.ArrayUtils.inExcludeList(removeObsolete.exclude, file) || processed.includes(file) || ext.endsWith("~");
    skip = skip || stripped && fl.endsWith(stripped);
    if (skip) return;
    let trashFile = (0, _path.join)(cfg.dirTemp, file);
    FileUtils.mkdir((0, _path.dirname)(trashFile));
    (0, _shelljs.mv)((0, _path.join)(outputDir, file), trashFile);
    FileUtils.rmFile((0, _path.join)(outputDir, file, ".map"));

    if (process.env.NODE_ENV !== "test") {
      log.info(`Moved obsolete file ${file} to ${trashFile} `);
    }
  });
  return 1;
}

class LineReader {
  constructor(file = null, encoding = "utf8") {
    _defineProperty(this, "encoding", void 0);

    _defineProperty(this, "reader", void 0);

    this.encoding = encoding;
    this.reader = null;

    if (file != null) {
      this.initialize(file);
    }
  }

  initialize(file) {
    if (!(0, _shelljs.test)("-f", file)) {
      let log = _log.Logger.getInstance();

      log.warn(`File ${file} doesn't exist`);
      return false;
    }

    const lineByLine = require("n-readlines");

    this.reader = new lineByLine(file);
    return true;
  }

  next() {
    if (this.reader == null) return false;
    let line = this.reader.next();
    return line === false ? false : line.toString(this.encoding);
  }

  stop() {
    if (this.reader != null) {
      this.reader.close();
    }
  }

}

exports.LineReader = LineReader;
//# sourceMappingURL=files.js.map