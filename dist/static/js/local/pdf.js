"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderPdf = renderPdf;

require("source-map-support/register");

var _path = require("path");

var _shelljs = require("shelljs");

var _lib = require("../lib");

var _files = require("../lib/files");

var _html = require("../lib/html");

var _pgp = require("../lib/pgp");

var _session = require("../sys/session");

var _babel = require("./babel");

var _styling = require("./styling");

function renderPdf() {
  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  if (cfg.options.pdf.firstUpdateWeb) {
    log.info("Checking (and updating) sources and content");
    (0, _babel.compile)(false);

    _styling.SassUtils.compile(false);

    let content = new _html.Content();
    content.renderAll(false);
    log.info("... done");
  }

  let processed = [];

  _lib.FileUtils.mkdir((0, _path.join)(cfg.dirProject, cfg.options.pdf.dirs.output));

  let changeList = (0, _lib.getChangeList)({
    sourcePath: _html.Content.getOutputDir(),
    targetPath: (0, _path.join)(cfg.dirProject, cfg.options.pdf.dirs.output),
    sourceExt: [".html"],
    targetExt: ".pdf",
    excludeList: cfg.options.pdf.rendering.exclude,
    flatten: true
  });
  if (changeList.length == 0) return;
  let saydHello = false;
  changeList.forEach(entry => {
    if (entry.isNewOrModified()) {
      if (!saydHello) {
        saydHello = true;
        log.info("Rendering PDF files");
      }

      renderPdfFile(entry);
    }

    processed.push((0, _path.basename)(entry.target));
  });
  (0, _files.removeObsolete)(cfg.options.pdf.rendering.removeObsolete, processed, (0, _path.join)(cfg.dirProject, cfg.options.pdf.dirs.output), ".pdf");

  if (saydHello) {
    log.info("... PDF done");
  } else {
    log.info("No changes in PDF files found");
  }
}

function renderPdfFile(fileStatus) {
  if (!fileStatus.isNewOrModified()) {
    return true;
  }

  let cfg = _lib.AppConfig.getInstance();

  let log = _lib.Logger.getInstance(cfg.options.logging);

  let retVal = true;

  let session = _session.SessionVars.getInstance();

  let cmd = "wkhtmltopdf -q -s A4 -L ".concat(cfg.options.pdf.rendering.marginLeft.toString()).concat("mm -R ").concat(cfg.options.pdf.rendering.marginRight.toString()).concat('mm --print-media-type --header-right "[page] / [toPage]" ').concat((0, _path.join)(fileStatus.dir, fileStatus.source)).concat(" ").concat((0, _path.join)(fileStatus.targetDir, fileStatus.target));

  try {
    let r = (0, _shelljs.exec)(cmd, {});

    if (r.stderr) {
      log.warn(`- Failed to render file: ${fileStatus.target}`);
      return false;
    }

    log.info(`- File written: ${fileStatus.target}`);
    session.add(_session.ProcessingTypes.pdf, fileStatus.target);

    if (cfg.options.pdf.rendering.sign) {
      (0, _pgp.signFile)((0, _path.join)(cfg.dirProject, fileStatus.target));
    }
  } catch (err) {
    retVal = false;
  }

  return retVal;
}
//# sourceMappingURL=pdf.js.map