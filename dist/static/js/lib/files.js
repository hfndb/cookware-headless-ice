"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineReader = exports.removeObsolete = exports.FileWatcher = exports.FileUtils = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const { fdir } = require("fdir");
const shelljs_1 = require("shelljs");
const config_1 = require("./config");
const dirs_1 = require("./dirs");
const log_1 = require("./log");
const object_1 = require("./object");
class FileUtils {
    static rmFile(path) {
        if (shelljs_1.test("-f", path))
            shelljs_1.rm(path);
    }
    static readJsonFile(path, ignoreErrors = true) {
        let parsed = {};
        let file = path_1.basename(path);
        if (!shelljs_1.test("-f", path)) {
            let log = log_1.Logger.getInstance();
            log.warn(`File ${file} not found in directory ${path_1.dirname(path)}`);
            return {};
        }
        let data = FileUtils.readFile(path);
        if (data) {
            try {
                parsed = JSON.parse(data);
            }
            catch (err) {
                console.error(`Error parsing ${path}\n`, log_1.Logger.error2string(err));
                console.error(`\

The structure of this file is invalid, meaning, messed up.
`);
            }
        }
        else if (!ignoreErrors)
            throw new Error(`No data retured whle reading ${file}`);
        return parsed;
    }
    static writeJsonFile(content, dir, file, verbose = true) {
        let data = JSON.stringify(content, null, "\t");
        let log = log_1.Logger.getInstance();
        if (FileUtils.writeFile(dir, file, data, false) &&
            verbose &&
            process.env.NODE_ENV !== "test") {
            log.info(`Data written to file ${file}`);
        }
    }
    static readFile(path) {
        let data = "";
        try {
            data = fs_1.readFileSync(path, FileUtils.ENCODING_UTF8);
        }
        catch (err) {
            let log = log_1.Logger.getInstance();
            log.error(`Error reading ${path}`, log_1.Logger.error2string(err));
            throw err;
        }
        return data;
    }
    static writeFile(dir, file, content, verbose, flag = "w") {
        let log = log_1.Logger.getInstance();
        let fullPath = path_1.join(dir, file);
        let dir4sure = path_1.dirname(fullPath);
        if (dir4sure && !shelljs_1.test("-d", dir4sure)) {
            FileUtils.mkdir(dir4sure);
        }
        try {
            fs_1.writeFileSync(fullPath, content, {
                encoding: FileUtils.ENCODING_UTF8,
                flag: flag
            });
            if (verbose && process.env.NODE_ENV !== "test") {
                log.info(`- File written: ${file}`);
            }
        }
        catch (err) {
            log.error(`- Failed to write file ${fullPath}`, log_1.Logger.error2string(err));
            throw err;
        }
        return true;
    }
    static getFileList(path, opts = {}) {
        if (!shelljs_1.test("-e", path)) {
            throw new Error("Path " + path + " doesn't exist");
        }
        let cfg = config_1.AppConfig.getInstance();
        let allowedExtensions = opts.allowedExtensions == undefined ? [] : opts.allowedExtensions;
        let excludeList = opts.excludeList == undefined ? [] : opts.excludeList;
        let recursive = opts.recursive == undefined ? true : opts.recursive;
        let files = [];
        let tns = {
            group: true
        };
        if (!recursive)
            Object.assign(tns, { maxDepth: 0 });
        const fl = new fdir().crawlWithOptions(path, tns).sync();
        for (let d = 0; d < fl.length; d++) {
            let dir = fl[d].dir;
            if (dir.startsWith(cfg.dirProject)) {
                dir = dir.substring(path.length + 1);
            }
            if (!recursive && dir.length > 0)
                continue;
            for (let f = 0; f < fl[d].files.length; f++) {
                let file = fl[d].files[f];
                if (excludeList.includes(file))
                    continue;
                if (allowedExtensions.length == 0 ||
                    allowedExtensions.includes(path_1.extname(file))) {
                    files.push(path_1.join(dir, file));
                }
            }
        }
        return files;
    }
    static getSuffixedFile(path, suffix) {
        let dir = path.includes(path_1.sep) || path.includes("/") ? path_1.dirname(path) : "";
        let file = path_1.basename(path);
        let ext = path_1.extname(file);
        file = path_1.basename(file, ext);
        return path_1.join(dir, `${file}-${suffix}${ext}`);
    }
    static dir(path, recursive = false) {
        let lst = new Map();
        let src = FileUtils.getFileList(path, { recursive: recursive });
        for (let i = 0; i < src.length; i++) {
            let file = src[i];
            let fullPath = path_1.join(path, file);
            let info = fs_1.statSync(fullPath);
            let entry = {
                bytes: info.size,
                fullPath: fullPath,
                lastModified: info.mtime,
                lastModifiedMs: info.mtimeMs,
                type: path_1.extname(file),
                needsAction: false
            };
            lst.set(file, entry);
        }
        return lst;
    }
    static getLastModified(path, file) {
        let fullPath = path_1.join(path, file);
        return fs_1.statSync(fullPath).mtimeMs;
    }
    static getLastChangeInDirectory(path, extensions, startAt = 0) {
        let retVal = startAt;
        let lst = FileUtils.getFileList(path, { allowedExtensions: extensions });
        lst.forEach((file) => {
            retVal = Math.max(retVal, fs_1.statSync(path_1.join(path, file)).mtimeMs);
        });
        return retVal;
    }
    static getUniqueFileName(dir, file, ext) {
        let orgFile = file;
        let i = 1;
        while (shelljs_1.test("-f", path_1.join(dir, file + ext))) {
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
            if (line === false)
                break;
            lineNr++;
            let matched = line.match(regex);
            if ((opts.inverse && !matched) || (!opts.inverse && matched)) {
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
        if (!shelljs_1.test("-e", path)) {
            shelljs_1.mkdir("-p", path);
        }
    }
    static touchRecursive(path, opts) {
        if (!opts)
            opts = {};
        if (opts.recursive == undefined)
            opts.recursive = true;
        let files = FileUtils.getFileList(path, opts);
        for (let i = 0; i < files.length; i++) {
            shelljs_1.touch(path_1.join(path, files[i]));
        }
    }
}
exports.FileUtils = FileUtils;
FileUtils.ENCODING_UTF8 = "utf8";
class FileWatcher {
    constructor(workingDir, projectDir, path, timeout, description, verbose = true) {
        this.nowChanging = [];
        this.watchers = [];
        this.description = description;
        this.timeout = timeout;
        this.addWatch(workingDir, projectDir, path, verbose);
    }
    addWatch(workingDir, projectDir, path, verbose = true) {
        let log = log_1.Logger.getInstance();
        let fullPath = path_1.join(workingDir, projectDir, path);
        if (!shelljs_1.test("-e", fullPath)) {
            log.warn(`Path ./${path_1.join(projectDir, path)} doesn't exist. Request to watch ${this.description} ignored`);
            return;
        }
        let isDir = shelljs_1.test("-d", fullPath);
        if (isDir &&
            FileUtils.getFileList(fullPath, { recursive: false }).length == 0) {
            return;
        }
        else if (!isDir) {
            fullPath = path_1.join(workingDir, projectDir);
        }
        this.watchers.push(fs_1.watch(fullPath, {
            persistent: true,
            recursive: false,
            encoding: FileUtils.ENCODING_UTF8
        }, (event, filename) => {
            if (!filename)
                return;
            let file = isDir ? filename.toString() : path;
            if (isDir && !shelljs_1.test("-f", path_1.join(fullPath, file))) {
                return;
            }
            else if (isDir) {
                file = path_1.join(path, file);
            }
            else if (!isDir && filename != path) {
                return;
            }
            if (this.nowChanging.includes(file))
                return;
            let recycle = this.nowChanging.indexOf("-");
            if (recycle >= 0) {
                this.nowChanging[recycle] = file;
            }
            else {
                this.nowChanging.push(file);
            }
            setTimeout(() => {
                this.nowChanging[this.nowChanging.indexOf(file)] = "-";
                this.change(event, file);
            }, this.timeout);
        }));
        if (isDir) {
            dirs_1.getDirList(path_1.join(workingDir, projectDir, path)).forEach((dir) => {
                this.addWatch(workingDir, projectDir, path_1.join(path, dir), false);
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
        this.watchers.forEach((watcher) => {
            watcher.close();
        });
    }
}
exports.FileWatcher = FileWatcher;
function removeObsolete(removeObsolete, processed, outputDir, ext) {
    if (!removeObsolete.active)
        return 0;
    let cfg = config_1.AppConfig.getInstance();
    let log = log_1.Logger.getInstance(cfg.options.logging);
    let sources = FileUtils.getFileList(outputDir, {
        allowedExtensions: [ext]
    });
    let stripped = cfg.options.stripping && cfg.options.stripping.suffix
        ? cfg.options.stripping.suffix
        : "";
    sources.forEach((file) => {
        let ext = path_1.extname(file);
        let fl = path_1.basename(file, ext);
        let skip = object_1.ArrayUtils.inExcludeList(removeObsolete.exclude, file) ||
            processed.includes(file) ||
            ext.endsWith("~");
        skip = skip || (stripped && fl.endsWith(stripped));
        if (skip)
            return;
        let trashFile = path_1.join(cfg.dirTemp, file);
        FileUtils.mkdir(path_1.dirname(trashFile));
        shelljs_1.mv(path_1.join(outputDir, file), trashFile);
        FileUtils.rmFile(path_1.join(outputDir, file, ".map"));
        if (process.env.NODE_ENV !== "test") {
            log.info(`Moved obsolete file ${file} to ${trashFile} `);
        }
    });
    return 1;
}
exports.removeObsolete = removeObsolete;
class LineReader {
    constructor(file = null, encoding = "utf8") {
        this.encoding = encoding;
        this.reader = null;
        if (file != null) {
            this.initialize(file);
        }
    }
    initialize(file) {
        if (!shelljs_1.test("-f", file)) {
            let log = log_1.Logger.getInstance();
            log.warn(`File ${file} doesn't exist`);
            return false;
        }
        const lineByLine = require("n-readlines");
        this.reader = new lineByLine(file);
        return true;
    }
    next() {
        if (this.reader == null)
            return false;
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