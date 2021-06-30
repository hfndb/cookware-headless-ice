/**
 * For registration of during session processed files
 */
export enum ProcessingTypes {
	epub = "epub",
	html = "html",
	javascript = "javascript",
	pdf = "pdf",
	php = "php",
	sass = "sass",
	typescript = "typescript"
}

/**
 * Class with session variables, in seperate file to prevent recursive import loop
 */
export class SessionVars {
	epub = new Map();
	html = new Map();
	javascript = new Map();
	php = new Map();
	pdf = new Map();
	sass = new Map();
	typescript = new Map();
	/**
	 * @private
	 */
	static _instance: SessionVars;

	constructor() {
		this.reset();
	}

	/**
	 * Singleton factory to get instance
	 */
	static getInstance() {
		if (!SessionVars._instance) {
			SessionVars._instance = new SessionVars();
		}

		return SessionVars._instance;
	}

	reset(): void {
		function resetMap(mp: Map<string, number>) {
			mp.clear();
			mp.set("all", 0);
		}
		resetMap(this.epub);
		resetMap(this.html);
		resetMap(this.javascript);
		resetMap(this.php);
		resetMap(this.pdf);
		resetMap(this.sass);
		resetMap(this.typescript);
	}

	add(type: ProcessingTypes, file: string, increment: number = 1) {
		let counter: Map<string, number>;
		switch (type) {
			case ProcessingTypes.epub:
				counter = this.epub;
				break;
			case ProcessingTypes.html:
				counter = this.html;
				break;
			case ProcessingTypes.javascript:
				counter = this.javascript;
				break;
			case ProcessingTypes.sass:
				counter = this.sass;
				break;
			case ProcessingTypes.php:
				counter = this.php;
				break;
			case ProcessingTypes.pdf:
				counter = this.pdf;
				break;
			case ProcessingTypes.typescript:
				counter = this.typescript;
				break;
			default:
				throw new Error(`Unknown type: ${type}`);
				return;
		}
		let qty: number = counter.get("all") || 0;
		counter.set("all", qty + increment);

		qty = counter.get(file) || 0;
		if (qty == undefined) {
			qty = 0;
		}
		counter.set(file, qty + increment);
	}

	toString(): string {
		let parent = this;
		let retVal = "";

		function add2retval(mp: Map<string, number>, txt: string) {
			let tmp = parent.getCounter(mp);
			if (tmp[1] > 0) {
				retVal += `${txt.padEnd(15, " ")}: ${tmp[1]}\n`;
			}
		}
		add2retval(this.epub, "ePub");
		add2retval(this.html, "HTML");
		add2retval(this.javascript, "JavaScript");
		add2retval(this.php, "php");
		add2retval(this.pdf, "PDF");
		add2retval(this.sass, "Sass");
		add2retval(this.typescript, "TypeScript");

		return retVal.length > 0
			? "\n"
					.concat("------------------------------------------------\n")
					.concat("Number of changed files during this session:\n")
					.concat(retVal)
					.concat("------------------------------------------------\n")
			: "No changed source files detected during this session";
	}

	private getCounter(counter: Map<any, any>): number[] {
		let all: number = counter.get("all");
		let specific = counter.size == 1 ? 0 : counter.size - 1;

		return [all, specific];
	}
}
