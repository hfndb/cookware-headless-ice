import { join } from "path";
import shelljs from "shelljs";
import {
	getChangeList,
	AppConfig,
	FileStatus,
	FileUtils,
	Logger,
} from "../lib/index.mjs";
import typedoc from "typedoc";
import { removeObsolete } from "../lib/files.mjs";
import { ProcessingTypes, SessionVars } from "../sys/session.mjs";
import { JavascriptUtils } from "./javascript.mjs";
const { cp, exec, rm, test } = shelljs;

/**
 * @todo Perhaps compileTypeScript() and watchTypeScript() are obsolete. Why the f*ck use this memory and processortime slurping compiler while watching or (re)building a project? Whatever may be, at the present this file isn't used.
 */
/**
 * Compile changed or new TypeScript files, using the configuration in tsconfig.json
 *
 * @todo use Typescript compiler API?
 * https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 * https://blog.scottlogic.com/2017/05/02/typescript-compiler-api-revisited.html
 */
export function compileTypeScript() {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let session = SessionVars.getInstance();
	let changeList = getChangeList({
		sourcePath: join(cfg.dirProject, cfg.options.javascript.dirs.source),
		targetPath: join(cfg.dirProject, cfg.options.javascript.dirs.output),
		sourceExt: [".ts"],
		targetExt: ".js",
	});
	let processed = [];
	// Before removing obsolete JavaScript, look at plain js that belongs in output directory
	FileUtils.getFileList(
		join(cfg.dirProject, cfg.options.javascript.dirs.source),
		{
			allowedExtensions: [".js"],
		},
	).forEach(file => {
		let path = join(cfg.dirProject, cfg.options.javascript.dirs.output, file);
		if (!test("-f", path)) {
			cp(join(cfg.dirProject, cfg.options.javascript.dirs.source, file), path);
		}
		processed.push(join(cfg.options.javascript.dirs.output, file));
	});
	if (!FileStatus.containsChange(changeList)) {
		log.info("No changes in TypeScript files found");
		return;
	}
	// TypeScript compiler options:
	// https://www.typescriptlang.org/docs/handbook/compiler-options.html
	// http://json.schemastore.org/tsconfig
	changeList.forEach(entry => {
		processed.push(entry.target);
		session.add(ProcessingTypes.typescript, entry.source);
	});
	log.info("Transcompiling Typescript");
	try {
		exec(`cd ${cfg.dirProject}; tsc -b`, { async: true });
		JavascriptUtils.bundle().forEach(file => {
			processed.push(file);
		});
		removeObsolete(
			cfg.options.javascript.removeObsolete,
			processed,
			join(cfg.dirProject, cfg.options.javascript.dirs.output),
			".js",
		);
	} catch (err) {
		log.error(`- Transcompile failed: `, Logger.error2string(err));
	}
	log.info("... Typescript transcompiled");
}

export function watchTypeScript() {
	let cfg = AppConfig.getInstance();
	let log = Logger.getInstance(cfg.options.logging);
	let blockOutput = true;
	let timeOut = setTimeout(() => {
		blockOutput = false;
		clearTimeout(timeOut);
	}, 1 * 60 * 1000);
	exec(`cd ${cfg.dirProject}; tsc -b -w`, function(code, stdout, stderr) {
		if (blockOutput) return;
		if (code != 0) {
			log.error("Exit code:", code);
		}
		if (stdout) {
			log.info("Program output:", stdout);
		}
		if (stderr) {
			log.error("Program stderr:", stderr);
		}
	});
}

/**
 * Generate HTML formatted docs from TypeScript sources in src.
 * Uses configuration in settings.json
 *
 * @todo plugin for markdown output? https://github.com/tgreyuk/typedoc-plugin-markdown
 */
export function generateTsDocs() {
	// Create or clean output directory
	let cfg = AppConfig.getInstance();
	let dir = join(cfg.dirProject, cfg.options.dependencies.typedoc.output);
	let log = Logger.getInstance(cfg.options.logging);
	if (!dir) {
		log.error("Output dir for typedoc not found in settings.json");
		return;
	}
	if (test("-d", dir)) {
		rm("-rf", join(dir, "*"));
	} else {
		FileUtils.mkdir(dir);
	}
	let options = cfg.options.dependencies.typedoc.config;
	Object.assign(options, {
		tsconfig: "tsconfig.json",
	});
	try {
		const app = new typedoc.Application(options);
		const src = app.expandInputFiles([join(cfg.dirProject, "src")]);
		log.info(`Generating API docs of TypeScript files, in ${dir}`);
		// log.info("Might generate an error, see https://github.com/TypeStrong/typedoc/issues/438");
		// log.info(
		// 	"Fixed by commit, see https://github.com/true-myth/true-myth/commit/7836c259722a916b34c5be8a7218bd8b8a44c6cf:"
		// );
		app.generateDocs(src, dir);
		// app.generateJson(src, json);
		if (app.logger.hasErrors()) {
			log.error("There were errors generating TypeDoc output, see above.");
		}
	} catch (err) {
		log.error(
			"Failed to generate load TypeDoc project.",
			Logger.error2string(err),
		);
	}
}
