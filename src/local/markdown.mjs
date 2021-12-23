import { basename, join } from "path";
import markdown from "marked";
import { FileUtils } from "../lib/index.mjs";
import { Html } from "./markup.mjs";

/**
 * Read a markdown file from disk and render it to a HTML string. Markdown to markup 😀
 *
 * @param dir aboslute dir
 * @param path request URL
 *
 * @returns array with content in 1st element, extracted title in 2nd element
 */
export function renderMarkdownFile(dir, path) {
	markdown.setOptions({
		renderer: new markdown.Renderer(),
		gfm: true,
		tables: true,
		breaks: true,
		sanitize: false,
		xhtml: false,
	});
	let content = markdown(FileUtils.readFile(join(dir, path)));
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
