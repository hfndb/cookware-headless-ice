"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const chaiHttp = require("chai-http");
const config_1 = require("../lib/config");
const express_1 = require("../lib/express");
const server_1 = require("../server");
let cfg = config_1.AppConfig.getInstance();
cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
chai.use(chaiHttp);
server_1.coatRack();
describe("Local development server", function () {
    let eu = express_1.ExpressUtils.getInstance();
    let app = eu.app;
    it("should render", () => {
        chai
            .request(app)
            .get("/")
            .end((err, res) => {
            chai.expect(res.status).to.equal(200, "HTTP status code home page");
            chai.expect(res.body).be.an.instanceof(Object);
            err;
        });
    });
    it("should render Markdown files", () => {
        chai
            .request(app)
            .get("/sys/README.md")
            .end((err, res) => {
            chai.expect(res.status).to.equal(200, "HTTP status code README.md");
            chai.expect(res.body).be.an.instanceof(Object);
            err;
        });
    });
    it("should render a todo list", () => {
        chai
            .request(app)
            .get("/sys/todo.html")
            .end((err, res) => {
            chai.expect(res.status).to.equal(200, "HTTP status code todo.html");
            chai.expect(res.body).be.an.instanceof(Object);
            err;
        });
    });
    it("should lint a HTML file", () => {
        chai
            .request(app)
            .get("/?lint=true")
            .end((err, res) => {
            chai.expect(res.status).to.equal(200, "HTTP status code lint output");
            chai.expect(res.body).be.an.instanceof(Object);
            err;
        });
    });
});
server_1.gracefulShutdown();
//# sourceMappingURL=server-test.js.map