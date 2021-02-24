"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdownFile = void 0;
const path_1 = require("path");
const lib_1 = require("../lib");
const markup_1 = require("./markup");
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
    let content = markdown(lib_1.FileUtils.readFile(path_1.join(dir, path)));
    let title = markup_1.Html.getTagContent(content, "h1")[0];
    if (!title) {
        let url = path_1.basename(path, ".md");
        title = path_1.basename(url.replace("_", " ").replace("-", " "), ".md");
    }
    return [content, title];
}
exports.renderMarkdownFile = renderMarkdownFile;
//# sourceMappingURL=markdown.js.map