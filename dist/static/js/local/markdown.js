"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderMarkdownFile = renderMarkdownFile;

require("source-map-support/register");

var _path = require("path");

var _lib = require("../lib");

var _markup = require("./markup");

function renderMarkdownFile(dir, path) {
  const markdown = require("marked");

  markdown.setOptions({
    renderer: new markdown.Renderer(),
    gfm: true,
    tables: true,
    breaks: true,
    sanitize: false,
    xhtml: false
  });
  let content = markdown(_lib.FileUtils.readFile((0, _path.join)(dir, path)));

  let title = _markup.Html.getTagContent(content, "h1")[0];

  if (!title) {
    let url = (0, _path.basename)(path, ".md");
    title = (0, _path.basename)(url.replace("_", " ").replace("-", " "), ".md");
  }

  return [content, title];
}
//# sourceMappingURL=markdown.js.map