import { join } from "path";
import { exec, test } from "shelljs";
import { AppConfig, FileUtils, Logger } from "../lib";

let cfg = AppConfig.getInstance();

export class Tags {
	static filterFlags(): string {
		let allowed = cfg.options.tags.styles[cfg.options.tags.style];
		if (allowed == undefined)
			log.error(`Style ${cfg.options.tags.style} for tags doesn't exist`);
		let tester = new RegExp("\\b(" + allowed.join("|") + ")\\b", "i");

		let projectTags = FileUtils.readFile(join(cfg.dirProject, "tags"));
		let lines = projectTags.split("\n");
		let fileTags = [];

		for (let i = 0; i < lines.length; i++) {
			if (tester.test(lines[i])) fileTags.push(lines[i]);
		}

		return fileTags.join("\n");
	}

	static forProject(dir: string): void {
		if (!cfg.options.tags.active) return;

		if (cfg.options.tags.generator == "exuberant") {
			exec(
				`cd ${
					cfg.dirProject
				}; ctags-exuberant --fields=nksSaf --file-scope=yes -R ./${dir}`,
				{ async: false }
			);

			FileUtils.writeFile(cfg.dirProject, "tags", Tags.filterFlags(), true);
		}
	}

	static forFile(file: string): void {
		if (!cfg.options.tags.active) return;

		let projectTags = FileUtils.readFile(join(cfg.dirProject, "tags"));
		let lines = projectTags.split("\n");
		let fileTags = [];
		let testStr = "./" + file;

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(testStr)) fileTags.push(lines[i]);
		}

		FileUtils.writeFile(
			cfg.dirProject,
			join(".tags", file),
			fileTags.join("\n"),
			false
		);
	}
}
