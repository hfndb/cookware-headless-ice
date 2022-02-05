# Configuration

Back to [main  page](../README.md).

As described in the [design goals and roadmap](./design-goals-and-roadmap.md), the plan was to build a toolbox with one configuration file. Apart from the TypeScript configuration file (see heading TypeScript on this page, about type checking), it succeeded.

## Settings.json

All configuration options are set in the file settings.json. For your convenience, you can generate a settings-org.json file. In case you mess up, you can always revert.

As a **general rule** all directory paths in config.json are relative to the project root. Other .json configuration files, for dev purposes only, are kept in the dev directory.
+ See [Colors](./colors.md) for project-specifically defined colors, to be auto-generated in .js and .sass.
+ See [Apps and bundles](./apps-bundles.md) for project-specific JavaScript apps and bundles.

Settings.json in a project directory **overrides** the default program settings, as configured in [default-settings.js](https://github.com/hfndb/cookware-headless-ice/blob/master/src/default-settings.ts) in the 'src' directory. It contains the following sections:


## Version information

```javascript
{
	"version": "0.0.1"
}

```

Version information. When cookware-headless-ice is upgraded, your configuration will be converted to the latest required structure.


## Domain

```javascript
{
	"domain": {
		"description": "Website name",
		"url": "http://www.yourdomain.com"
	}
}

```
Relevant for generating a Google sitemap.xml. If irrelevant, just ignore this entry.


## Epub

```javascript
{
	"epub": {
		"dirs": {
			"content": "dist",
			"output": "dist/downloads"
		},
		"caching": {
			"exclude": [],
			"removeObsolete": {
				"active": true,
				"exclude": []
			},
			"sign": false
		}
	}
}
```

Entries:
+ *dirs / content*: HTML content which yet needs to be rendered by the HTML template engine.
+ *dirs / output*: Where to put your rendered ePub files.
+ *caching / exclude*: An array with HTML content to exclude from rendering.
+ *caching / removeObsolete / active*: After rendering, remove all ePub files which have become obsolete. They will not be actually removed, but moved to a temp directory. The exact location of these trash files will be reported to you.
+ *caching / removeObsolete / exclude*: An array with ePub files which will be excluded from auto-removal.
+ *caching / sign*: Sign produced ePub files with PGP.

## Env

```javascript
{
	"env": {
		"node_path": []
	}
}
```

Entries:
+ *env*: Environment variables
+ *node_path*: List of paths to add to NODE_PATH. Should point to compiled code

## Exclude list

```javascript
{
	"excludeList": {
		"exactMatch": true,
		"beginswith": true,
		"contains": true
	}
}
```

Default settings for an exclude list, in case the exclude list is a simple array like in:

```javascript
	"exclude": []
}
```

At all such places you can alternatively use a quite detailed structure, in which case the default settings will be ignored. Example:


```javascript
	"exclude": {
		"contains": [],
		"exactMatch":  [],
		"startsWith":  [],
		"endsWith":  []
	}
}
```


## Formats
```javascript
	"formats": {
		"date": "DD-MM-YYYY",
		"datetime": "DD-MM-YYYY HH:mm",
		"time": "HH:mm",
		"decimalSeparator": ",",
		"thousandsSeparator": ".",
		"mysql": {
			"date": "%d-%m-%Y",
			"datetime": "%d-%m-%Y %H:%i",
			"time": "%H:%i"
		}
	}
}
```

Date/time/datetime formats used to parse dates using [date-and-time](https://www.npmjs.com/package/date-and-time).
Local documentation of this integrated package is available using the system home page of the local development server. See [usage](./usage.md), header "Run".

Used in system todo list, project overview and perhaps also project pages. An instance of the class Formatter (see lib/utils.ts) is always in the context for HTML rendering, named 'frmt'.


## HTML
```javascript
{
	"html": {
		"dirs": {
			"content": "content",
			"output": "dist",
			"searchPaths": [
				"content/includes"
			],
			"templates": "templates"
		},
		"caching": {
			"exclude": [],
			"engine": "nunjucks",
			"removeObsolete": {
				"active": true,
				"exclude": []
				}
		},
		"sitemap": {
			"generate": true,
			"exclude": []
		},
		"stripper": {
			"active": false
		}
	}
}
```
Entries:
+ *dirs / content*: HTML content which yet needs to be rendered by the HTML template engine.
+ *dirs / output*: Where to put your rendered HTML files.
+ *dirs / searchPaths*: List with locations of includes for repeating content, or other templates.
+ *dirs / templates*: Location of layout templates.
+ *caching / exclude*: An array with HTML content to exclude from rendering.
+ *caching / engine*: Template engine. Currently it's nunjucks, see [roadmap](./design-goals-and-roadmap.md) for future plans.
+ *caching / removeObsolete / active*: After rendering, remove all HTML files which have become obsolete. They will not be actually removed, but moved to a temp directory. The exact location of these trash files will be reported to you.
+ *caching / removeObsolete / exclude*: An array with HTMLfiles which will be excluded from auto-removal.
+ *sitemap / exclude*: An array with HTML content to exclude from sitemap.
+ *stripper / active*: Organize a striptease by stripping HTML from elements, making a page faster to load en harder to read the HTML code (teasing)

See [compacting files](./philosophical/compacting-files.md) for more information about... compacting output.


## JavaScript

```javascript
{
	"javascript": {
		"ast": false,
		"autoGenerated": [],
		"browser": {
			"removeImports": true,
			"shrink": [],
			"targets": ["defaults"]
		},
		"compiler": "javascript",
		"dirs": {
			"output": "dist/static/js",
			"source": "src"
		},
		"lineStripping": {
			"needsSpace": {
				"after": ["else", "function", "var"],
				"around": ["in", "new"]
			}
		},
		"nodeVersion": "current",
		"removeObsolete": {
			"active": true,
			"exclude": []
		},
		"shrinker": {
			"defs": []
		},
		"sourceMapping": true,
		"sourceVersion": "es2017",
		"stripper": "stripper"
		"transcompiler": "babel",
		"useWatch": true
	}
}
```
Entries:
+ *ast*: Generate a .ast file for each transcompiled file
+ *autoGenerated": Skip processing of auto-generated files
+ *browser / removeImports*: Removes imports (and exports) from browser related source file just before transcompiling.
+ *browser / shrink*: Object array for shrinking, see [compacting files](./philosophical/compacting-files.md)
+ *browser / targets*: See [Babel documentation](https://babeljs.io/docs/en/presets). Presets are loaded based on the compiler setting. Browser targets can be set here.
+ *compiler*: Possible values: none, javascript, flow or typescript. The setting javascript will convert recent versions of JavaScript to a browser compatible version.
+ *dirs / output*: Where to put your JavaScript files.
+ *dirs / source*: Location of your TypeScript or JavaScript files.
+ *lineStripping*: In case of compression of an already transcompiled file for usage in a web browser, keywords which need space after or around can be set here.
+ *nodeVersion*: For Babel. Possible values: current or version number.
+ *removeObsolete / exclude*: An array with files which will be excluded from auto-removal.
+ *shrinker / dev*: Array with list of files, stem only, pointing to definitions for shortening in the directory /dev/shrinker
+ *sourceMapping*: For Babel. Output source maps and fullfil requirements for [source-map-support](https://www.npmjs.com/package/source-map-support)
+ *sourceVersion*: For Babel. Possible values: es2015, es2016, es2017, es2018.
+ *stripper*: How to strip aka compress. Value stripper or yui-compressor.
+ *transcompiler*: Which transcompiler to use. Currently only Babel.
+ *useWatch*: For local development server. If true, will transcompile if a source file changes.

### Definitions for shrinking

See [compacting files](./philosophical/compacting-files.md) for more information about... compacting output and shrinking. Example configuration for code:

```javascript
// Syntax like a class with static methods, preventing
// Babel to generate too much code while transcompiling:
let SomeCategory = {
   actSoberly: function() {
      // Acting soberly here
   },
   actThoughtfully: function() {
      // Acting thoughtfully  here
   }
}

function retrieveInfo() {
	return true;
}
```

A configuration file for shrinking then looks like this:

```javascript
// File: dev/shrinking/various.json
[
   {
      "class": "SomeCategory",
      "methods": [ "actSoberly", "actThoughtfully"]
   },
   {
   	"functions": ["retrieveInfo"]
   }
]
```

Back to settings.json:

## Known projects

```javascript
{
	"projects": []
}

```

Array with full paths to known projects. To validate the structure of config.json files and detect versions which need to be updated. See [usage](./usage.md), header "Check".


## Logging

```javascript
{
	"logging": {
		"exitOnError": true,
		"level": "silent",
		"playSoundOn": {
			"error": false,
			"warning": true
		},
		"transports": {
			"console": {
				"active": true,
				"format": "HH:mm:ss"
			},
			"file": {
				"active": true,
				"dir": "/tmp/cookware-headless-ice",
				"format": "DD-MM-YYYY HH:mm:ss"
			},
			"udf": {
				"active": false
			}
		}
	},
}
```

Self-explanatory

Notable entries:
+ *level*: The log level. Possible values: debug, silent, verbose
	* debug is utterly verbose
	* silent (default mode) will only log errors
	* verbose will log errors, warnings and informative messages
+ *transports*: Turn types of logging on or off. Udf is User Defined logging. It needs an overwritten method writeUdf() in lib/log.ts
+ *transport > console > format*: Date/time/datetime format used to parse dates using [date-and-time](https://www.npmjs.com/package/date-and-time).
+ *transport > file > dir*: Two log files will be created in this directory: combined.log and error.log.


## New projects

```javascript
{
	"newProject": {
		"dirStructure": {
			...
		}
	}
}
```

A definition of the directory structure for new projects, documented in the source file *src/lib/dirs.ts*, function *createdirtree()*. Using the API docs, section lib/dirs, the layout is more pleasant to read.


## PHP

```javascript
{
	"php": {
		"dirs": {
			"source": "dist/static/php"
		},
		"useWatch": false
	}
}
```

Self-explanatory

Notable entry:
+ source: Relative from project root, for inplace editing (beautify during watching)


## PDF

```javascript
{
	"pdf": {
		"dirs": {
			"content": "dist",
			"output": "dist/downloads"
		},
		"rendering": {
			"exclude": [
				"downloads"
			],
			"firstUpdateWeb": true,
			"marginLeft": 10,
			"marginRight": 10,
			"removeObsolete": {
				"active": true,
				"exclude": []
				},
			"sign": false
		}
	}
}
```

Entries:
+ *dirs / content*: Rendered HTML content which yet needs to be converted to PDF.
+ *dirs / output*: Where to put your rendered PDF files.
+ *rendering / exclude*: An array with HTML files to exclude from rendering.
+ *rendering / firstUpdateSources*: Before rendering PDF files, first update sources, sass and content.
+ *rendering / marginLeft*: A setting for wkhtmltopdf. Unit: mm.
+ *rendering / marginRight*: A setting for wkhtmltopdf. Unit: mm.
+ *rendering / removeObsolete / active*: After rendering, remove all PDF files which have become obsolete. They will not be actually removed, but moved to a temp directory. The exact location of these trash files will be reported to you.
+ *rendering / removeObsolete / exclude*: An array with PDF files which will be excluded from auto-removal.
+ *rendering / sign*: Sign produced PDF files with PGP.


## Project overview
```javascript
{
	"projectOverview": {
		"configuration": true,
		"code": true,
		"dir": "project-overview",
		"showPackages": false,
		"styling": true,
		"documentation": true,
		"goodies": true,
		"exclude": [
			"api"
			]
	}
}
```

Switches parts of the project overview on or off and sets output directory for project overviews, if generated from the command line.


## Sass
```javascript
{
	"sass": {
		"autoGenerated": [],
		"colors": {
			}
		},
		"dirs": {
			"source": "sass",
			"output": "dist/static/css"
		},
		"looks": [
			["casual", "Casual"]
		],
		"removeObsolete": {
			"active": true,
			"exclude": []
		},
		"stripper": "parcel-css"
	}
}
```
Entries:
+ *autoGenerated": Skip processing of auto-generated files
+ *looks*: Defined looks of project UI, included here for demonstration purposes. "My look" would be called 'theming' by most others. The first element is a <body> class, the second the description in a user preferences dialog.
+ *dirs / source*: Location of your Sass files.
+ *dirs / output*: Where to put your CSS files.
+ *removeObsolete*: See as HTML.
+ *stripper*: How to strip aka compress. Value parcel-css, stripper or yui-compressor. Due to a Node.js bug in Array.split(), see [stripping.mjs](../src/lib/stripping.mjs), stripper cannot be used yet.

See [compacting files](./philosophical/compacting-files.md) for more information about... compacting output.


## Server
```javascript
{
	"server": {
		"backupInterval": 0,
		"beautify": ["src"],
		"firstUpdateSources": true,
		"logStatic": false,
		"port": 8000,
		"staticUrl": "static",
		"watchTimeout": 100
	},
}
```

Entries:
+ *backupInterval*: Interval for automatic backups of recently changed source code to backups directory. Unit: min. If set to 0, the auto-backup functionality is ignored.
+ "beautify": Array with kinds of code to beautify on the fly, when file change is detected. Possible values: saas, src
+ *firstUpdateSources*: Before running the server, first update sources and sass.
+ *logStatic*: Log static files; css, js and pictures. If set to false, only html, markdown, epub and pdf requests will be logged.
+ *port*: The HTTP port number of your website.
Example: If set to 8000, this website can be opened with http://localhost:8000/
+ *staticUrl*: Directory for static files; css, js and pictures.
+ *watchTimeout*: A timeout for filewatching using fs.watch(). Unit: ms. If you observe multiple changes in the console output, while you changed a file only once, then you could increase this timeout a bit.


## Stripping

Settings for what is known as file compression, minifying.

```javascript
{
	"stripping": {
		"suffix": "stripped"
	}
}
```

Entries:
+ *suffix*: Added to stem of filename


## Sys

```javascript
sys {
	"audio": {
		"player": "mplayer"
	},
	"notifications": {
		"command": "/path/to/notification.sh",
		"compileIssue": {
			"code": false,
			"html": false,
			"sass": false
		}
	}
}
```

Notable entries:

+ *audio*: For playing sounds in case of issues (warning, error). The player needs to be installed in your system.
+ *notifications*: For desktop notifications, in case of issues (warning, error). In a Linux system, I use the following bash file to initiate notificatons. If you write your own bash file, please note the order of parameters.


```bash
#!/bin/bash

MESSAGE=$1
TIMEOUT=$2
TITLE=$3

if [ "$TITLE" != "" ]; then
	TITLE="--title=$TITLE"
fi

if [ "$TIMEOUT" == "" ]; then
	TIMEOUT=5
fi

# Will not dispay if in full screen mode
kdialog --passivepopup "$MESSAGE" "$TITLE" $TIMEOUT
```

## Tags

For auto-generating [tag files](https://en.wikipedia.org/wiki/Ctags#Tags_file_formats), using [ctags-exuberant](http://ctags.sourceforge.net/) or [universal-ctags](https://ctags.io/). Two types of tags will be generated
+ a tags file in the project root, containing information about all source files
+ a tags file in project dir .tags, containing information each source file


```javascript
{
	"tags": {
		"active": false,
		"generator": "exuberant",
		"ignore": [],
		"style": "all",
		"styles": {
			"all": ["C","F","M","P","V","E","I","G","A","O","S","T"],
			"simple": ["C","F","M"],
		}
	},
}
```
Entries:
+ *active*: Generate tags files
+ *generator*: Possible values exuberant or universal
+ *ignore*: Ignore tags in this list
+ *style*: Chosen style for the content of tags files
+ *styles*: Configured styles with allowed flags


## TypeScript

The entry noEmit in tsconfig.json prevents the TypeScript compiler to transcompile. In this way, Babel can do the job. Which dramatically increases effeciency ([read more](https://iamturns.com/typescript-babel/)). However, this might force you to check types manually.

Incidental type check by TypeScript compiler:
```bash
tsc
```

Turn on TypeScript compiler in watch mode:
```bash
tsc -w
```

## Dependencies

In this section, you'll find configuration options for integrated packages. Relevant settings can be found here:
+ [typedoc](https://typedoc.org/guides/installation/#node-module)
+ [nunjucks](https://mozilla.github.io/nunjucks/api.html#configure)
+ [prettier](https://prettier.io/docs/en/options.html)
+ [htmlcs](https://github.com/ecomfe/htmlcs/blob/master/lib/default/htmlcsrc)
+ [typescript](https://www.typescriptlang.org/docs/handbook/compiler-options.html) - json schema [here](http://json.schemastore.org/tsconfig)

'Special' section in the dependencies part:

```javascript
"express": {
	"activate": {
		"logging": true,
		"sessions": false,
		"uploads": false
	},
	"session": {
		"cookie": {
			"domain": "localhost",
			"httpOnly": true,
			"maxAge": 86400000,
			"path": "/",
			"sameSite": true
		},
		"name": "cookware-headless-ice",
		"resave": false,
		"rolling": true,
		"saveUninitialized": true,
		"secret": "someSecretPhrase"
	},
	"memoryStore": {
		"type": "memoryStore",
		"memoryStore": {
			"checkPeriod": 86400000
		}
	}
},
```
Entries:
+ *activate*: Switch specific middleware on or off
+ *session*: Options for the package [express-session](https://www.npmjs.com/package/express-session). The property 'secure' is automatically set based on the value of domain.url
+ *memoryStore / type*: Type of used memory store. At the moment one type is implemented
+ *memoryStore / memoryStore*: Options for the package [memorystore](https://www.npmjs.com/package/memorystore) (stores in RAM)


[comment]: <> (No comments here)
