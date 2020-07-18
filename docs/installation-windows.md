# Installation for Windows

Back to [main  page](../README.md).


## Prerequisites

Download and install [Node.js and npm](https://nodejs.org/en/download/).

Install global packages for your convenience, might be executed in elevated mode:

```
$ npm install -g mocha typescript ts-node dts-gen
```

Search for a command line audio player (see for example [here](https://www.ilovefreesoftware.com/10/windows/mp3/free-command-line-audio-players.html). Download and install, then modify the setting audio > player in the [configuration file](./configuration.md) config.json.


## Optional

For [version control](https://en.wikipedia.org/wiki/Version_control), download and install [git](https://git-scm.com/downloads).

For PDF file creation, download and install [wkhtmltopdf](http://wkhtmltopdf.org/downloads.html).

For signing ePub and PDF files, download and install [GnuPG](https://gnupg.org/download/).


## Installation

```
$ cd <path to cookware-headless-ice>
$ npm install
$ npm build
mklink /D %SystemRoot%\system32/cookware <full path to cookware-headless-ice directory>/dist/static/js/toolbox.js
```

In case you experience problems while installing global NPM packages, look [here](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

You might want to change the default configuration. Details about configuration [here](./configuration.md).


[comment]: <> (No comments here)
