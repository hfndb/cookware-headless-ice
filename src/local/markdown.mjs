"use strict";
import { basename, join } from "node:path";
import { marked } from "marked";
import { FileUtils } from "../generic/index.mjs";
import { Html } from "./markup.mjs";

/**
 * Read a markdown file from disk and render it to a HTML string. Markdown to markup 😀
 *
 * @param dir aboslute dir
 * @param path request URL
 *
 * @returns array with content in 1st element, extracted title in 2nd element
 * @see https://marked.js.org/
 */
export function renderMarkdownFile(dir, path) {
	/**
	 * @see https://marked.js.org/using_advanced
	 */
	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		breaks: true,
		sanitize: false,
		smartLists: true,
		xhtml: false,
	});
	let md = FileUtils.readFile(join(dir, path));
	let content = marked.parse(md);
	// Try to strip the content within h1 tags
	let title = Html.getTagContent(content, "h1")[0];
	if (!title) {
		let url = basename(path, ".md");
		title = basename(url.replace("_", " ").replace("-", " "), ".md");
	}
	// Syntax comments in markdown:
	// [comment]: <> (some text)
	return [content, title];
}
