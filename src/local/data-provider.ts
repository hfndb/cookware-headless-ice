import { basename } from "path";

/**
 * Get some additional data for lib/html, Content.render(), retrieved using Content.getCustomContext()
 */
export function getAdditionalContext(dir: string, file: string, cfg: any): Object {
	cfg;
	dir;

	return {
		epub: `/epub/${basename(file, ".html")}.epub `,
		pdf: `/pdf/${basename(file, ".html")}.pdf `
	};
}
