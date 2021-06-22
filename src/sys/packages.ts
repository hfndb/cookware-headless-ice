import { AppConfig } from "../lib//config";
import { Packages } from "../lib/package-json";

let cfg = AppConfig.getInstance("cookware");

Packages.updatePackages(true); // system packages

if (cfg.isProject) {
	Packages.updatePackages(false); // project packages
}
