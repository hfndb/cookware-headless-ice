#! /usr/bin/env node
import { dirname, join } from "node:path";
import { AppConfig, FileUtils, Logger } from "../generic/index.mjs";
import { test, SysUtils } from "../generic/sys.mjs";

let cfg, log;

export class Sponsor {
	constructor() {
		cfg = AppConfig.getInstance();
		log = Logger.getInstance();
		let path = join(cfg.dirProject, "dev", "sponsor.json");
		if (!test("-f", path)) {
			log.info(`Config file ${path} doesn't exist'`);
			process.exit(-1);
		}
		this.dirLocal = join(
			cfg.dirProject,
			cfg.options.javascript.dirs.source,
			cfg.options.sponsor.dir.generic,
		);
		this.pathRepository = join(
			cfg.options.sponsor.dir.remote,
			cfg.options.sponsor.fileRemote,
		);
		this.project = FileUtils.readJsonFile(path);
	}

	/**
	 * Main routine
	 */
	static main() {
		let config,
			idx,
			s = new Sponsor(),
			path,
			project;

		if (cfg.options.sponsor.projects.length == 0) {
			s.outgoing();
			s.incoming();
			s.compare();
			return;
		}

		let reg = s.getRegistry();
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
			s.project = FileUtils.readJsonFile(path);

			s.dirLocal = join(
				reg[project].dir,
				config?.javascript?.dirs?.source || cfg.defaults.javascript.dirs.source,
				config?.sponsor?.dir?.generic || cfg.defaults.sponsor.dir.generic,
			);

			console.log(`Sponsoring project ${project}`);
			s.outgoing();
			s.incoming();
			s.compare();
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
		return test("-f", this.pathRepository)
			? FileUtils.readJsonFile(this.pathRepository)
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
		//SysUtils.execBashCmd(`chmod +x ${scrpt}; ${scrpt}; rm ${scrpt}`);
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
	 */
	incoming() {
		let dir = join(cfg.options.sponsor.dir.remote, "generic");
		this.cp(dir, this.dirLocal, this.project.files.in);
		if (this.project.hooks.afterIn) {
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
		FileUtils.writeJsonFile(reg, "", this.pathRepository, false);
	}
}
