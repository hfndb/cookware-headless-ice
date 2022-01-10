import { join } from "path";
import { DefaultConfig } from "./default-settings.mjs";
import { Lint } from "./local/markup.mjs";
import { renderEpub } from "./local/epub.mjs";
import { FileUtils, Logger } from "./lib/index.mjs";
import { AppConfig, AppMenu } from "./lib/config.mjs";
import { Beautify } from "./lib/beautify.mjs";
import { generateJsDocs } from "./local/javascript.mjs";
import { Colors, generateWeb } from "./local/misc.mjs";
import { writeStats } from "./local/overview.mjs";
import { renderPdf } from "./local/pdf.mjs";
import { generateTsDocs } from "./local/typescript.mjs";
import { playGround } from "./dev/playground.mjs";
import { coatRack } from "./server/index.mjs";
import { initWatches } from "./server/watches.mjs";
import { SessionVars } from "./sys/session.mjs";
import { check } from "./sys/upgrades.mjs";

if (!check()) process.exit(0); // Check required binaries

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
	typeLabel: "<path>",
});
am.addOption(am.checkOverridesShortcutC);
am.addOption({
	alias: "d",
	name: "docs",
	type: Boolean,
	description: "Generate API docs for (JavaScript or TypeScript) source files",
});
am.addOption({
	alias: "e",
	name: "epub",
	type: Boolean,
	description: "Convert changed html files to signed ePub",
});
am.addOption({
	alias: "g",
	name: "generate",
	type: Boolean,
	description:
		"Transompile changed js, ts and scss, render changed .html using template engine, generate Google sitemap.",
});
am.addOption(am.initializeNewProjectShortcutI);
am.addOption({
	alias: "l",
	name: "lint",
	type: Boolean,
	description: "Lint html",
});
am.addOption({
	alias: "o",
	name: "overview",
	type: Boolean,
	description: "Write project overview",
});
am.addOption({
	alias: "p",
	name: "pdf",
	type: Boolean,
	description: "Generate pdf's based on changed html",
});
am.addOption({
	alias: "r",
	name: "run",
	type: Boolean,
	description: "Run local development server, watch file changes, transcompile",
});
am.addOption({
	alias: "w",
	name: "watch",
	type: Boolean,
	description: "Start watching and transcompile without running server",
});
am.addOption({
	alias: "t",
	name: "touch",
	type: String,
	description:
		"Touch files recursively, in order to force regeneration of output. Valid types: content, sass, src",
	typeLabel: "<type>",
});
am.addOption({
	name: "write",
	type: Boolean,
	description: "Write default settings to settings-default.json",
});
am.addOption({
	name: "colors",
	type: Boolean,
	description: "Generate color files",
});
am.addOption({
	name: "production",
	type: Boolean,
	description: "Flag to compile and compress for production use",
});
am.addOption(am.playgroundShortcutY);
//am.addOption(am.helpShortcutH);
am.setName("cookware-headless-ice");

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
if (choice.production) {
	process.env.NODE_ENV = "production";
}
if (choice.beautify) {
	Beautify.standAlone(choice.beautify);
} else if (choice.colors) {
	Colors.generate();
} else if (choice.docs && cfg.options.javascript.compiler == "typescript") {
	generateTsDocs();
} else if (choice.docs) {
	generateJsDocs();
} else if (choice.config) {
	AppConfig.showConfig();
} else if (choice.epub) {
	renderEpub();
} else if (choice.generate) {
	generateWeb(true);
	stats = true;
} else if (choice.lint) {
	Lint.content();
} else if (choice.overview) {
	writeStats();
} else if (choice.pdf) {
	renderPdf();
} else if (choice.run) {
	coatRack();
} else if (choice.watch) {
	initWatches();
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
		allowedExtensions: allow,
	});
} else if (choice.playground) {
	playGround();
} else if (choice.write) {
	FileUtils.writeJsonFile(
		DefaultConfig,
		cfg.dirProject,
		"settings-default.json",
	);
}

if (stats) {
	let session = SessionVars.getInstance();
	log.info(session.toString());
}
