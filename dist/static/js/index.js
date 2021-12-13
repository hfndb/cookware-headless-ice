"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const default_settings_1 = require("./default-settings");
const markup_1 = require("./local/markup");
const epub_1 = require("./local/epub");
const lib_1 = require("./lib");
const config_1 = require("./lib/config");
const beautify_1 = require("./lib/beautify");
const javascript_1 = require("./local/javascript");
const misc_1 = require("./local/misc");
const overview_1 = require("./local/overview");
const pdf_1 = require("./local/pdf");
const typescript_1 = require("./local/typescript");
const playground_1 = require("./dev/playground");
const index_1 = require("./server/index");
const watches_1 = require("./server/watches");
const session_1 = require("./sys/session");
let am = config_1.AppMenu.getInstance();
am.addOption({
    alias: "b",
    name: "beautify",
    type: String,
    description: "Beautifies html, js, ts or scss file - or all such files in directory",
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
    description: "Transompile changed js, ts and scss, render changed .html using template engine, generate Google sitemap."
});
am.addOption(am.initializeNewProjectShortcutI);
am.addOption({
    alias: "l",
    name: "lint",
    type: Boolean,
    description: "Lint html"
});
am.addOption({
    alias: "o",
    name: "overview",
    type: Boolean,
    description: "Write project overview"
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
    description: "Run local development server, watch file changes, transcompile"
});
am.addOption({
    alias: "w",
    name: "watch",
    type: Boolean,
    description: "Start watching and transcompile without running server"
});
am.addOption({
    alias: "t",
    name: "touch",
    type: String,
    description: "Touch files recursively, in order to force regeneration of output. Valid types: content, sass, src",
    typeLabel: "<type>"
});
am.addOption({
    name: "write",
    type: Boolean,
    description: "Write default settings to settings-default.json"
});
am.addOption({
    name: "colors",
    type: Boolean,
    description: "Generate color files"
});
am.addOption({
    name: "production",
    type: Boolean,
    description: "Flag to compile and compress for production use"
});
am.addOption(am.playgroundShortcutY);
am.setName("cookware-headless-ice");
let choice = am.getUserChoice();
if (choice.init) {
    config_1.AppConfig.initNewProject();
    process.exit(0);
}
let cfg = config_1.AppConfig.getInstance("cookware-headless-ice");
let log = lib_1.Logger.getInstance(cfg.options.logging);
process.chdir(cfg.dirMain);
process.on("uncaughtException", err => {
    if (!log.isShuttingDown) {
        console.log(lib_1.Logger.error2string(err));
    }
});
let stats = false;
if (choice.production) {
    process.env.NODE_ENV = "production";
}
if (choice.beautify) {
    beautify_1.Beautify.standAlone(choice.beautify);
}
else if (choice.colors) {
    misc_1.Colors.generate();
}
else if (choice.docs && cfg.options.javascript.compiler == "typescript") {
    typescript_1.generateTsDocs();
}
else if (choice.docs) {
    javascript_1.generateJsDocs();
}
else if (choice.config) {
    config_1.AppConfig.showConfig();
}
else if (choice.epub) {
    epub_1.renderEpub();
}
else if (choice.generate) {
    misc_1.generateWeb(true);
    stats = true;
}
else if (choice.lint) {
    markup_1.Lint.content();
}
else if (choice.overview) {
    overview_1.writeStats();
}
else if (choice.pdf) {
    pdf_1.renderPdf();
}
else if (choice.run) {
    index_1.coatRack();
}
else if (choice.watch) {
    watches_1.initWatches();
}
else if (choice.touch) {
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
    lib_1.FileUtils.touchRecursive(path_1.join(cfg.dirProject, dir), {
        allowedExtensions: allow
    });
}
else if (choice.playground) {
    playground_1.playGround();
}
else if (choice.write) {
    lib_1.FileUtils.writeJsonFile(default_settings_1.DefaultConfig, cfg.dirProject, "settings-default.json");
}
if (stats) {
    let session = session_1.SessionVars.getInstance();
    log.info(session.toString());
}
//# sourceMappingURL=index.js.map