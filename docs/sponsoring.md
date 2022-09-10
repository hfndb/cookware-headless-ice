# Sponsoring

`cookware-headless-ice` is equipped with functionality to sponsor source code to and from a generic repository, thus enabling you to use the same source files in various projects.


## Configuration

In your project settings.json you need to [configure](./configuration.md) the full directory path to a generic repository.

In your project directory, subdirectory dev, you put a file sponsor.json with the following structure:

```json
{
	"hooks": {
		"afterIn": ""
	},
	"name": "cookware-headless-ice",
	"files": {
		"in" : [],
		"out" : [
			"config.mjs",
			"file-system"
		]
	}
}
```

As you can see, the directory name file-system will result in copying all files in that directory to the generic repository.


## Procedure

Internal procedure in steps:
+ Send configured files to generic repository
+ Receive configured files to generic repository
+ Compare files in directory src/generic with configured files to send to generic repository and show differences
