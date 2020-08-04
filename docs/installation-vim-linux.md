# Installation and configuration of vim

Back to [main page](../README.md).

Usually I work with [vim](https://en.wikipedia.org/wiki/Vim_(text_editor)) and [Kate](https://en.wikipedia.org/wiki/Kate_%28text_editor%29). Tools like VS Code come with quite some overhead in terms of memory consumption and processor load.

To **install vim** with [YouCompleteMe](https://awesomeopensource.com/project/ycm-core/YouCompleteMe?categoryPage=3) extenstion for [autocompletion](https://en.wikipedia.org/wiki/Autocomplete) and [Gruvbox theme](https://github.com/morhetz/gruvbox) for gentle [eye candy](https://en.wikipedia.org/wiki/Eye_Candy_(Visual_appeal)):




```
# Installation of vim:
sudo apt-get install vim vim-addon-manager vim-youcompleteme

# Install code completion in your home directory
vam install youcompleteme

# Install plugin manager https://github.com/junegunn/vim-plug (activated in .vimrc)
wget https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim -O ~/.vim/autoload/plug.vim

# If you don't have a file ~./.vimrc yet:
cp /etc/vim/vimrc ~/.vimrc

```

To **configure vim** you need to add the following lines to (the bottom of) **~./.vimrc**:

```
set autoread
au CursorHold * checktime

" If this doesn't work properly, see package https://github.com/djoshea/vim-autoread

" Indenting
set shiftwidth=3  "indenting is 3 spaces
set tabstop=3
set autoindent
set smartindent

" Cosmetics
set number
"For default colorscheme
" highlight LineNr term=bold cterm=NONE ctermfg=DarkGrey ctermbg=NONE gui=NONE guifg=DarkGrey guibg=NONE

" In case of default theme, alter some hightlighting colors by YouCompleteMe
" highlight YcmErrorSection ctermfg=white ctermbg=DarkGray
" highlight YcmWarningSection ctermfg=white ctermbg=Blue

" Show tabs as characters
set list
set listchars=tab:>-

" Plugin section - begin
call plug#begin('~/.vim/plugged')
Plug 'morhetz/gruvbox'    " Gruvbox theme https://github.com/morhetz/gruvbox. In vim run :PlugInstall
call plug#end()
" Plugin section - end

autocmd vimenter * colorscheme gruvbox
set background=dark    " Setting dark mode

```

## Installation and configuration of gvim

After installation of vim you could also install the GUI-version:

```
sudo apt-get install vim-gtk3

# If you don't have a file ~./.gvimrc yet:
cp /etc/vim/gvimrc ~/.gvimrc

```

To **configure gvim** you need to add same lines as above, for vim, to (the bottom of) **~./.gvimrc**.


## Health warnings

Some health warnings that you might not be aware of yet:

+ Often working with a mouse can cause [Repetitive Strain Injury](https://en.wikipedia.org/wiki/Repetitive_strain_injury) (RSI) in your body or mouse. For that reason keyboard shortcuts can be quite handy. So... would you like to use a mouse? Or even a keyboard? During times of intense writing like coding, I wear out a keyboard during a few months. Like keys for a lock which need replacement.
+ According to information from a known [editor war](https://en..wikipedia.org/wiki/Editor_war), using [Emacs](https://en.wikipedia.org/wiki/Emacs) seems to induce a [Carpal Tunnel Symdrome](https://en.wikipedia.org/wiki/Carpal_tunnel_syndrome) (CTS). So... would you like to use Emacs?
+ Vim seems a classic, while in fact promotes [compartmentalization](https://en.wikipedia.org/wiki/Compartmentalization_(psychology)) of thinking - thus causing fierce episodes of [cognitive dissonance](https://en.wikipedia.org/wiki/Cognitive_dissonance) - using various modes of operation. Which is a psychological risk that you need to resist. For example, switching from insert to command mode might raise the impression that you have suddenly changed personality from developer to redactional editor.

  It seems authors and fans of vim assume you are [schizophrenic](https://en.wikipedia.org/wiki/Schizophrenia) (from Greek for "splitting of the mind") and have a [Multiple Personality Syndrome](https://en.wikipedia.org/wiki/Dissociative_identity_disorder) (MPS) nowadays known as Dissociative Identity Disorder (DID). You know, when you DID it. Don't you fall for such thinking, it's a common pitfall! 😀

  If you can resist temptation to become psychologically ill, vim offers a **lightning fast experience** while writing code with as little as possible memory consumption and processor load. Assuming you don't resent learning commands and such.

[comment]: <> (No comments here)
