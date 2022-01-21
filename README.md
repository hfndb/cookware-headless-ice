**cookware-headless-ice** is a console based working environment, constructed as a [Node.js](https://en.wikipedia.org/wiki/Node.js) project. Like a chef, you can use this gear to 'cook' your own code for projects. So... in Case Of Emergency (ICE), feeling an itch to write some code, you could use this 'integrated cooking environment' (ice) 😉

For background information like **project philosophy**, see [design goals and roadmap](./docs/design-goals-and-roadmap.md).

The **command line toolbox**
+  transcompiles (changed or new) [Sass](https://en.wikipedia.org/wiki/Sass_%28stylesheet_language%29) files to [CSS](https://en.wikipedia.org/wikiCascading_Style_Sheets),
+  transcompiles (changed or new) [Flow](https://flow.org/), [JavaScript](https://en.wikipedia.org/wiki/JavaScript) (.js) and [TypeScript](https://en.wikipedia.org/wiki/TypeScript) (.ts, .cts, .mts) files to [CommonJS](https://en.wikipedia.org/wiki/CommonJS) (.js)
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
+ beautifies (changed) Sass, Flow, TypeScript and PHP,
+ transcompiles (changed or new) Sass, Flow and TypeScript,
s+ generates tag files,
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

Installation of prerequisites in **Linux and Apple** boxes, use a package manager as you like:

```bash
# Source control, encryption, mp3 player
$ apt-get install git gitk pgpgpg gpgsm kgpg mplayer yui-compressor

# Make sure you always have the latest Node.js version
$ cd /tmp
$ wget https://deb.nodesource.com/setup_current.x
$ FILE=./setup_current.x
$ chmod +x $FILE
$ sudo $FILE
$ rm $FILE
$ sudo apt-get install -y nodejs # Including npm

# Global node package(s) for convenience
$ sudo npm install -g dts-gen jsdoc mocha typescript ts-node zx
```

In case you don't want to install npm packages as root user, look [here](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

For PDF file creation, download and install [wkhtmltopdf](http://wkhtmltopdf.org/downloads.html).
Note: Do not use the version delivered by your package manager, since it has less functionality.


## Installation

The advised way to install is git cloning or downloading:

```bash
$ cd /opt
$ git clone https://github.com/hfndb/cookware-headless-ice
$ cd cookware-headless-ice
$ npm install
$ npm build
```

Add an alias like below in your ~/.bashrc, for your convenience:

```bash
alias cookware=/opt/cookware/bin/starter.sh
```

You might want to change the default configuration. Details about configuration [here](./docs/configuration.md).

For installation of a binary sass transcompiler, see the [releases page](https://github.com/sass/dart-sass/releases/) for an URL. Then downlad and install the version you want like this:

```bash
$ cd /tmp
$ wget [url to file]
$ tar -xf [downloaded .tar.gz file]
$ cd -
$ mv /tmp/dart-sass/sass ./bin/
```

## Update

Some packages might complain after some time, that they are outdated. In that case run:


```bash
$ npm run-script update # To update package browserlist postcss
```

Install missing packages (dependencies), incremental update installed packages if needed:

```bash
$ npm run-script update-deps
```

+ [Node-sass](https://www.npmjs.com/package/node-sass) is replaced by Dart Sass. See above for installation of the binary.
+ If you want to use Yahoo [yui-compressor](https://yui.github.io/yuicompressor/) for CSS and JavaScript stripping aka campacting aka compression, that needs to be intalled. See above.


## Usage

+ Start development server:

	```bash
	$ cookware -r
	```

+ Overview of commands to run another tool:

	```bash
	$ cookware -h
	```

+ Run tests:

	```bash
	$ npm test
	```

Detailed usage information [here](./docs/usage.md).


## License

CC BY-NC 4.0, see [license](./LICENSE.md).


## Contribute

More information [here](./docs/contribute.md).


## Versions

I prefer [rolling releases](https://en.wikipedia.org/wiki/Rolling_release) above typical [version numbering](https://en.wikipedia.org/wiki/Software_versioning). However... version numbers can mark milestones:

+ **Version 1.0.0** was about experimenting with [TypeScript](https://en.wikipedia.org/wiki/TypeScript). My first and last experiment with that language 😀

+ (Current) **version 1.0.1** was introduced after transforming this project from TypeScript (.ts) to pure [JavaScript](https://en.wikipedia.org/wiki/JavaScript) JavaScript (.mjs) as 'ES modules'. More about that in [Used languages](./docs/languages.md).


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
+ [@parcel/css](https://www.npmjs.com/package/@parcel/css) for compression
+ [postcss](https://www.npmjs.com/package/postcss) with [autoprefixer](https://www.npmjs.com/package/autoprefixer) to add vendor-specific prefixes to CSS rules

HTML and Markdown:
+ [htmlcs](https://www.npmjs.com/package/htmlcs) for HTML linting
+ [marked](https://www.npmjs.com/package/marked ) Markdown rendering engine
+ [nunjucks](https://www.npmjs.com/package/nunjucks) HTML template engine - a Mozilla project, heavily inspired by [Jinja2](http://jinja.pocoo.org/)

JavaScript:
[babel](https://www.npmjs.com/package/@babel/core) with [Flow preset](https://www.npmjs.com/package/@babel/preset-flow), [preset-react](https://www.npmjs.com/package/@babel/preset-react) and [TypeScript preset](https://www.npmjs.com/package/@babel/preset-typescript) to transcompile Flow, TypeScript or JavaScript to backwards compatible version of JavaScript
+ [babel-plugin-source-map-support](https://www.npmjs.com/package/babel-plugin-source-map-support) and [source-map-support](https://www.npmjs.com/package/source-map-support) for debugging transcompiled code
+ [browserify](https://www.npmjs.com/package/browserify) with [tinyify](https://www.npmjs.com/package/tinyify) to generate compressed JavaScript browser bundles
(you can, but I don't in view of my method for [compacting files](../docs/philosophical/compacting-files.md))
+ [jsdoc](https://www.npmjs.com/package/jsdoc) with [minami](https://github.com/Nijikokun/minami) template for generating JavaScript API documentation

TypeScript:
+ [ts-node](https://www.npmjs.com/package/ts-node) for live TypeScript execution during debugging
+ [typedoc](https://www.npmjs.com/package/typedoc) for generating TypeScript API documentation

Epub:
+ [epub-gen](https://www.npmjs.com/package/epub-gen) to generate ePub files

Code, generic:
+ [prettier](https://www.npmjs.com/package/prettier) and [@prettier/plugin-php](https://www.npmjs.com/package/@prettier/plugin-php) for beautifying css, scss, html, JavaScript, TypeScript and PHP files

Web:
+ [express](https://www.npmjs.com/package/express) for local development server, with [body-parser](https://www.npmjs.com/package/body-parser) to process POST requests. For sessions [express-session](https://www.npmjs.com/package/express-session) with [memorystore](https://www.npmjs.com/package/memorystore)


## Read more
+ [Design goals and roadmap](./docs/design-goals-and-roadmap.md)
+ [Configuration](./docs/configuration.md)
+ [Used languages](./docs/languages.md)
+ [Usage](./docs/usage.md)
+ [Contribute](./docs/contribute.md)
+ [Tiny budget hosting](./docs/tiny-budget-hosting.md)


### Philosophically, about software architecture
+ [Reference](./docs/design-goals-and-roadmap.md) to debate about strong vs. loose typing. Though rigid or even loose typing (designated types) is not always necessary.
+ [Compacting files](./docs/philosophical/compacting-files.md) as an art


[comment]: <> (No comments here)
