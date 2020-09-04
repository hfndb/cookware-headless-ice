"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
function getAdditionalContext(dir, file, cfg) {
    cfg;
    dir;
    return {
        epub: `/epub/${path_1.basename(file, ".html")}.epub `,
        pdf: `/pdf/${path_1.basename(file, ".html")}.pdf `
    };
}
exports.getAdditionalContext = getAdditionalContext;
//# sourceMappingURL=data-provider.js.map