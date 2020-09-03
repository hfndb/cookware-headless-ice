"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAdditionalContext = getAdditionalContext;

require("source-map-support/register");

var _path = require("path");

function getAdditionalContext(dir, file, cfg) {
  cfg;
  dir;
  return {
    epub: `/epub/${(0, _path.basename)(file, ".html")}.epub `,
    pdf: `/pdf/${(0, _path.basename)(file, ".html")}.pdf `
  };
}
//# sourceMappingURL=data-provider.js.map