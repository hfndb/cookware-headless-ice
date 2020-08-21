# Usage

Back to [main  page](../README.md).


## Beautify

Beautifies a html, js, ts or scss file - or all such files in directory

```
$ cookware --beautify ./src
```

Shortcut -b. Beautyfied files will be logged to the console.


## Check

Check overrrides in current project config.json, relative to default settings in config.json from application directory.

Check validity and version number of all known project config.json files. See [config.json](./configuration.md), header "Known projects".

```
$ cookware --config
```

Shortcut -c. A diff of config.json will be logged to the console.


## Docs

```
$ cookware ---docs
```

Shortcut -d. Generate API docs for TypeScript source files


## Epub

Convert changed html files to signed ePub

```
$ cookware --epub
```

Shortcut -e. Not implemented yet. See [roadmap](./design-goals-and-roadmap.md).


## Generate website

```
$ cookware --generate
```

Shortcut -g. Transcompile changed ts and scss, render changed .html using template engine, generate Google sitemap.


## Init

Initalize new project in current working directory

```
$ cookware --init
```

Shortcut -i. This command will copy the default-project to the working directory and create a directory structure as defined in config.json.


## Lint

Lint html in html content directory

```
$ cookware --lint
```

Shortcut -l. Linted files will be logged to a file in your HTML output directory.


## Run

```
$ cookware --run
```

Shortcut -r. Start local development server.

Web requests, changed and transcompiled (source and styling) files will be logged to the console.

Depending on the port set in [config.json](./configuration.md), section "server":
+ http://localhost:8000/ provides access to:
	+ Project HTML
	+ Project README.md and related documentation
+ http://localhost:8000/sys/  provides access to:
	+ Project overview with code statistics
	+ Project todo list
	+ System README.md and related documentation
	+ Docs of some integrated packages


## Touch

```
$ cookware --touch <type>
```

Shortcut -t. Touch files recursively, in order to force regeneration of output.
Valid types: content, sass, src for resp. HTML content, Sass and Flow, JavaScript or TypeScript code.

Example:

```
$ cookware --touch sass
```


## Write default config

```
$ cookware --write
```

Shortcut -w. Write default config settings to config-default.json in project directory


## Playground

```
$ cookware --playground
```

Shortcut -y.  For developement purposes: Play with functionality.
Y for y-incison during autopsy (from Greek for 'seeing with your own eyes')
See file src/dev/playgrond.ts


## Help

```
$ cookware --help
```

Shortcut -h. Outputs all available commands.


## TypeScript debugging using Chrome DevTools

```
$ ./bin/debug-chrome.sh
```

## JavaScript debugging using Node.js built-in debugger

```
$ ./bin/debug-cli.sh
```

[comment]: <> (No comments here)
