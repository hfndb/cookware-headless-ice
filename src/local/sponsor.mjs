"use strict";
import { dirname, join } from "node:path";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { cd, test, SysUtils } from "../generic/sys.mjs";
import { Requires } from "./requires.mjs";

let cfg, log;

export class Sponsor {
	constructor() {
		cfg = AppConfig.getInstance();
		log = Logger.getInstance();
		this.dirLocal = join(
			cfg.dirProject,
			cfg.options.javascript.dirs.source,
			cfg.options.sponsor.dir.generic,
		);
		this.path2sponsor = join(cfg.dirProject, "dev", "sponsor.json");
		this.path2repository = join(
			cfg.options.sponsor.dir.remote,
			cfg.options.sponsor.file.repository,
		);
		if (!test("-f", this.path2sponsor)) {
			log.info(`Config file ${this.path2sponsor} doesn't exist'`);
			process.exit(-1);
		}
		this.project = FileUtils.readJsonFile(this.path2sponsor);
	}

	/**
	 * Main routine
	 */
	static main() {
		let config,
			idx,
			path,
			project,
			rqrs,
			spnsr = new Sponsor();

		if (cfg.options.sponsor.projects.length == 0) {
			spnsr.sponsorProject();
			return;
		}

		let reg = spnsr.getRegistry();
		for (let i = 0; i < cfg.options.sponsor.projects.length; i++) {
			project = cfg.options.sponsor.projects[i];
			if (!reg[project]) {
				log.info(`Couldn't find project ${project}`);
				process.exit(-1);
			}

			// Read project config
			config = FileUtils.readJsonFile(
				join(reg[project].dir, "settings.json"),
				false,
			);
			path = join(reg[project].dir, "dev", "sponsor.json");
			if (!test("-f", path)) {
				log.info(`Config file ${path} doesn't exist'`);
				process.exit(-1);
			}

			// Alter some config settings
			cfg.dirProject = reg[project].dir;
			if (config?.javascript?.dirs?.source) {
				cfg.options.javascript.dirs.source = config.javascript.dirs.source;
			}
			if (config?.sponsor?.dir?.generic) {
				cfg.options.sponsor.dir.generic = config.sponsor.dir.generic;
			}

			console.log(`Sponsoring project ${project}`);
			spnsr = new Sponsor();
			spnsr.sponsorProject();
			console.log();
		}
	}

	/**
	 * @private
	 * Get directory names to ignore
	 */
	getDirs() {
		let item,
			rt = [];

		for (let i = 0; i < this.project.files.in.length; i++) {
			item = this.project.files.in[i];
			let isDir = test("-d", join(this.dirLocal, item));
			if (isDir) rt.push(item);
		}

		for (let i = 0; i < this.project.files.out.length; i++) {
			item = this.project.files.out[i];
			let isDir = test("-d", join(this.dirLocal, item));
			if (isDir) rt.push(item);
		}

		return rt;
	}

	/**
	 * @private
	 */
	getRegistry() {
		return test("-f", this.path2repository)
			? FileUtils.readJsonFile(this.path2repository)
			: {};
	}

	/**
	 * @private
	 * @param {string} dirSrc
	 * @param {string} dirTar
	 * @param {string[]} lst
	 */
	cp(dirSrc, dirTar, lst) {
		let cmd = `#!/bin/bash

cd ${cfg.dirProject}\n`;
		for (let i = 0; i < lst.length; i++) {
			let pths = {
				src: join(dirSrc, lst[i]),
				tar: join(dirTar, lst[i]),
			};
			let isDir = test("-d", pths.src);
			if (isDir) {
				FileUtils.mkdir(pths.tar);
			} else {
				FileUtils.mkdir(dirname(pths.tar));
			}
			let sf = {
				src: isDir ? "/*" : "",
				tar: isDir ? "/" : "",
			};
			cmd += `cp -aruv ${pths.src}${sf.src} ${pths.tar}${sf.tar}\n`;
		}

		// One shell script is faster than multiple child processes
		let scrpt = "sponsor.sh";
		FileUtils.writeFile("/tmp", scrpt, cmd, false);
		scrpt = `/tmp/${scrpt}`;
		SysUtils.execBashCmd(`chmod +x ${scrpt}; ${scrpt}; rm ${scrpt}`);
	}

	/**
	 * Compare local files with files to send outgoing
	 */
	compare() {
		let dirs = this.getDirs(),
			saydHello = false,
			sources = FileUtils.getFileList(this.dirLocal, {
				allowedExtensions: [".ts", ".cts", ".mts", ".js", ".cjs", ".mjs"],
			});

		let output = msg => {
			if (!saydHello) {
				saydHello = true;
				console.log("Not configured to send out:");
			}
			console.log(msg);
		};

		let canSkip, src;
		for (let i = 0; i < sources.length; i++) {
			src = sources[i].replace(this.dirLocal, "");
			canSkip = dirs.reduce((acc, el) => {
				if (src.startsWith(el)) acc = true;
				return acc;
			}, false);
			if (
				!canSkip &&
				!this.project.files.in.includes(src) &&
				!this.project.files.out.includes(src)
			) {
				output(`${src}`);
			}
		}
	}

	/**
	 * Get required files from respository
	 *
	 * @param (boolean) firstRun
	 */
	incoming(firstRun = true) {
		let dir = join(cfg.options.sponsor.dir.remote, "generic");
		this.cp(dir, this.dirLocal, this.project.files.in);
		if (firstRun && this.project.hooks.afterIn) {
			SysUtils.execBashCmd(this.project.hooks.afterIn);
		}
	}

	/**
	 * Send required files to respository
	 */
	outgoing() {
		let dir = join(cfg.options.sponsor.dir.remote, "generic");
		this.cp(this.dirLocal, dir, this.project.files.out);

		let reg = this.getRegistry();
		reg[this.project.name] = {
			dir: cfg.dirProject,
			files: this.project.files.out,
		};
		FileUtils.writeJsonFile(reg, "", this.path2repository, false);
	}

	/**
	 * Sponsoring procedure per project
	 */
	sponsorProject() {
		this.outgoing(); // Copy files to repositoriy
		this.incoming(); // Copy files from repositoriy
		this.compare(); // See which files aren't configured to copy to repositoriy

		// Look at what generic files need
		let rqrs = new Requires(cfg.dirProject, this.project.files.out);
		rqrs.updateList();

		// Need anything else from repositoriy?
		let an = rqrs.getNeeds(
			FileUtils.expandFileList(
				join(cfg.options.sponsor.dir.remote, "generic"),
				this.project.files.in,
			),
		);
		if (an.generic.length > 0) {
			// Add to incoming and overwrite
			this.project.files.in.push(...an.generic);
			FileUtils.writeJsonFile(this.project, "", this.path2sponsor, false);
			// Copy from repositoriy
			this.project.files.in = an.generic;
			//this.incoming(false);
		}

		// Need to get npm packages?
		let cmd = an.getNpmInstall();
		if (cfg.options.sponsor.autoRunNpm) {
			console.log("\nInstalling packages...");
			cd(cfg.dirProject);
			SysUtils.execBashCmd(cmd);
			cd(cfg.dirMain); // Reset to default
		} else if (cmd) {
			console.log("\nRun command:\n%s", cmd);
		}
	}
}
