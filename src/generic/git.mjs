#! /usr/bin/env node
import { join } from "node:path";
import { AppConfig, FileUtils, Logger } from "./index.mjs";
import { exec, test } from "./sys.mjs";
import { Formatter } from "./utils.mjs";

/**
 * Manage local git repository in current (project) directory
 */

let dry = false;

/**
 * Structure of a commit entry in tools/commits.json
 *
 * @property {string[]} files
 */
class GitCommit {
	hash;
	hashParent;
	authorName;
	authorEmail;
	when;
	title;
	body;
	/**
	 * @type {string[]} files
	 */
	files;

	/**
	 * @param {string} entry
	 */
	constructor(entry) {
		let lst = entry.split("|");
		this.hash = lst[0];
		this.hashParent = lst[1];
		this.authorName = lst[2];
		this.authorEmail = lst[3];
		this.when = new Date(lst[4]);
		this.title = lst[5];
		this.body = lst[6];
		this.files = [];
	}
}

/**
 * Manage
 */
export class Git {
	cmts;
	file;

	/**
	 * @param {string} file
	 */
	constructor(file = "") {
		this.file = file;
		this.json = join("tools", "git", `commits${file ? "-" + file : ""}.json`);
		let cfg = AppConfig.getInstance();
		let dataFile = join(cfg.dirProject, this.json);
		if (!test("-d", join(cfg.dirProject, ".git"))) {
			let log = Logger.getInstance();
			log.warn(`No git directory found, exiting`);
			process.exit(-1);
		}
		this.cmts = test("-f", dataFile) ? FileUtils.readJsonFile(dataFile) : [];
		for (let i = 0; i < this.cmts.length; i++) {
			this.cmts[i].when = new Date(this.cmts[i].when); // Comes in as a string
		}
	}

	/**
	 * List commits
	 *
	 * @param {string} file
	 * @todo Paramater could use editing to make ./file.mjs match with file.mjs in .json
	 */
	list(file = "") {
		let item;
		let frmt = new Formatter();
		for (let i = 0; i < this.cmts.length; i++) {
			item = this.cmts[i];
			if (file && !item.files.includes(file)) continue;
			console.log(
				item.hash.padEnd(42, " "),
				frmt.datetime(item.when).padEnd(20, " "),
				item.authorName.substring(0, 18).padEnd(20, " "),
				item.title,
			);
		}
	}

	/**
	 * Read commits for project
	 *
	 * @see https://git-scm.com/docs/git-log#_pretty_formats
	 */
	readCommits() {
		let cfg = AppConfig.getInstance();
		let lastRead;
		if (this.cmts.length > 0) {
			lastRead = this.cmts[this.cmts.length - 1].when;
		}

		//-----------------------------
		// Add commits not read yet
		//-----------------------------
		let fields = [
			"%H", // hash
			"%P", // parent hash
			"%an", // author name
			"%ae", // author email
			"%aI", // author date, strict ISO 8601 format, %ai same but not strict
			"%s", // subject
			"%b", // body
		].join("|");
		let cmd = `git log --pretty=format:"||${fields}||" ${this.file}`;
		let output = exec(cmd, { async: false, silent: true }).stdout;
		if (!output) return;

		// Convert output to array, first commit in top position
		let lst = output.split("\n").reverse();

		// Loop and process
		for (let i = 0; i < lst.length; i++) {
			let line = lst[i];
			// Check for prefix and suffix. Should not be multiline
			if (!line.startsWith("||") || !line.endsWith("||")) {
				console.log(`Line not as expected: `, line);
				return;
			}
			line = line.substring(2, line.length - 3); // Remove prefix and suffix
			let entry = new GitCommit(line);
			if (lastRead && lastRead >= entry.when) continue;
			lastRead = entry.when;
			this.cmts.push(entry);
		}

		let log = Logger.getInstance();
		log.info(`New count of commits: ${this.cmts.length}`);

		if (this.file) {
			FileUtils.writeJsonFile(this.cmts, cfg.dirProject, this.json);
			return;
		}

		//-----------------------------
		// Add files changed by commits
		//-----------------------------
		cmd = `git log --pretty=format:"||%H||"  --stat`;
		output = exec(cmd, { async: false, silent: true }).stdout;
		if (!output) return;

		// Convert output to array, last commit in top position
		let idx, ignore, parts;
		lst = output.split("\n");
		for (let i = 0; i < lst.length; i++) {
			let line = lst[i];

			if (line.startsWith("||") && line.endsWith("||")) {
				// Hash found
				line = line.substring(2, line.length - 2); // Remove prefix and suffix
				idx = this.cmts.findIndex(el => el.hash == line);
				ignore = this.cmts[idx].files.length > 0;
			} else if (!ignore && line.includes("|")) {
				// File found, before |
				parts = line.split("|");
				this.cmts[idx].files.push(parts[0].trim());
			} else {
				// Blank line or summary before blank line
				continue;
			}
		}

		FileUtils.writeJsonFile(this.cmts, cfg.dirProject, this.json);
	}

	/**
	 * Show some details about a commit and write a .diff file
	 *
	 * @param {string} hash
	 */
	show(hash) {
		let cfg = AppConfig.getInstance();
		let idx = this.cmts.findIndex(el => el.hash == hash);
		let item = this.cmts[idx];
		let output = join("tools", "git", `project.diff`);

		console.log(item);

		exec(`git show ${hash} > ${join(cfg.dirProject, output)}`, {
			async: false,
			silent: true,
		});
		console.log(`\nDiff written to ${output}\n`);
	}
}
