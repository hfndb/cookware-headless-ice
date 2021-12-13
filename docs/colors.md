# Color system

Back to [main  page](../README.md).

Central place for all defined colors in a project. This will automatically be written to a JavaScript or TypeScript file and a sass include.


```javascript
// File: dev/colors.json
{
	"active": false,
	"sass": "_colors.scss",
	"src": "dev/local-tools/js/colors.js",
	"projects": {
		"cookware": [
			"_comment": {
				"comment": "Cookware headless ice"
			}
			"color-body": {
				"hex": "333",
				"comment": "Font color for all body text"
			},
			"bg-code": {
				"hex": "eef",
				"comment": "Background color for the code element"
			},
			"grey-020": {
				"hex": "333"
			},
			"grey-056": {
				"hex": "909090"
			},
			"red-040": {
				"hex": "08c"
			}
		]
	}
}
```

Entries:
+ *sass": Output file in sass source dir with all defined colors
+ *src": Output file in sass JavaScript source dir with all defined colors, relative to project directory
+ *projects": Defined colors per project
+ *projects / * / _comment: Required per project
+ *projects / * / "color name" / hex: Hexadecimal color value without preceeding #
