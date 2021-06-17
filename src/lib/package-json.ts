import { join } from "path";
import { cd, exec, test } from "shelljs";
import { AppConfig } from "./config";
import { FileUtils } from "./files";
import { Logger } from "./log";

/**
 * Get a list of installed packages, excluding those starting with @types
 * Used in UI of dev server
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
 * Used in UI of dev server
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

/**
 * Install missing packages, incremental update installed packages if needed
 */
export function updatePackages(sys: boolean) {
	let cfg = AppConfig.getInstance();
	let dir = sys ? cfg.dirMain : cfg.dirProject;
	let log = Logger.getInstance(cfg.options.logging);
	let update: string[] = [];

	// Switch logging to file off
	cfg.options.logging.transports.file.active = false;

	let file = join(dir, "package.json");
	if (!test("-f", file)) return;

	log.info(`Checking ${sys ? "system" : "project"} packages`);

	let packages: any = FileUtils.readJsonFile(file, true);
	let deps: any = Object.entries(packages.dependencies);

	for (let i = 0; i < deps.length; i++) {
		let key: string = deps[i][0];
		let version: string = deps[i][1];
		let pkgDir = join(dir, "node_modules", key);
		let pkgFile = join(dir, "node_modules", key, "package.json");
		if (version.startsWith("^")) {
			version = version.substring(1);
		}
		let needsAction = false;

		if (!test("-d", pkgDir)) {
			log.info(`Package ${key} not installed yet`);
			needsAction = true;
		} else if (!test("-f", pkgFile)) {
			log.info(`Package ${key} incorrectly installed`);
			needsAction = true;
		}

		if (!needsAction) {
			let pkgInf: any = FileUtils.readJsonFile(pkgFile, true);
			if (!pkgInf.version || pkgInf.version != version) {
				log.info(
					`Package ${key} needs update, version ${pkgInf.version} to ${version}`
				);
				needsAction = true;
			}
		}

		if (needsAction) {
			update.push(`${key}@${version}`);
		}
	}

	if (update.length > 0) {
		cd(dir);
		log.info("Installing updates...");
		exec(`npm install ${update.join(" ")}`, { async: false, silent: false });
		cd(cfg.dirMain); // Reset to default
	}
}
