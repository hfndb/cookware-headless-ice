"use strict";

require("source-map-support/register");

var _path = require("path");

var _defaultSettings = require("./default-settings");

var _markup = require("./local/markup");

var _epub = require("./local/epub");

var _lib = require("./lib");

var _config = require("./lib/config");

var _beautify = require("./lib/beautify");

var _javascript = require("./local/javascript");

var _misc = require("./local/misc");

var _overview = require("./local/overview");

var _pdf = require("./local/pdf");

var _typescript = require("./local/typescript");

var _playground = require("./dev/playground");

var _index = require("./server/index");

var _watches = require("./server/watches");

var _session = require("./sys/session");

let am = _config.AppMenu.getInstance();

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
  _config.AppConfig.initNewProject();

  process.exit(0);
}

let cfg = _config.AppConfig.getInstance("cookware-headless-ice");

let log = _lib.Logger.getInstance(cfg.options.logging);

process.chdir(cfg.dirMain);
process.on("uncaughtException", err => {
  if (!log.isShuttingDown) {
    console.log(_lib.Logger.error2string(err));
  }
});
let stats = false;

if (choice.production) {
  process.env.NODE_ENV = "production";
}

if (choice.beautify) {
  _beautify.Beautify.standAlone(choice.beautify);
} else if (choice.colors) {
  (0, _misc.generateColorFiles)();
} else if (choice.docs && cfg.options.javascript.compiler == "typescript") {
  (0, _typescript.generateTsDocs)();
} else if (choice.docs) {
  (0, _javascript.generateJsDocs)();
} else if (choice.config) {
  _config.AppConfig.showConfig();
} else if (choice.epub) {
  (0, _epub.renderEpub)();
} else if (choice.generate) {
  (0, _misc.generateWeb)(true);
  stats = true;
} else if (choice.lint) {
  _markup.Lint.content();
} else if (choice.overview) {
  (0, _overview.writeStats)();
} else if (choice.pdf) {
  (0, _pdf.renderPdf)();
} else if (choice.run) {
  (0, _index.coatRack)();
} else if (choice.watch) {
  (0, _watches.initWatches)();
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

  _lib.FileUtils.touchRecursive((0, _path.join)(cfg.dirProject, dir), {
    allowedExtensions: allow
  });
} else if (choice.playground) {
  (0, _playground.playGround)();
} else if (choice.write) {
  _lib.FileUtils.writeJsonFile(_defaultSettings.DefaultConfig, cfg.dirProject, "settings-default.json");
}

if (stats) {
  let session = _session.SessionVars.getInstance();

  log.info(session.toString());
}
//# sourceMappingURL=index.js.map