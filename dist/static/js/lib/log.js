"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const audio_1 = require("./audio");
const files_1 = require("./files");
const utils_1 = require("./utils");
const color = require("colors/safe");
class Logger {
    constructor(options) {
        this.fileAll = "";
        this.fileDatabase = "";
        this.fileError = "";
        this.lineLenght = 80;
        this.isShuttingDown = false;
        this.udfLogging = null;
        this.shutdown = null;
        this.opts = options;
        if (options == null) {
            return;
        }
        this.fileAll = "combined.log";
        this.fileDatabase = "database.log";
        this.fileError = "error.log";
        if (this.opts.transports.file.active) {
            files_1.FileUtils.mkdir(this.opts.transports.file.dir);
        }
    }
    static getInstance(options) {
        if (!Logger.instance) {
            if (options) {
                Logger.instance = new Logger(options);
            }
            else {
                console.log("Programming error? Logger.getInstance() called without options");
            }
        }
        return Logger.instance;
    }
    static error2string(err) {
        return err.stack == undefined ? "" : err.stack;
    }
    static args2string(arg) {
        let retVal = "";
        arg.forEach((row) => {
            if (typeof row == "object") {
                retVal = retVal.concat(JSON.stringify(row, null, 4)).concat("\n");
            }
            else {
                retVal = retVal.concat(row).concat("\n");
            }
        });
        return retVal.substr(0, retVal.length - 1);
    }
    writeConsole(level, pars, line = false) {
        if (!this.opts.transports.console.active)
            return;
        const frmtr = utils_1.Formatter.getInstance();
        let stamp = frmtr.date(new Date(), this.opts.transports.console.format);
        if (line) {
            console.log("-".repeat(this.lineLenght));
        }
        else {
            console.log(stamp, level, pars);
        }
    }
    writeFile(file, level, args, line = false) {
        this.writeUdf(level, args);
        if (!this.opts.transports.file.active)
            return;
        const frmtr = utils_1.Formatter.getInstance();
        let stamp = frmtr.date(new Date(), this.opts.transports.file.format);
        let msg = line ? "-".repeat(this.lineLenght) : `${stamp} ${level} ${args}`;
        files_1.FileUtils.writeFile("", path_1.join(this.opts.transports.file.dir, file), msg, false, "a");
    }
    getStackInfo() {
        let data = {
            method: "",
            path: "",
            line: "",
            pos: "",
            dir: "",
            file: "",
            stack: [""]
        };
        let err = new Error("");
        let idx = 1;
        let stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
        let stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;
        let stacklist = (err.stack || "").split("\n").slice(2);
        let sp = stackReg.exec(stacklist[idx]) || stackReg2.exec(stacklist[idx]);
        if (sp && sp.length === 5) {
            data.method = sp[1];
            data.path = sp[2];
            data.line = sp[3];
            data.pos = sp[4];
            data.stack = stacklist;
            ["dist/src", "static/js"].forEach(search => {
                let idx = data.path.indexOf(search);
                let len = search.length;
                if (idx >= 0) {
                    let pth = data.path.substr(idx + len + 1);
                    data.dir = path_1.dirname(pth);
                    data.file = path_1.basename(pth);
                }
            });
        }
        return data;
    }
    writeUdf(level, args) {
        if (!this.opts.transports.udf || !this.udfLogging)
            return false;
        return this.udfLogging(level, args);
    }
    debug(...args) {
        if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "test") {
            return;
        }
        let stack = this.getStackInfo();
        args.unshift(`  [ ${stack.dir}/${stack.file}:${stack.line}:${stack.pos}, ${stack.method} ]`);
        let pars = Logger.args2string(args);
        this.writeConsole(color.blue("Debug"), pars);
        this.writeFile(this.fileAll, "debug", pars + "\n");
    }
    warn(...args) {
        let pars = Logger.args2string(args);
        this.writeConsole(color.red("Warn "), pars);
        this.writeFile(this.fileAll, "warning", pars + "\n");
        if (this.opts.playSoundOn.warning) {
            audio_1.AudioUtils.playFile(path_1.join("bin", "writing-signature-1.mp3"));
        }
    }
    info(...args) {
        let pars = Logger.args2string(args);
        this.writeConsole(color.green("Info "), pars);
        this.writeFile(this.fileAll, "info", pars + "\n");
    }
    sql(...args) {
        let tmp = this.opts.logDatabase;
        if (!tmp)
            return;
        let pars = Logger.args2string(args);
        this.writeConsole(color.green("Info "), pars);
        this.opts.logDatabase = false;
        this.writeFile(this.fileDatabase, "", pars + "\n");
        this.opts.logDatabase = tmp;
    }
    error(...args) {
        let pars = Logger.args2string(args);
        this.writeConsole(color.red("Error"), pars);
        this.writeFile(this.fileError, "error", pars + "\n");
        if (this.opts.playSoundOn.error) {
            audio_1.AudioUtils.playFile(path_1.join("bin", "writing-signature-1.mp3"));
        }
        if (this.opts.exitOnError) {
            this.isShuttingDown = true;
            if (this.shutdown == null) {
                throw new Error();
            }
            else {
                this.shutdown();
            }
            process.exit(-1);
        }
    }
    separatorLine(file, level) {
        this.writeConsole(level, "", true);
        this.writeFile(file, level, "", true);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=log.js.map