import { basename, extname, join } from "path";
import date from "date-and-time";
import shelljs from "shelljs";
import { AppConfig } from "../lib/config.mjs";
import { ExpressUtils } from "../lib/express.mjs";
import { FileStatus } from "../lib/file-diff.mjs";
import { Content } from "../lib/html.mjs";
import { SysUtils } from "../lib/sys.mjs";
import { Packages } from "../lib/package-json.mjs";
import { renderMarkdownFile } from "../local/markdown.mjs";
import { Lint } from "../local/markup.mjs";
import { searchProject, renderSysTemplate } from "../local/misc.mjs";
import { generateStats } from "../local/overview.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
const { test } = shelljs;

/**
 * For webdev docs and functionality
 */
export function controllerSys(req, res, next) {
	let cfg = AppConfig.getInstance();
	let root =
		extname(req.path) == ".md" ? cfg.dirMain : join(cfg.dirMain, "content");
	controllerGeneric(req, res, next, root, false, "/sys");
}

/**
 * For project content
 */
export function controllerContent(req, res, next) {
	let cfg = AppConfig.getInstance();
	let root =
		extname(req.path) == ".md"
			? cfg.dirProject
			: join(cfg.dirProject, cfg.options.html.dirs.content);
	(async () => {
		controllerGeneric(req, res, next, root, true, "");
	})();
}

/**
 * For static files, in order to see logging at all times.
 * Reason: express.static() only logs errors.
 */
export function controllerStatic(req, res, next) {
	let cfg = AppConfig.getInstance();
	let file = basename(req.path);
	let forceMain = false;
	let url = req.path;
	if (url.startsWith("/static/sys")) {
		url = url.replace("/static/sys", "/static");
		forceMain = true;
	}
	let inProject = join(Content.getOutputDir(), url);
	let inMain = join(cfg.dirMain, "dist", url);
	let pdf = join(cfg.dirProject, cfg.options.pdf.dirs.output, file);
	let ePub = join(cfg.dirProject, cfg.options.epub.dirs.output, file);
	if (!forceMain && test("-f", inProject)) {
		res.sendFile(inProject);
	} else if (test("-f", inMain)) {
		res.sendFile(inMain);
	} else if (req.path.endsWith(".epub") && test("-f", ePub)) {
		ExpressUtils.logRequest(req, res); // @todo obsolete?
		res.sendFile(ePub);
	} else if (req.path.endsWith(".pdf") && test("-f", pdf)) {
		ExpressUtils.logRequest(req, res); // @todo obsolete?
		res.sendFile(pdf);
	} else {
		next();
	}
}

/**
 * Render a system template in the content dir
 */
function sysTemplate(res, path, context, content) {
	let data = renderSysTemplate(path, context, content);
	res.send(data);
}

async function getCustomContext(req, res, dir, url) {
	let cfg = AppConfig.getInstance();
	let file = join(
		cfg.dirProject,
		cfg.options.javascript.dirs.output,
		"server",
		"data-provider.js",
	);
	if (!cfg.isProject) return {};
	if (cfg.isProject && !test("-f", file)) return {};
	// const resolved = require.resolve(file);
	const mw = require(file); // Dynamically load
	return await mw.getAdditionalContext(req, res, dir, url, cfg);
}

async function controllerGeneric(
	req,
	res,
	next,
	contentDir,
	useProjectTemplates,
	prefix,
) {
	let cfg = AppConfig.getInstance();
	let content = new Content();
	let session = SessionVars.getInstance();
	let additionalContext = [];
	let url = req.path.endsWith("/") ? req.path.concat("index.html") : req.path;
	let ext = extname(url).toLowerCase();
	if (prefix.length > 0) {
		// Strip prefix
		url = url.substr(prefix.length);
	}
	url = url.substr(1); // strip leading "/" from URL path
	if (!test("-e", join(contentDir, url))) {
		next();
		return;
	}
	if (prefix == "/sys" && url == "index.html") {
		additionalContext = Object.assign(additionalContext, {
			isProject: false,
			systemPackages: Packages.getPackageReadmeFiles(true),
			projectPackages: Packages.getPackageReadmeFiles(false),
		});
	}
	switch (ext) {
		case ".md":
			let md = renderMarkdownFile(contentDir, url);
			contentDir = join(cfg.dirMain, "content");
			useProjectTemplates = false;
			additionalContext = Object.assign(additionalContext, {
				extractedTitle: md[1],
				rendered: md[0],
			});
			// Render retrieved content in a HTML template, so no break here
			url = "markdown.html";
		case ".html":
			let data = "";
			let entry;
			let context = Content.getDefaultContext(req.url);
			context = Object.assign(context, additionalContext);
			if (ext != ".md" && req.query && req.query.lint) {
				context = Object.assign(context, {
					files: [
						{
							file: url,
							output: Lint.file(
								join(cfg.dirProject, cfg.options.html.dirs.content, url),
								true,
							),
						},
					],
				});
				sysTemplate(res, "lint.html", context, content);
			} else if (url == "todo.html") {
				context = Object.assign(context, searchProject("todo", true));
				sysTemplate(res, "todo.html", context, content);
			} else if (url == "project-overview.html") {
				context = Object.assign(context, { report: generateStats() });
				sysTemplate(res, "project-overview.html", context, content);
			} else {
				let tmp = await getCustomContext(req, res, contentDir, url);
				if (tmp == null) {
					ExpressUtils.logRequest(req, res);
					return;
				}
				context = Object.assign(context, tmp);
				// Prevent browser caching
				let lastModified = date.format(
					new Date(),
					"ddd, DD MMM YYYY hh:mm:00 [GMT]",
				); // Sun, 22 Sep 2019 10:13:00 GMT
				res.set({
					Pragma: "public",
					"Last-Modified": lastModified,
					Expires: "Mon, 26 Jul 1997 05:00:00 GMT",
					"Cache-Control":
						"no-cache, no-store, must-revalidate, post-check=0, pre-check=0, private",
				});
				entry = new FileStatus(contentDir);
				entry.setSource(url, ".html");
				data = content.render(entry.dir, entry.source, {
					additionalContext: context,
					useProjectTemplates: useProjectTemplates,
				});
				if (!data && cfg.options.sys.notifications.compileIssue.html)
					SysUtils.notify("Html issue");
				content.rendered.forEach(file => {
					session.add(ProcessingTypes.html, file);
				});
				res.send(data);
				break;
			}
	}
	next();
}
