import { AppConfig, Logger } from "../generic/index.mjs";

/**
 * For development purposes: Play with functionality.
 * Shortcut y in menu for Y-incison during autopsy (from Greek for 'seeing with your own eyes')
 *
 * https://en.wiktionary.org/wiki/autopsy#Etymology
 * https://en.wikipedia.org/wiki/Autopsy#External_examination
 * https://en.wikipedia.org/wiki/Autopsy#Internal_examination
 *
 * Please note that this is NOT a sandbox, but an active way to interact with other parts of code.
 * https://en.wikipedia.org/wiki/Sandbox_(software_development)
 *
 * In this playground you can play with toys from other modules, and if you want move coding results to other modules.
 * You can make it as risky or safe as you want, for internal and/or external examination 😀
 */
export function playGround() {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	log.info("Start playing...");
}
