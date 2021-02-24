"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signFile = void 0;
const shelljs_1 = require("shelljs");
const log_1 = require("./log");
function signFile(file) {
    let log = log_1.Logger.getInstance();
    try {
        shelljs_1.exec(`gpg --clearsign ${file}`, {});
        log.info(`File signed: ${file}`);
        shelljs_1.rm(file);
        shelljs_1.mv(file.concat(".asc"), file);
    }
    catch (err) {
        log.error(`- Failed to sign file ${file}`, log_1.Logger.error2string(err));
    }
}
exports.signFile = signFile;
//# sourceMappingURL=pgp.js.map