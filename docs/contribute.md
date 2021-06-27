# Contribute

Back to [main page](../README.md).

If you'd like to do something, then consider the following:

+ Though this is not a socalled Big Code environment and I don't aim at getting developers onboard, perhaps the article [Better onboarding: How to prevent codebase overwhelm](https://about.sourcegraph.com/blog/better-onboarding-how-to-prevent-codebase-overwhelm/) is interesting. About how Big Code can create big problems for developer onboarding, making sure all use the same resources and tools, one single source of truth, making a situation safe to ask. Big Code? Think of [software bloat](https://en.wikipedia.org/wiki/Software_bloat) and bloated ideas.
This project is an example of sober thinking. Openly. Not too big, potentially useful for any software architect, developer, not built to abuse and pollute the (inter)net. Please remain sober or get yourself back to that condition before diving into a project of any kind. Big Code, Big Corp, Big Gov, Big Pharma etc primarily serves Big Overhead, causing Big Trouble of various kinds.

+ Bug reports and bugfixes (pull requests) are always welcome. In case of bug reports, please include
	- OS incl. version nr.
	- Node.js version nr. if you're using the version in package.json
	- Console output of stacktrace and other relevant information
	- A copy of your project config.json

+ This project could use testing on platforms other than Linux, mainly Apple and Windows.

	- Apple boxes running [OSx](https://en.wikipedia.org/wiki/MacOS) should have no problems running this application, for OSx is [BSD-based](https://en.wikipedia.org/wiki/Berkeley_Software_Distribution).

	- Windows boxes could use **batch files**, to mimic included Linux bash files. The function backupChangedSource() in src/local/misc.ts refers to bin/backup-source.sh for auto-backup purposes.

For background information, see [design goals and roadmap](./design-goals-and-roadmap.md).


## Used tools

Most of this project is developed during the 1st quarter of 2019, on a Linux platform - [Xubuntu](https://xubuntu.org/) 18.10 to now [Kubuntu](https://kubuntu.org/) 21.04 -, with:
+ [wkhtmltopdf](http://wkhtmltopdf.org/) v. 0.12.4
+ [GnuPG](https://gnupg.org/) v. 1.8.1
+ [Zeal](https://zealdocs.org/) v. 0.6.1

The following code editors and text editors are used (mostly vim and Kate), depending on the exact nature of a task:

Linux:
+ [Kate](https://en.wikipedia.org/wiki/Kate_%28text_editor%29)

Windows:
+ [Notepad++](https://notepad-plus-plus.org/) with [TypeScript plugin](https://github.com/chai2010/notepadplus-TypeScript)

Suitable for both:
+ [gvim, neovims](https://en.wikipedia.org/wiki/Vim_%28text_editor%29) with an extension and some plugins. See [here](https://github.com/hfndb/tools/tree/master/vim) for installation and configuration details towards a **lightning fast experience** while writing code
+ [VS Code](https://code.visualstudio.com/)
+ [Brackets](http://brackets.io/) with extension [Nunjucks syntax highlighter](https://github.com/axelboc/nunjucks-brackets/)
+ [Komodo Edit](https://www.activestate.com/products/komodo-edit/)


## Style

+ Indenting of code with tabs, not spaces. TabSize set to 3 -> After tabbing once, three spaces visually mimic that one tab in an editor.

[comment]: <> (No comments here)
