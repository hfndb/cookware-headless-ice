import { join } from "path";
import { test } from "shelljs";
import { AppConfig } from "./config";
import { FileUtils } from "./files";
import { Logger } from "./log";

/**
 * Get a list of installed packages, excluding those starting with @types
 */
export function getPackages(dir: string): string[] {
	let packages: any = FileUtils.readJsonFile(join(dir, "package.json"), true);
	let pkg: string[] = [];

	for (let key in packages.dependencies) {
		if (!key.startsWith("@types")) pkg.push(key);
	}

	for (let key in packages.devDependencies) {
		if (!key.startsWith("@types")) pkg.push(key);
	}

	return pkg;
}

/**
 * Get a list of README.md files in installed packages
 */
export function getPackageReadmeFiles(sys: boolean): object[] {
	let cfg = AppConfig.getInstance();
	let dir = sys ? cfg.dirMain : cfg.dirProject;
	if (!test("-f", join(dir, "package.json"))) {
		let log = Logger.getInstance();
		log.warn(`No package.json found in directory ${dir}`);
		return []; // Should not occur, since controller filters
	}
	let list = getPackages(dir);
	let mds: object[] = [];
	let pkg: string = "";

	if (!cfg.isProject && !sys) return mds;

	for (let i = 0; i < list.length; i++) {
		pkg = list[i];
		FileUtils.getFileList(join(dir, "node_modules", pkg), {
			allowedExtensions: [".md"],
			recursive: false
		}).forEach(file => {
			if (file.toLowerCase() == "readme.md") {
				mds.push({
					name: pkg,
					file: file
				});
			}
		});
	}

	return mds;
}
