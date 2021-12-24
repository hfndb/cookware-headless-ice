import { AppConfig } from "../lib/config.mjs";
import { Logger } from "./log.mjs";
import bodyParser from "body-parser";
import express from "express";
import eUpload from "express-fileupload";
const { fileUpload } = eUpload;
// import cookieParser from "cookie-parser"; // Somehow blocks incoming requests
import session from "express-session";
import MemoryStore from "memorystore";

/**
 * Utility class for Express
 *
 * @example
 * // Function to cleanup and shutdown application
 * export function gracefulShutdown(): void {
 *   ExpressUtils.shutdown();
 * }
 *
 * let eu = ExpressUtils.getInstance();
 * eu.app.get(/^.*\/$/, controllerContent); // Home [of subdir]
 * eu.app.all(/^\/.*.html$/, controllerContent); // HTML pages, to GET or POST
 * eu.init(gracefulShutdown);
 *
 * // Logging from within a controller:
 * ExpressUtils.logRequest(req, res);
 */
export class ExpressUtils {
	static instance = null;
	constructor(devMode) {
		/**
		 * @private
		 */
		this.connectionPool = new Map();
		this.devMode = devMode;
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance(devMode = true) {
		if (!ExpressUtils.instance) {
			ExpressUtils.instance = new ExpressUtils(devMode);
			ExpressUtils.instance.app = express();
			ExpressUtils.instance.activateMiddleware();
		}
		return ExpressUtils.instance;
	}

	/**
	 * Add some middleware to server instance:
	 * - Logging
	 * - Body parsing
	 * - Session management
	 */
	activateMiddleware() {
		let cfg = AppConfig.getInstance();
		// -------------------------------------------------
		// Logging
		// -------------------------------------------------
		// if added for cookware-texts
		if (cfg.options.dependencies.express.activate.logging) {
			this.app.use(ExpressUtils.requestLogger);
		}
		// -------------------------------------------------
		// Cookie parsing - see above, require
		// -------------------------------------------------
		// this.app.use(cookieParser);
		// -------------------------------------------------
		// Body parsing
		// -------------------------------------------------
		this.app.use(bodyParser.json()); // to support JSON-encoded bodies
		this.app.use(
			bodyParser.urlencoded({
				// to support URL-encoded bodies
				extended: true,
			}),
		);
		// Added for cookware-texts
		if (cfg.options.dependencies.express.activate.uploads) {
			// Usage example: https://attacomsian.com/blog/uploading-files-nodejs-express
			// Options:
			// - https://www.npmjs.com/package/express-fileupload
			// - https://github.com/mscdex/busboy#api
			let opts = Object.assign(cfg.options.dependencies.express.fileUpload, {
				tempFileDir: cfg.dirTemp,
			});
			this.app.use(fileUpload(opts));
		}
		if (cfg.options.dependencies.express.activate.sessions) {
			this.activateSessions();
		}
	}

	activateSessions() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let sess = cfg.options.dependencies.express.session;
		/*
            Default values of express-session:
            { path: '/', httpOnly: true, secure: false, maxAge: null }
                genid: uses uid-safe
                name:  connect.sid
        */
		if (
			!this.devMode &&
			cfg.options.domain.url.startsWith("https") &&
			process.env.NODE_ENV == "production"
		) {
			this.app.set("trust proxy", 1); // trust first proxy
			sess.cookie.secure = true; // serve secure cookies
		} else {
			sess.cookie.secure = false;
		}
		if (this.devMode) {
			log.info(sess);
		}
		switch (cfg.options.dependencies.express.memoryStore.type) {
			case "memoryStore":
				let S = MemoryStore(session); // @todo check
				sess = Object.assign(sess, {
					store: new S(cfg.options.dependencies.express.memoryStore.memoryStore),
				});
				break;
			default:
				break;
		}
		this.app.use(session(sess));
		this.app.use(function(req, res, next) {
			res; // Fool compiler - unused variable
			if (!req.session.views) {
				req.session.views = {};
			}
			if (!req.path.startsWith("/static")) {
				req.session.views[req.path] = (req.session.views[req.path] || 0) + 1;
			}
			let eu = ExpressUtils.getInstance();
			let log = Logger.getInstance();
			if (eu.devMode && !req.path.startsWith("/static")) {
				log.info(
					"\nSession ID",
					req.session.id, // read only
					"\nViews",
					req.session.views,
					"\nRequest headers",
					req.headers,
				);
			}
			next();
		});
	}

	/**
	 * Initialize and prepare smooth shutdown of server.
	 * Connections will be killed in order to speed shutdown up
	 *
	 * Method inspired by: https://github.com/isaacs/server-destroy/blob/master/index.js
	 */
	init(gracefulShutdown) {
		let cfg = AppConfig.getInstance();
		let eu = ExpressUtils.getInstance();
		let log = Logger.getInstance();
		// ---------------------------------------------------------------------------------------------------
		// Naked server - begin
		// ---------------------------------------------------------------------------------------------------
		// Relevant for testing and server reboot:
		// The app.listen() method returns an(node) http.Server object
		// https://nodejs.org/api/net.html#net_server_close_callback
		this.server = this.app.listen(cfg.options.server.port);
		process.on("SIGINT", gracefulShutdown); // Ctrl-c
		process.on("SIGTERM", gracefulShutdown); // Kill process otherwise
		this.server.on("connection", function(conn) {
			let key = conn.remoteAddress + ":" + conn.remotePort;
			// console.log(`Key added: ${key}`);
			eu.connectionPool.set(key, conn);
			conn.on("close", function() {
				eu.connectionPool.delete(key);
				// console.log(`Key deleted: ${key}`);
			});
		});
		this.server.destroy = function(cb) {
			eu.server.close(cb);
			for (let key in eu.connectionPool.keys()) {
				eu.connectionPool.get(key).destroy();
			}
		};
		this.server.on("error", e => {
			if (e.code === "EADDRINUSE") {
				log.error(
					"Whoops! Address in use, seems to be running already. Shutting down this server instance...",
				);
				if (!cfg.options.logging.exitOnError) {
					gracefulShutdown();
				}
			}
		});
		// if added for cookware-texts
		if (cfg.options.dependencies.express.activate.logging) {
			setTimeout(() => {
				// Take some time to know for sure the 'address in use' error didn't occur
				log.info(
					`Initialization finalized - server running at port ${cfg.options.server.port}`,
				);
			}, 3000);
		}
	}

	/**
	 * Smooth shutdown of server
	 */
	static shutdown() {
		let eu = ExpressUtils.getInstance();
		eu.server.close(function() {
			if (process.env.NODE_ENV != "test") {
				console.log("Bye!\n");
				process.exit(0);
			}
		});
		setImmediate(function() {
			eu.server.emit("close");
		}); // Inspired by https://stackoverflow.com/questions/14626636/how-do-i-shutdown-a-node-js-https-server-immediately
	}

	/**
	 * To be called from controller, to log a HTTP request
	 */
	static logRequest(req, res) {
		if (req.path == "/favicon.ico") return;
		let log = Logger.getInstance();
		let str = `${req.method.padEnd(5, " ")}${res.statusCode} ${req.url}`;
		// ${ res.statusMessage }  ${res.get("Content-Length") || 0}b
		if (res.statusCode == 404) {
			log.warn(str);
		} else {
			log.info(str);
		}
	}

	/**
	 * Middleware for logging to console
	 * Usage: app.use(ExpressUtils.requestLogger);
	 */
	static requestLogger(req, res, next) {
		//
		// Inspired by:
		// https://dev.to/brightdevs/http-request-logging-in-nodejs-42od
		// For production use (server) it would need correlation: Requests with responses
		//
		res.on("finish", () => {
			let cfg = AppConfig.getInstance();
			if (req.path.startsWith("/static")) {
				if (cfg.options.server.logStatic) ExpressUtils.logRequest(req, res);
			} else {
				ExpressUtils.logRequest(req, res);
			}
			res.removeListener("finish", ExpressUtils.requestLogger);
			let eu = ExpressUtils.getInstance();
			if (eu.devMode && !req.path.startsWith("/static")) {
				let log = Logger.getInstance();
				log.info("\nResponse headers:", res.getHeaders());
			}
		});
		next();
	}

	static getCookie(req) {
		let cookie = {};
		if (!req.headers || !req.headers.cookie) return cookie;
		/**
		 * Remainder of code = modified version of code in js-cookie
		 * @see https://github.com/js-cookie/js-cookie
		 **/
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
			} catch (e) {}
		}
		return cookie;
	}
}
