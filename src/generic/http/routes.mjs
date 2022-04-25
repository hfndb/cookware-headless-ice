"use strict";
import { AppConfig } from "../config.mjs";
import { Logger } from "../log.mjs";

/**
 * One route
 */
class Route {
	static urlStatic;
	handler;
	regex;

	/**
	 * @param {Function} handler Async function. Should swallow 3 parameters: url, request, reply and return a boolean value for 'request dealt with'. See function statics in this file
	 * @param {RegExp} regex Regular expression to determine which handler to use
	 */
	constructor(handler, regex) {
		this.handler = handler;
		this.regex = regex;
		if (!Route.urlStatic) {
			Route.urlStatic = new RegExp(`^/${cfg.options.server.static.url}*`);
		}
	}

	/**
	 * Get a new instance for a route.
	 *
	 * @param {string|RegExp} route
	 * @param {Function} handler
	 * @returns {Route}
	 */
	static get(route, handler) {
		return new Route(
			handler,
			typeof route == "string" ? new RegExp(route) : route,
		);
	}

	/**
	 * Log request
	 *
	 * @param {number} status HTTP code
	 * @param {string} method
	 * @param {string} url
	 */
	static logRequest(status, method, url) {
		// Ignore fav icon
		if (url == "/favicon.ico") return;

		// Ignore static file?
		let cfg = AppConfig.getInstance();
		if (Route.urlStatic.test(url) && !cfg.options.server.static.log) return;

		// Log request
		let log = Logger.getInstance();
		let str = `${method.padEnd(5, " ")}${status} ${url}`;

		if (status < 400) {
			log.warn(str);
		} else {
			log.info(str);
		}
	}
}

/**
 * All routes
 *
 * @property {Route[]} get All GET routes
 * @property {Route[]} get All POST routes
 */
class Routes {
	static _instance;
	get = [];
	post = [];

	/**
	 * Singleton factory to get instance
	 *
	 * @returns {HttpServer}
	 */
	static getInstance() {
		if (!Routes._instance) {
			Routes._instance = new Routes();
		}

		return Routes._instance;
	}

	/**
	 * Search for the first route that matches the url and
	 * then return the handler. Or return null if not found.
	 *
	 * @param {Request} request
	 * @returns {Promise<Function|null>}
	 */
	async getHandler(request) {
		const { method, url } = request;
		let arr, idx;
		switch (method) {
			case "GET":
				arr = this.get;
				break;
			case "POST":
				arr = this.post;
				break;
			default:
				return null;
				break;
		}

		for (let i = 0; i < arr.length; i++) {
			if (arr[i].regex.test(url)) return arr[i].handler;
		}

		return null;
	}

	/**
	 * Add a route and controller aka handler for a GET request.
	 *
	 * @param {string|RegExp} route
	 * @param {Function} handler
	 */
	static addGet(route, handler) {
		let rts = Routes.getInstance();
		rts.get.push(Route.get(route, handler));
	}

	/**
	 * Add a route and controller aka handler for a POST request.
	 *
	 * @param {string} route
	 * @param {Function} handler
	 * @param {boolean} alsoAddGet
	 */
	static addPost(route, handler, alsoAddGet = true) {
		let rts = Routes.getInstance();
		if (alsoAddGet) rts.addGet(route, handler);
		rts.post.push(Route.get(route, handler));
	}
}
