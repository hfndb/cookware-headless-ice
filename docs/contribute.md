# Contribute

Back to [main page](../README.md).

If you'd like to help in some way, then consider the following:

+ Bug reports and bugfixes (pull requests) are always welcome. In case of bug reports, please include
	- OS incl. version nr.
	- Node.js version nr. if you're using a non-standard installation
	- Console output of stacktrace and other relevant information
	- A copy of your project config.json

+ This project could use testing on platforms other than Linux, mainly Apple and Windows.

	- Apple boxes running [OSx](https://en.wikipedia.org/wiki/MacOS) should have no problems running this application, for OSx is [BSD=based](https://en.wikipedia.org/wiki/Berkeley_Software_Distribution).

	- Windows boxes could use **batch files**, to mimic included Linux bash files. The function backupChangedSource() in src/local/misc.ts refers to bin/backup-source.sh for auto-backup purposes.

For background information, see [design goals and roadmap](./design-goals-and-roadmap.md).

## Used tools

This project is developed during the 1st quarter of 2019, on a Linux platform - [Xubuntu](https://xubuntu.org/) 18.10 Cosmic Cuttlefish -, followed by improvements using later versions, with:
+ [Node.js](https://nodejs.org/) v. 8.10
+ [wkhtmltopdf](http://wkhtmltopdf.org/) v. 0.12.4
+ [GnuPG](https://gnupg.org/) v. 1.8.1
+ [Zeal](https://zealdocs.org/) v. 0.6.0

The following code editors and text editors are used, depending on the exact nature of a task:

Linux:
+ [Kate](https://en.wikipedia.org/wiki/Kate_%28text_editor%29)

Windows:
+ [Notepad++](https://notepad-plus-plus.org/) with [TypeScript plugin](https://github.com/chai2010/notepadplus-TypeScript)

Suitable for both:
+ [VS Code](https://code.visualstudio.com/) with extensions [Prettier Now](https://marketplace.visualstudio.com/items?itemName=remimarsal.prettier-now) and [Nunjucks VSCode extension pack](https://marketplace.visualstudio.com/items?itemName=douglaszaltron.nunjucks-vscode-extensionpack)
+ [Brackets](http://brackets.io/) with extensions [Brackets Prettier](https://github.com/sizuhiko/brackets-prettier), [Nunjucks syntax highlighter](https://github.com/axelboc/nunjucks-brackets/) and some more for Sass and TypeScript
+ [Komodo Edit](https://www.activestate.com/products/komodo-edit/)


## Style

+ Indenting of code with tabs, not spaces. Already set in the VS Code workspace, included in this project. In these settings, tabSize is set to 2 -> After tabbing once, two spaces visually mimic that one tab in VS Code.

[comment]: <> (No comments here)
