# Apps and bundles

Back to [main  page](../README.md).

## Apps

An array with JavaScript app files for a browser, compressed and with dependencies merged into it from node modules and other source. Each app is defined as follows:

```javascript
// File: dev/apps.json
[
	{
		"output": "browser/app.js",
		"source": "browser/main.js",
		"cleanup": [
			"browser/main.js",
			"browser/snippets"
		]
	}
]
```
'Cleanup' as a list of directories and files to remove after creating the app file.
**Note:** To generate code for production use, set javascript.compress = true in settings.json.


## Bundles

An array with JavaScript bundles, merged and compressed for usage in a web browser. Each bundle is defined as follows:

```javascript
// File: dev/bundles.json
[
	{
		"compress": true,
		"header": "dist/static/js/some-file.js",
		"output": "browser/generic.js",
		"removeImports": true,
		"source": ["browser/test-1.js", "browser/test-2.js"]
	}
]
```
The header file is relative to the project root, 'output' as the target file relative to the output directory, and 'source' as an array with input files relative to the source directory.
