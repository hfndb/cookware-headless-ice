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
+ [vim](en.wikipedia.org/wiki/Vim_(text_editor)/) with extension [YouCompleteMe](https://awesomeopensource.com/project/ycm-core/YouCompleteMe?categoryPage=3)
+ [VS Code](https://code.visualstudio.com/)
+ [Brackets](http://brackets.io/) with extension [Nunjucks syntax highlighter](https://github.com/axelboc/nunjucks-brackets/)
+ [Komodo Edit](https://www.activestate.com/products/komodo-edit/)


## Installation and configuration of vim

Usually I work with vim and Kate. Tools like VS Code come with quite some overhead in terms of memory consumption and processor load.

To **install vim** with [YouCompleteMe](https://awesomeopensource.com/project/ycm-core/YouCompleteMe?categoryPage=3) [autocompletion](https://en.wikipedia.org/wiki/Autocomplete):


```
# Installation of vim:
sudo apt-get install vim vim-gtk3 vim-addon-manager vim-youcompleteme

# Install code completion in your home directory
vam install youcompleteme

# If you don't have a file ~./.vimrc yet:
cp /etc/vim/vimrc ~/.vimrc

```

To **configure vim** you need to add the following lines to (the bottom of) **~./.vimrc**:

```
" Autoreolad, if code beautify feature for sass and/or src is switched on
set autoread
au CursorHold * checktime

" Indenting, see https://vim.fandom.com/wiki/Indenting_source_code
set shiftwidth=3  "indenting 3 spaces
set tabstop=3
set autoindent
set smartindent

" Alter some hightlighting colors by YouCompleteMe
highlight YcmErrorSection ctermfg=white ctermbg=DarkGray
highlight YcmWarningSection ctermfg=white ctermbg=Blue

" Uncomment to show tabs as characters
" set list
" set listchars=tab:>-

```

### Health warnings

Some health warnings that you might not be aware of yet:

+ Often working with a mouse can cause [Repetitive Strain Injury](https://en.wikipedia.org/wiki/Repetitive_strain_injury) (RSI) in your body or mouse. For that reason keyboard shortcuts can be quite handy. So... would you like to use a mouse? Or even a keyboard? During times of intense writing like coding, I wear out a keyboard during a few months. Like keys for a lock which need replacement.
+ According to information from a known [editor war](https://en..wikipedia.org/wiki/Editor_war), using [Emacs](https://en.wikipedia.org/wiki/Emacs) seems to induce a [Carpal Tunnel Symdrome](https://en.wikipedia.org/wiki/Carpal_tunnel_syndrome) (CTS). So... would you like to use Emacs?
+ Vim seems a classic, while in fact promotes [compartmentalization](https://en.wikipedia.org/wiki/Compartmentalization_(psychology)) of thinking - thus causing fierce episodes of [cognitive dissonance](https://en.wikipedia.org/wiki/Cognitive_dissonance) - using various modes of operation. Which is a psychological risk that you need to resist. For example, switching from insert to command mode might raise the impression that you have suddenly changed personality from developer to redactional editor.

  It seems authors and fans of vim assume you are [schizophrenic](https://en.wikipedia.org/wiki/Schizophrenia) (from Greek for "splitting of the mind") and have a [Multiple Personality Syndrome](https://en.wikipedia.org/wiki/Dissociative_identity_disorder) (MPS) nowadays known as Dissociative Identity Disorder. You know when you DID it. Don't you fall for such thinking, it's a common pitfall! 😀

  If you can resist temptation to become psycho-ill, vim offers a **lightning fast experience** while writing code with as little as possible memory consumption and processor load. Assuming you don't resent learning commands and such.


## Style

+ Indenting of code with tabs, not spaces. Already set in the VS Code workspace, included in this project. In these settings, tabSize is set to 3 -> After tabbing once, three spaces visually mimic that one tab in VS Code.

[comment]: <> (No comments here)
