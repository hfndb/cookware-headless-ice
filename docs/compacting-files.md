# Compacting files

Back to [main  page](../README.md).

Compacting files is known as [file compression](https://en.wikipedia.org/wiki/File_compressing), [minifying](https://en.wikipedia.org/wiki/Minification_(programming)) aka minification.


## Philsophical point of view

Files, like dossiers, should not even exist or otherwise be as compact as possible. Should not include what is not really necessary.

Files that you keep to yourself (in this case, not leaving a computer) should remain readable. However, distribution towards web browsers requires not 'overdosing' disk traffic and network traffic while only software (browsers) needs enough readability for rendering.


## Stripping

Stripping is the first step in compacting files. For which the file [stripping.ts](../src/lib/stripping.ts) is 'responsible'. In most cases. This mostly involves:
+ Merging all lines of code into 1 line
+ Stripping hiearchy (code indenting)
+ Removing spaces as in space needed to think about what's next


## Sass

Cookware-headless-ice uses [node-sass](https://www.npmjs.com/package/node-sass) to not only compile 'nested' CSS output, but also to compile 'compressed' output.

Example: If you change a file like 'styles.scss', then the files 'styles.css' and 'styles-stripped.css' will be written to your HD.


## HTML

If you set your project settings, html > stripper > active to true (see [configuration](./configuration.md)), generated HTML will be stripped.


## JavaScript or TypeScript

If you look at JavaScript in your project settings (see [configuration](./configuration.md)), the 'browser' and 'bundles' section include options to activate stripping.

The *workflow* I use is as follows:
+ For browsers, removal of imports can be activated in your projects settings. To prepare for composing a bundle.
+ Babel transcompiles JavaScript or TypeScript files.
+ In case of a transcompiled file for browsers, also a stripped file will be written. Example: If you change a file like 'example.js', then the files 'example.js' and 'example-stripped.js' will be written to your HD.
+ In case a transcompiled file is included in a browser bundle, the whole bundle will be created or rewritten. Which means reading transcompiled files, put them all into one file like 'bundle.js'.
+ For such composed bundles, also a stripped version will be written. For example, if the file 'bundle.js' is created or rewritten, also 'bundle-stripped.js' will be written to your HD.

A browser bundle generated like this does not need to resolve internal references, since all imports (and by that, also requires) are stripped. Thus reducing the size of such a browser bundle.

### Tip

In a pure JavaScript project, I always include the following JavaScript function in the context to be rendered using the template engine [nunjucks](https://www.npmjs.com/package/nunjucks):

```
getStatic(path, forceStripped = false) {
	let dir = "/" + cfg.options.domain.appDir + "/static/";
	return process.env.NODE_ENV == "production" || forceStripped
		? dir + FileUtils.getSuffixedFile(path, cfg.options.stripping.suffix)
		: dir + path;
}

```

In the base HTML template, this function is called like this:

```
<script defer src="{{ getStatic("browser/bundle.js") }}"></script>

```

In that way, during development, a human readable file wil be sent to the browser. However, during production use only a compacted, stripped version. As long as software, a web browser, can interpret this file, that should be enough.
