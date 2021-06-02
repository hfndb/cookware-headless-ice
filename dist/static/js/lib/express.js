"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressUtils = void 0;
const config_1 = require("../lib/config");
const log_1 = require("./log");
const bodyParser = require("body-parser");
const express = require("express");
var session = require("express-session");
var MemoryStore = require("memorystore")(session);
class ExpressUtils {
    constructor(devMode) {
        this.connectionPool = new Map();
        this.devMode = devMode;
    }
    static getInstance(devMode = true) {
        if (!ExpressUtils.instance) {
            ExpressUtils.instance = new ExpressUtils(devMode);
            ExpressUtils.instance.app = express();
            ExpressUtils.instance.activateMiddleware();
        }
        return ExpressUtils.instance;
    }
    activateMiddleware() {
        let cfg = config_1.AppConfig.getInstance();
        this.app.use(ExpressUtils.requestLogger);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        if (cfg.options.dependencies.express.activate.uploads) {
            const fileUpload = require("express-fileupload");
            let opts = Object.assign(cfg.options.dependencies.express.fileUpload, {
                tempFileDir: cfg.dirTemp
            });
            this.app.use(fileUpload(opts));
        }
        if (cfg.options.dependencies.express.activate.sessions) {
            this.activateSessions();
        }
    }
    activateSessions() {
        let cfg = config_1.AppConfig.getInstance();
        let log = log_1.Logger.getInstance();
        let sess = cfg.options.dependencies.express.session;
        if (!this.devMode &&
            cfg.options.domain.url.startsWith("https") &&
            process.env.NODE_ENV == "production") {
            this.app.set("trust proxy", 1);
            sess.cookie.secure = true;
        }
        else {
            sess.cookie.secure = false;
        }
        if (this.devMode) {
            log.info(sess);
        }
        switch (cfg.options.dependencies.express.memoryStore.type) {
            case "memoryStore":
                sess = Object.assign(sess, {
                    store: new MemoryStore(cfg.options.dependencies.express.memoryStore.memoryStore)
                });
                break;
            default:
                break;
        }
        this.app.use(session(sess));
        this.app.use(function (req, res, next) {
            res;
            if (!req.session.views) {
                req.session.views = {};
            }
            if (!req.path.startsWith("/static")) {
                req.session.views[req.path] = (req.session.views[req.path] || 0) + 1;
            }
            let eu = ExpressUtils.getInstance();
            let log = log_1.Logger.getInstance();
            if (eu.devMode && !req.path.startsWith("/static")) {
                log.info("\nSession ID", req.session.id, "\nViews", req.session.views, "\nRequest headers", req.headers);
            }
            next();
        });
    }
    init(gracefulShutdown) {
        let cfg = config_1.AppConfig.getInstance();
        let eu = ExpressUtils.getInstance();
        let log = log_1.Logger.getInstance();
        this.server = this.app.listen(cfg.options.server.port);
        process.on("SIGINT", gracefulShutdown);
        process.on("SIGTERM", gracefulShutdown);
        this.server.on("connection", function (conn) {
            let key = conn.remoteAddress + ":" + conn.remotePort;
            eu.connectionPool.set(key, conn);
            conn.on("close", function () {
                eu.connectionPool.delete(key);
            });
        });
        this.server.destroy = function (cb) {
            eu.server.close(cb);
            for (let key in eu.connectionPool.keys()) {
                eu.connectionPool.get(key).destroy();
            }
        };
        this.server.on("error", (e) => {
            if (e.code === "EADDRINUSE") {
                log.error("Whoops! Address in use, seems to be running already. Shutting down this server instance...");
                if (!cfg.options.logging.exitOnError) {
                    gracefulShutdown();
                }
            }
        });
        setTimeout(() => {
            log.info(`Initialization finalized - server running at port ${cfg.options.server.port}`);
        }, 3000);
    }
    static shutdown() {
        let eu = ExpressUtils.getInstance();
        eu.server.close(function () {
            if (process.env.NODE_ENV != "test") {
                console.log("Bye!\n");
                process.exit(0);
            }
        });
        setImmediate(function () {
            eu.server.emit("close");
        });
    }
    static logRequest(req, res) {
        if (req.path == "/favicon.ico")
            return;
        let log = log_1.Logger.getInstance();
        let str = `${req.method.padEnd(5, " ")}${res.statusCode} ${req.url}`;
        if (res.statusCode == 404) {
            log.warn(str);
        }
        else {
            log.info(str);
        }
    }
    static requestLogger(req, res, next) {
        res.on("finish", () => {
            let cfg = config_1.AppConfig.getInstance();
            if (req.path.startsWith("/static")) {
                if (cfg.options.server.logStatic)
                    ExpressUtils.logRequest(req, res);
            }
            else {
                ExpressUtils.logRequest(req, res);
            }
            res.removeListener("finish", ExpressUtils.requestLogger);
            let eu = ExpressUtils.getInstance();
            if (eu.devMode && !req.path.startsWith("/static")) {
                let log = log_1.Logger.getInstance();
                log.info("\nResponse headers:", res.getHeaders());
            }
        });
        next();
    }
    static getCookie(req) {
        let cookie = {};
        if (!req.headers || !req.headers.cookie)
            return cookie;
        function decode(s) {
            return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
        }
        let entries = req.headers.cookie.split("; ");
        for (let i = 0; i < entries.length; i++) {
            let parts = entries[i].split("=");
            let entry = parts.slice(1).join("=");
            if (entry.charAt(0) === '"') {
                entry = entry.slice(1, -1);
            }
            try {
                let name = decode(parts[0]);
                entry = decode(entry);
                cookie[name] = entry;
            }
            catch (e) { }
        }
        return cookie;
    }
}
exports.ExpressUtils = ExpressUtils;
ExpressUtils.instance = null;
//# sourceMappingURL=express.js.map