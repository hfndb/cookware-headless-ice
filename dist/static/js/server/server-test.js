"use strict";

var _config = require("../lib/config");

var _express = require("../lib/express");

var _server = require("../server");

const chai = require("chai");

const chaiHttp = require("chai-http");

let cfg = _config.AppConfig.getInstance();

cfg.options.logging.useConsole = false;
process.env.NODE_ENV = "test";
chai.use(chaiHttp);
(0, _server.coatRack)();
describe("Local development server", function () {
  let eu = _express.ExpressUtils.getInstance();

  let app = eu.app;
  it("should render", () => {
    chai.request(app).get("/").end((err, res) => {
      chai.expect(res.status).to.equal(200, "HTTP status code home page");
      chai.expect(res.body).be.an.instanceof(Object);
      err;
    });
  });
  it("should render Markdown files", () => {
    chai.request(app).get("/sys/README.md").end((err, res) => {
      chai.expect(res.status).to.equal(200, "HTTP status code README.md");
      chai.expect(res.body).be.an.instanceof(Object);
      err;
    });
  });
  it("should render a todo list", () => {
    chai.request(app).get("/sys/todo.html").end((err, res) => {
      chai.expect(res.status).to.equal(200, "HTTP status code todo.html");
      chai.expect(res.body).be.an.instanceof(Object);
      err;
    });
  });
  it("should lint a HTML file", () => {
    chai.request(app).get("/?lint=true").end((err, res) => {
      chai.expect(res.status).to.equal(200, "HTTP status code lint output");
      chai.expect(res.body).be.an.instanceof(Object);
      err;
    });
  });
});
(0, _server.gracefulShutdown)();