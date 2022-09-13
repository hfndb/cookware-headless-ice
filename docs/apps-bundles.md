# Apps and bundles

Back to [main  page](../README.md).

Not following fashion, `cookware-headless-ice` uses bundles which are composed in a quite specific way, thus reducing bloat which fashion regarding bundlers and packers causes.

## Bundles

An array with JavaScript bundles, merged and compressed for usage in a web browser. Each bundle is defined as follows:

```javascript
// File: dev/bundles.json
[
	{
		"compress": true,
		"copyTo": "/absolute/path/to/bundle.js",
		"header": "dist/static/js/some-file.js",
		"output": "browser/generic.js",
		"removeImports": true,
		"source": ["browser/test-1.js", "browser/test-2.js"]
	}
]
```

Entries:
+ *compress*: Also produce a shrunken, stripped aka compressed version of the bundle.
+ *copyTo*: Optional. Make an extra copy of generated bundle.
+ *header*: Optional. File to include at the top of a generated bundle. Relative to the project root.
+ *output*: Target file relative to the output directory.
+ *removeImports*: Remove all import (and export) statements from bundle.
+ *source*: An array with input files relative to the source directory.
