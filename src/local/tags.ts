import { join } from "path";
import { exec, test } from "shelljs";
import { AppConfig, FileUtils, Logger } from "../lib";

let cfg = AppConfig.getInstance();

export class Tags {
	static filterFlags(): string {
		let allowed = cfg.options.tags.styles[cfg.options.tags.style];
		if (allowed == undefined)
			log.error(`Style ${cfg.options.tags.style} for tags doesn't exist`);
		let tstAllow = new RegExp("\\b(" + allowed.join("|") + ")\\b", "i");
		let tstIgnore = new RegExp(
			"^(" + cfg.options.tags.ignore.join("|") + ")\\b",
			"i"
		);

		let projectTags = FileUtils.readFile(join(cfg.dirProject, "tags"));
		let lines = projectTags.split("\n");
		let fileTags = [];

		for (let i = 0; i < lines.length; i++) {
			if (!tstAllow.test(lines[i])) continue;
			if (lines[i].startsWith("$")) continue;
			if (cfg.options.tags.ignore.length > 0 && tstIgnore.test(lines[i])) continue;
			fileTags.push(lines[i]);
		}

		return fileTags.join("\n");
	}

	static forProject(dir: string): void {
		return;
		if (!cfg.options.tags.active) return;

		let cmd = "";

		switch (cfg.options.tags.generator) {
			case "exuberant":
				cmd = `ctags-exuberant --fields=nksSaf --file-scope=yes --sort=no  -R ./${dir}`;
				break;
			case "universal":
				cmd = `ctags-universal --fields=nksSaf --file-scope=yes  --sort=no --tag-relative=yes --totals=yes -R ./${dir} &> /dev/null`;
				break;
			default:
				log.error(`Generator ${cfg.options.tags.generator} not supported`);
				return;
		}

		exec(`cd ${cfg.dirProject}; ${cmd}`, { async: false, silent: true });

		// Create backup
		let tags = FileUtils.readFile(join(cfg.dirProject, "tags"));
		FileUtils.writeFile(
			cfg.dirProject,
			join(".tags", "tags-original"),
			tags,
			false
		);

		FileUtils.writeFile(cfg.dirProject, "tags", Tags.filterFlags(), true);
	}

	static forFile(file: string): void {
		if (!cfg.options.tags.active) return;

		let projectTags = FileUtils.readFile(join(cfg.dirProject, "tags"));
		let lines = projectTags.split("\n");
		let fileTags = [];

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(file)) fileTags.push(lines[i]);
		}

		FileUtils.writeFile(
			cfg.dirProject,
			join(".tags", file),
			fileTags.join("\n"),
			false
		);
	}
}
