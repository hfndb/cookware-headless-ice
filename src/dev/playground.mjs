import { AppConfig, Logger } from "../generic/index.mjs";

/**
 * For development purposes: Play with functionality.
 */
export async function playGround() {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	log.info("Start playing...");
}
