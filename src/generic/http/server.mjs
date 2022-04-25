"use strict";
import {
	createServer,
	Http2ServerRequest as Request,
	Http2ServerResponse as Reply,
} from "http";
import { readFile } from "fs/promises";
import { join } from "path";
import { URL } from "url";
import shelljs from "shelljs";
import mime from "mime-types";
import { AppConfig } from "../config.mjs";
import { Logger } from "../log.mjs";
import { httpStatus, mimeType } from "./constants.mjs";
import { Route, Routes } from "./routes.mjs";
const { test } = shelljs;
const { contentType, lookup } = mime;

// For convenience during imports elsewhere
export { Request, Reply };

/**
 * Added for study purposes, not used
 *
 * @property {Routes} routes
 * @property {HttpServer} _instance Static variable with instance of this class
 * @property {Http2Server} instance Instance of node.js server
 *
 * @see https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/
 *
 * @example
 * let hs = HttpServer.getInstance();
 * // Add routes here
 * hs.start();
 */
export class HttpServer {
	static _instance;
	instance;

	constructor() {
		let cfg = AppConfig.getInstance();
		// Route for static files
		Routes.addGet(
			new RegExp(`^/${cfg.options.server.static.url}*`),
			HttpServer.statics,
		);
	}

	/**
	 * Singleton factory to get instance
	 *
	 * @returns {HttpServer}
	 */
	static getInstance() {
		if (!HttpServer._instance) {
			HttpServer._instance = new HttpServer();
		}

		return HttpServer._instance;
	}

	/**
	 * Start server
	 */
	start() {
		let cfg = AppConfig.getInstance();
		let log = Logger.getInstance();

		this.instance = createServer(this.listener, {}); // See options

		// Events and streams can be used here

		this.instance.on("close", () => {
			// TODO
		});

		this.instance.listen(cfg.options.server.port, function() {
			if (process.env.NODE_ENV != "production") {
				log.info(`Server running at port ${cfg.options.server.port}`);
			}
		});
	}

	/**
	 * Gracefully shutdown server
	 *
	 * @param {Function} fn
	 */
	static stop(fn) {
		let hs = HttpServer.getInstance();
		hs.instance.close(fn);
	}

	/**
	 * Listen to requests
	 *
	 * @private
	 * @param {Request} request
	 * @param {Reply} reply
	 */
	async listener(request, reply) {
		const { headers, method, url } = request;
		let body = [],
			log = Logger.getInstance(),
			error = -1,
			fn;

		// TODO In case of GET, from url use urlSearchParams.get(name), urlSearchParams.forEach to put in request.query

		// In case of a POST or PUT
		request
			.on("error", err => {
				reply.writeHead(400);
				const headersR = reply.getHeaders();
				const str = "HTTP/1.1 400 Bad Request\r\n\r\n";
				const responseBody = { headersR, method, url, str };
				reply.end(responseBody);
				error = httpStatus.clientError.BAD_REQUEST;
			})
			.on("data", chunk => {
				body.push(chunk);
			})
			.on("end", () => {
				body = Buffer.concat(body).toString();
			});

		response.on("error", err => {
			log.error("Response error", err);
			error = httpStatus.serverError.INTERNAL_SERVER_ERROR;
		});

		if (error < 0) {
			fn = await this.getHandler(request);
			if (!fn) {
				// Route not found
				error = httpStatus.clientError.NOT_FOUND;
			}
		}
		if (fn) {
			try {
				await fn(url, request, reply);
			} catch (err) {
				log.error("Error while calling handler for route", url, method, err);
				error = httpStatus.serverError.INTERNAL_SERVER_ERROR;
			}
		}

		if (error >= 0) reply.statusCode = error;

		Route.logRequest(reply.statusCode, request.method, url);
	}

	/**
	 * Set HTTP header
	 *
	 * @param {Reply} reply
	 * @param {string} name
	 * @param {string} value
	 */
	setHeader(reply, name, value) {
		reply.setHeader(name, value);
	}

	/**
	 * Set HTTP header
	 *
	 * @param {Reply} reply
	 * @param {string} name
	 * @param {string} value
	 */
	setContentType(reply, value) {
		reply.setHeader("Content-Type", value);
	}

	/**
	 * Send a HTML back to browser
	 *
	 * @param {Reply} reply
	 * @param {string} str
	 * @param {number} status HTTP code
	 */
	static async sendHtml(reply, str, status = httpStatus.success.OK) {
		let hs = HttpServer.getInstance();
		const { method, url } = reply.req;
		hs.setContentType(reply, `${mimeType.html}; charset=utf-8`);
		reply.writeHead(status);
		const headers = reply.getHeaders();
		const responseBody = { headers, method, url, str };
		reply.end(responseBody);
	}

	/**
	 * Send a json back to browser
	 *
	 * @param {Reply} reply
	 * @param {Object} obj
	 * @param {number} status HTTP code
	 */
	static sendJson(reply, obj, status = httpStatus.success.OK) {
		let hs = HttpServer.getInstance();
		const { method, url } = reply.req;
		hs.setContentType(reply, `${mimeType.json}; charset=utf-8`);
		reply.writeHead(status);
		const headers = reply.getHeaders();
		const responseBody = { headers, method, url, obj };
		reply.end(JSON.stringify(responseBody));
	}

	/**
	 * Send a file
	 *
	 * @param {Reply} reply
	 * @param {string} path
	 * @param {string} name For receiver
	 */
	static async sendFile(reply, path, name) {
		let tp = contentType(); // Raw type
		if (!tp) tp = "application/octet-stream"; // Binary
		tp = lookup(path); // As content type with charset

		let hs = HttpServer.getInstance();
		readFile(path)
			.then(data => {
				hs.setContentType(reply, tp);
				switch (tp) {
					case mimeType.csv:
						hs.setHeader(reply, "Content-Disposition", "attachment;filename=" + name);
						break;
				}
				reply.writeHead(httpStatus.success.OK);
				reply.end(data);
			})
			.catch(err => {
				reply.writeHead(httpStatus.serverError.INTERNAL_SERVER_ERROR);
				reply.end(err);
				return;
			});
	}

	/**
	 * Controller for static files
	 *
	 * @param {string} url
	 * @param {Request} request
	 * @param {Reply} reply
	 * @returns {Promise<boolean>} for 'request dealt with'
	 */
	static async statics(url, request, reply) {
		let cfg = AppConfig.getInstance();
		let path = join(cfg.dirProject, cfg.options.html.dirs.output, url);
		if (test("-f", path)) {
			await HttpServer.sendFile(reply, path, name);
			return true;
		} else {
			return false;
		}
	}
}
