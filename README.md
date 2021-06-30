**cookware-headless-ice** is a console based working environment, constructed as a [Node.js](https://en.wikipedia.org/wiki/Node.js) project. Like a chef, you can use this gear to 'cook' your own code for projects. So... in Case Of Emergency (ICE), feeling an itch to write some code, you could use this 'integrated cooking environment' (ice) 😉

For background information like **project philosophy**, see [design goals and roadmap](./docs/design-goals-and-roadmap.md).

The **command line toolbox**
+  transcompiles (changed or new) [Sass](https://en.wikipedia.org/wiki/Sass_%28stylesheet_language%29) files to [CSS](https://en.wikipedia.org/wikiCascading_Style_Sheets),
+  transcompiles (changed or new) [Flow](https://flow.org/) and [TypeScript](https://en.wikipedia.org/wiki/TypeScript) files to [JavaScript](https://en.wikipedia.org/wiki/JavaScript),
+ generates Sass and JavaScript files with definitions of configured colors and looks, the JavaScript for standalone tools colors.html and project.html in./dev/local-tools/,
+ generates [tag files](https://en.wikipedia.org/wiki/Ctags#Tags_file_formats), using [ctags-exuberant](http://ctags.sourceforge.net/) or [universal-ctags](https://ctags.io/) (more details, see [here](./docs/configuration.md)),
+ renders (changed or new) template based HTML-content to static .html disk files,
+ [lints](https://en.wikipedia.org/wiki/Lint_%28software%29) HTML content files,
+ generates a .xml [Google sitemap](https://support.google.com/webmasters/answer/156184?hl=en),
+ generates a date-time stamped project overview (see below),
+ renders (plain or PGP signed) PDF, in the future perhaps also ePub files,
+ generates [API](https://en.wikipedia.org/wiki/Application_programming_interface) documentation for JavaScript and TypeScript files in HTML format,
+ creates automatic backups of changed files, using a time interval.

The **local development server**
+ renders HTML and [Markdown](https://en.wikipedia.org/wiki/Markdown) files on the fly, without caching to disk files,
+ transcompiles (changed or new) Sass, Flow and TypeScript,
+ generates tag files.
+ lints HTML,
+ displays a *system home page*, providing access to:
  - a project *todo list*,
  - a *project overview*, with files, statistics and a count of integrated Node.js packages, and
  + a documentation browser, to project and system README.md files, and README.md files in integrated Node.js packages.

**Other**
+ In the dev/local-tools directory you'll find some tools to play with colors and styles.


This project is developed on a Linux platform and should also run on BSD and Apple platforms. With some additional effort on Windows too 😉 See [contribute](./docs/contribute.md).


## Prerequisites

**Windows boxes**: Look [here](./docs/installation-windows.md) for prerequisites, installation and usage.
Please note that installation in Windows boxes is not tested yet. See [contribute](./docs/contribute.md).

Installation of prerequisites in **Linux and Apple** boxes:
```
apt-get install git gitk nodejs nodejs-doc npm pgpgpg gpgsm kgpg mplayer
```

For PDF file creation, download and install [wkhtmltopdf](http://wkhtmltopdf.org/downloads.html).
Note: Do not use the version delivered by your package manager, since it has less functionality.

For testing and TypeScript convenience, install global packages; might be executed as root user:

```
$ npm install -g jsdoc mocha typescript ts-node dts-gen
```

In case you experience problems while installing global packages, look [here](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).


## Installation

The advised way to install is git cloning or downloading:

```
$ cd /opt
$ git clone https://github.com/hfndb/cookware-headless-ice
$ cd cookware-headless-ice
$ npm install
$ npm build
```

Add an alias like below in your ~/.bashrc, for your convenience:

```
alias cookware=/opt/cookware/bin/starter.sh
```

You might want to change the default configuration. Details about configuration [here](./docs/configuration.md).


## Update

Some packages might complain after some time, that they are outdated. In that case run:


```
npm run-script update # To update package browserlist postcss node-sass

npm run-script rebuild-sass # To only update the sass binary
```

Install missing packages (dependencies), incremental update installed packages if needed:

```
npm run-script update-deps
```


## Usage

+ Start development server:

	```
	$ cookware -r
	```

+ Overview of commands to run another tool:

	```
	$ cookware -h
	```

+ Run tests (JavaScript):

	```
	npm test
	```

+ Run tests (TypeScript, slower):

```
	npm run-script test:ts
```

Detailed usage information [here](./docs/usage.md).


## License

CC BY-NC 4.0, see [license](./LICENSE.md).


## Contribute

More information [here](./docs/contribute.md).


## Bug reports

Please use the github [issues page](https://github.com/hfndb/cookware-headless-ice/issues).


## Integrated packages


Generic:
+ [array-sort](https://www.npmjs.com/package/array-sort)
+ [color](https://www.npmjs.com/package/colors) for colored console output
+ [commander](https://www.npmjs.com/package/commander) for parsing command line options and displaying help
+ [date-and-time](https://www.npmjs.com/package/date-and-time) to format and manipulate dates and times
+ [deep-diff](https://www.npmjs.com/package/deep-diff) to check and display overridden settings in project config.json
+ [fdir](https://www.npmjs.com/package/fdir) to scan directories and files
+ [Mocha](https://www.npmjs.com/package/mocha) and [Chai](https://www.chaijs.com/) for unit testing
+ [n-readlines](https://www.npmjs.com/package/n-readlines) to synchronically read lines from a file, for strictly sequential parsing - [linearizability](https://en.wikipedia.org/wiki/Linearizability)
+ [q-i](https://www.npmjs.com/package/q-i) to display a colored and formatted version of objects with json structure
+ [shelljs](https://www.npmjs.com/package/shelljs) for Linux-like commands, made portable to Windows

CSS:
+ [postcss](https://www.npmjs.com/package/postcss) with [autoprefixer](https://www.npmjs.com/package/autoprefixer) to add vendor-specific prefixes to CSS rules

HTML and Markdown:
+ [htmlcs](https://www.npmjs.com/package/htmlcs) for HTML linting
+ [marked](https://www.npmjs.com/package/marked ) Markdown rendering engine
+ [nunjucks](https://www.npmjs.com/package/nunjucks) HTML template engine - a Mozilla project, heavily inspired by [Jinja2](http://jinja.pocoo.org/)

Sass:
+ [bootstrap-sass v3](https://www.npmjs.com/package/bootstrap-sass) for your convenience, not used in this project
+ [node-sass](https://www.npmjs.com/package/node-sass) transpiler (Sass to CSS)

JavaScript:
[babel](https://www.npmjs.com/package/@babel/core) with [Flow preset](https://www.npmjs.com/package/@babel/preset-flow), [preset-react](https://www.npmjs.com/package/@babel/preset-react) and [TypeScript preset](https://www.npmjs.com/package/@babel/preset-typescript) to transcompile Flow, TypeScript or JavaScript to backwards compatible version of JavaScript
+ [babel-plugin-source-map-support](https://www.npmjs.com/package/babel-plugin-source-map-support) and [source-map-support](https://www.npmjs.com/package/source-map-support) for debugging transcompiled code
+ [browserify](https://www.npmjs.com/package/browserify) with [tinyify](https://www.npmjs.com/package/tinyify) to generate compressed JavaScript browser bundles
(you can, but I don't in view of my method for [compacting files](../docs/philosophical/compacting-files.md))
+ [jsdoc](https://www.npmjs.com/package/jsdoc) with [minami](https://github.com/Nijikokun/minami) template for generating JavaScript API documentation

TypeScript:
+ [ts-node](https://www.npmjs.com/package/ts-node) for live TypeScript execution during debugging
+ [typedoc](https://www.npmjs.com/package/typedoc) for generating TypeScript API documentation
+ [TypeScript](https://www.npmjs.com/package/TypeScript) type checker

Epub:
+ [epub-gen](https://www.npmjs.com/package/epub-gen) to generate ePub files

Code, generic:
+ [prettier](https://www.npmjs.com/package/prettier) for beautifying css, scss, html, JavaScript and TypeScript files

Web:
+ [express](https://www.npmjs.com/package/express) for local development server, with [body-parser](https://www.npmjs.com/package/body-parser) to process POST requests. For sessions [express-session](https://www.npmjs.com/package/express-session) with [memorystore](https://www.npmjs.com/package/memorystore)


## Read more
+ [Design goals and roadmap](./docs/design-goals-and-roadmap.md)
+ [Configuration](./docs/configuration.md)
+ [Usage](./docs/usage.md)
+ [Contribute](./docs/contribute.md)
+ [Tiny budget hosting](./docs/tiny-budget-hosting.md)

### Philosophically, about software architecture
+ [Reference](./docs/design-goals-and-roadmap.md) to debate about strong vs. loose typing. Though rigid or even loose typing (designated types) is not always necessary.
+ [Compacting files](./docs/philosophical/compacting-files.md) as an art

[comment]: <> (No comments here)
