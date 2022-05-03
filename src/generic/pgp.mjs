"use strict";
import { Logger } from "./log.mjs";
import { exec, mv, rm } from "./sys.mjs";

/**
 * Sign a file with GnuPG
 * Download: https://gnupg.org/download/
 *
 * Signed file can be verified by:
 * gpg --verify <file name>
 *
 * @param file
 */
export function signFile(file) {
	let log = Logger.getInstance();
	try {
		exec(`gpg --clearsign ${file}`, {});
		log.info(`File signed: ${file}`);
		rm(file);
		mv(file.concat(".asc"), file);
	} catch (err) {
		log.error(`- Failed to sign file ${file}`, Logger.error2string(err));
	}
}
