"use strict";
import chai from "chai";
import chaiHttp from "chai-http";
import { AppConfig } from "../generic/config.mjs";
import { ExpressUtils } from "../generic/express.mjs";
import {
	gracefulShutdown as stopDevServer,
	coatRack as startDevServer,
} from "../server.mts";

let cfg = AppConfig.getInstance();
cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
chai.use(chaiHttp); // Configure chai
startDevServer();

describe("Local development server", function() {
	let eu = ExpressUtils.getInstance();
	let app = eu.app;

	it("should render", () => {
		chai
			.request(app)
			.get("/")
			.end((err: Error, res: any) => {
				chai.expect(res.status).to.equal(200, "HTTP status code home page");
				chai.expect(res.body).be.an.instanceof(Object);
				err; // Fool compiler
			});
	});

	it("should render Markdown files", () => {
		chai
			.request(app)
			.get("/sys/README.md")
			.end((err: Error, res: any) => {
				chai.expect(res.status).to.equal(200, "HTTP status code README.md");
				chai.expect(res.body).be.an.instanceof(Object);
				err; // Fool compiler
			});
	});

	it("should render a todo list", () => {
		chai
			.request(app)
			.get("/sys/todo.html")
			.end((err: Error, res: any) => {
				chai.expect(res.status).to.equal(200, "HTTP status code todo.html");
				chai.expect(res.body).be.an.instanceof(Object);
				err; // Fool compiler
			});
	});

	it("should lint a HTML file", () => {
		chai
			.request(app)
			.get("/?lint=true")
			.end((err: Error, res: any) => {
				chai.expect(res.status).to.equal(200, "HTTP status code lint output");
				chai.expect(res.body).be.an.instanceof(Object);
				err; // Fool compiler
			});
	});
});

stopDevServer(); // @todo server doesn't shutdown, need to end testing using ctrl-c

// https://medium.com/@asciidev/testing-a-node-express-application-with-mocha-chai-9592d41c0083
