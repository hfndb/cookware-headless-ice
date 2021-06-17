import { AppConfig } from "../lib//config";
import { updatePackages } from "../lib/package-json";

let cfg = AppConfig.getInstance("cookware");

updatePackages(true); // system packages

if (cfg.isProject) {
	updatePackages(false); // project packages
}
