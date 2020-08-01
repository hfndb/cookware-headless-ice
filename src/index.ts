import { join } from "path";
import { Lint } from "./local/markup";
import { renderEpub } from "./local/epub";
import { FileUtils, Logger } from "./lib";
import { AppConfig, AppMenu } from "./lib/config";
import { generateJsDocs } from "./local/javascript";
import { beautify, generateWeb } from "./local/misc";
import { renderPdf } from "./local/pdf";
import { generateTsDocs } from "./local/typescript";
import { playGround } from "./dev/playground";
import { coatRack } from "./server/index";
import { SessionVars } from "./sys/session";

let am = AppMenu.getInstance();

/**
 * Note for software architects and developers:
 *
 * Please read about project philosophy and related ethics in the docs, page "Design goals and roadmap".
 */

// Define menu options
am.addOption({
	alias: "b",
	name: "beautify",
	type: String,
	description:
		"Beautifies html, js, ts or scss file - or all such files in directory",
	typeLabel: "<path>"
});
am.addOption(am.checkOverridesShortcutC);
am.addOption({
	alias: "d",
	name: "docs",
	type: Boolean,
	description: "Generate API docs for (JavaScript or TypeScript) source files"
});
am.addOption({
	alias: "e",
	name: "epub",
	type: Boolean,
	description: "Convert changed html files to signed ePub"
});
am.addOption({
	alias: "g",
	name: "generate",
	type: Boolean,
	description:
		"Transcompile changed js, ts and scss, render changed .html using template engine, \
			generate Google sitemap."
});
am.addOption(am.initializeNewProjectShortcutI);
am.addOption({
	alias: "l",
	name: "lint",
	type: Boolean,
	description: "Lint html"
});
am.addOption({
	alias: "p",
	name: "pdf",
	type: Boolean,
	description: "Generate pdf's based on changed html"
});
am.addOption({
	alias: "r",
	name: "run",
	type: Boolean,
	description: "Run local development server"
});
am.addOption({
	alias: "t",
	name: "touch",
	type: String,
	description:
		"Touch files recursively, in order to force regeneration of output. Valid types: content, sass, src",
	typeLabel: "<type>"
});
am.addOption({
	name: "production",
	type: Boolean,
	description: "Flag to compile and compress for production use"
});
am.addOption(am.playgroundShortcutY);
am.addOption(am.helpShortcutH);

let choice = am.getUserChoice();

if (choice.init) {
	AppConfig.initNewProject();
	process.exit(0);
}

let cfg = AppConfig.getInstance("cookware-headless-ice");
let log = Logger.getInstance(cfg.options.logging);
process.chdir(cfg.dirMain); // Always work from application directory
process.on("uncaughtException", err => {
	if (!log.isShuttingDown) {
		console.log(Logger.error2string(err));
	}
});

let stats = false;
if (choice.beautify) {
	beautify(choice.beautify);
} else if (choice.docs && cfg.options.javascript.compiler == "typescript") {
	generateTsDocs();
} else if (choice.docs) {
	generateJsDocs();
} else if (choice.config) {
	AppConfig.showConfig();
} else if (choice.epub) {
	renderEpub();
} else if (choice.generate) {
	if (choice.production) {
		process.env.NODE_ENV = "production";
	}
	generateWeb(true);
	stats = true;
} else if (choice.lint) {
	Lint.content();
} else if (choice.pdf) {
	renderPdf();
} else if (choice.run) {
	coatRack();
} else if (choice.touch) {
	let allow = [];
	let dir = cfg.options.html.dirs.content;
	switch (choice.touch) {
		case "content":
			allow.push(".html");
			break;

		case "sass":
			dir = cfg.options.sass.dirs.source;
			allow.push(".css", ".sass", ".scss");
			break;

		case "src":
			dir = cfg.options.javascript.dirs.source;
			allow.push(".js", ".ts");
			break;

		default:
			log.error(`Unknown type ${choice.touch}`);
			break;
	}
	FileUtils.touchRecursive(join(cfg.dirProject, dir), {
		allowedExtensions: allow
	});
} else if (choice.playground) {
	playGround();
} else {
	am.showHelp([
		{
			header: "cookware-headless-ice",
			content: "Utility functions"
		},
		{
			header: "Options",
			hide: ["number"],
			optionList: am.options
		},
		{
			content:
				"Project home: {underline https://github.com/hfndb/cookware-headless-ice}"
		}
	]);
}
if (stats) {
	let session = SessionVars.getInstance();
	log.info(session.toString());
}
