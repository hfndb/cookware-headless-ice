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

If you run `cookware-headless-ice` with the option --sponsor or -s, whatever generic files that are also needed will be added to sponsor.json. And, npm packges which need to be installed or upgraded will be reported to you automatically.


## Procedure

Internal procedure in steps:
+ Send configured files to generic repository
+ Receive configured files from generic repository
+ Compare files in directory src/generic with configured files to send to generic repository and show differences
+ If project names are configured in sponsor.projects, all projects will be fully sponsored in order of appearance
+ Check for other generic files that are needed
+ Check for npm packges which need to be installed or upgraded and report them
