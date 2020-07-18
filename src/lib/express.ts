import { Response, Request } from "express";
import { AppConfig } from "../lib/config";
import { Logger } from "./log";
const bodyParser = require("body-parser");
const express = require("express");
var session = require("express-session");
var MemoryStore = require("memorystore")(session);

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
	/**
	 * @private
	 */
	connectionPool = new Map();
	/**
	 * @private
	 */
	server: any;
	/**
	 * @public
	 */
	app: any;
	/**
	 * @public
	 */
	devMode: boolean;

	static instance: ExpressUtils | null = null;

	constructor(devMode: boolean) {
		this.devMode = devMode;
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance(devMode: boolean = true): ExpressUtils {
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
	private activateMiddleware() {
		let cfg = AppConfig.getInstance();

		// -------------------------------------------------
		// Logging
		// -------------------------------------------------
		this.app.use(ExpressUtils.requestLogger);

		// -------------------------------------------------
		// Body parsing
		// -------------------------------------------------
		this.app.use(bodyParser.json()); // to support JSON-encoded bodies
		this.app.use(
			bodyParser.urlencoded({
				// to support URL-encoded bodies
				extended: true
			})
		);

		if (cfg.options.dependencies.express.activate.sessions) {
			this.activateSessions();
		}
	}

	private activateSessions() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();
		let sess = cfg.options.dependencies.express.session;
		/*
			Default values of express-session:
			{ path: '/', httpOnly: true, secure: false, maxAge: null }
				genid: uses uid-safe
				name:  connect.sid
		*/

		if (!this.devMode && cfg.options.domain.url.startsWith("https") && process.env.NODE_ENV == "production") {
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
				sess = Object.assign(sess, {
					store: new MemoryStore(cfg.options.dependencies.express.memoryStore.memoryStore)
				});
				break;

			default:
				break;
		}

		this.app.use(session(sess));

		this.app.use(function(req: any, res: Response, next: Function) {
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
					req.headers
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
	init(gracefulShutdown: any): void {
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

		this.server.on("connection", function(conn: any) {
			let key = conn.remoteAddress + ":" + conn.remotePort;
			// console.log(`Key added: ${key}`);
			eu.connectionPool.set(key, conn);
			conn.on("close", function() {
				eu.connectionPool.delete(key);
				// console.log(`Key deleted: ${key}`);
			});
		});

		this.server.destroy = function(cb: any) {
			eu.server.close(cb);
			for (let key in eu.connectionPool.keys()) {
				eu.connectionPool.get(key).destroy();
			}
		};

		this.server.on("error", (e: any) => {
			if (e.code === "EADDRINUSE") {
				log.error("Whoops! Address in use, seems to be running already. Shutting down this server instance...");
				if (!cfg.options.logging.exitOnError) {
					gracefulShutdown();
				}
			}
		});

		setTimeout(() => {
			// Take some time to know for sure the 'address in use' error didn't occur
			log.info(`Initialization finalized - server running at port ${cfg.options.server.port}`);
		}, 3000);
	}

	/**
   * Smooth shutdown of server
   */
	static shutdown(): void {
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
	static logRequest(req: Request, res: Response): void {
		if (req.path == "/favicon.ico") return;
		let log = Logger.getInstance();
		let str = `${req.method} ${res.statusCode} ${req.url}`;
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
	static requestLogger(req: Request, res: Response, next: Function) {
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
}
