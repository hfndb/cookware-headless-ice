# Compacting files

Back to [main  page](../README.md).

Compacting files is known as [file compression](https://en.wikipedia.org/wiki/File_compressing), [minifying](https://en.wikipedia.org/wiki/Minification_(programming)) aka minification.


## Philosophical point of view

Files, like dossiers, should not even exist or otherwise be as compact as possible. Should not include what is not really, really, really necessary.

**File compacting is about 'not making too big' instead of common beliefs about 'making small'.** The less you overdo, the less you need to correct yourself.

Files that you keep to yourself (in this case, not leaving a computer) should remain readable. However, distribution towards web browsers requires not 'overdosing' disk traffic and network traffic while only software (browsers) needs enough readability for interpretation and rendering.


## Stripping

Stripping aka compacting or compression is the first step in compacting files. For which the file [stripping.mjs](../src/lib/stripping.mjs) is 'responsible'. In most cases. This mostly involves:
+ Merging all lines of code into 1 line
+ Stripping hierarchy (code indenting)
+ Removing spaces as in space needed to think about what's next.

Don't give software, a web browser, any (line, space or word) break that you should want to prevent for reasons of interpretation that should not break or be hindered.
Don't send truly obsolete or even misleading information.

Put differently: Do not err yourself 😉


### Sass

Cookware-headless-ice uses [dart-sass](https://github.com/sass/dart-sass/) to transcompile to 'nested' CSS output. From there, a stripped CSS file will be generated. Due to a Node.js bug in Array.split() using the Yahoo [yui-compressor](https://yui.github.io/yuicompressor/).

Example: If you change a file like 'styles.scss', then the files 'styles.css' and 'styles-stripped.css' will be written to your HD.


### HTML

If you set your project settings, html > stripper > active to true (see [configuration](./configuration.md)), generated HTML will be stripped using [stripping.mjs](../src/lib/stripping.mjs).


### JavaScript or TypeScript

If you look at JavaScript in your project settings (see [configuration](./configuration.md)), the 'browser' and 'bundles' section include options to activate stripping.

The *workflow* I use is as follows:
+ For browsers, removal of imports can be activated in your projects settings. To prepare for composing a bundle. Coded in [javascript.mjs](../src/local/javascript.mjs) and [source.mjs](../src/local/source.mjs).
+ [Babel](https://babeljs.io/docs/en/) transcompiles JavaScript or TypeScript files, controlled by [babel.mjs](../src/local/babel.mjs).
+ In case of a transcompiled file for browsers, also a stripped file will be written. Example: If you change a file like 'example.js', then the files 'example.js' and 'example-stripped.js' will be written to your HD. Coded in [stripping.mjs](../src/lib/stripping.mjs).
+ In case a transcompiled file is included in a browser bundle, the whole bundle will be created or rewritten. Which means reading transcompiled files, put them all into one file like 'bundle.js'.
+ For such composed bundles, also a stripped version will be written. For example, if the file 'bundle.js' is created or rewritten, also 'bundle-stripped.js' will be written to your HD. Coded in [stripping.mjs](../src/lib/stripping.mjs).

A browser bundle generated like this does not need to resolve internal references, since all imports (and by that, also requires) are stripped. Thus reducing the size of such a browser bundle.

#### Tip

In a pure JavaScript project, I always include the following JavaScript function in the context to be rendered using the template engine [nunjucks](https://www.npmjs.com/package/nunjucks):

```javascript
getStatic(path, forceStripped = false) {
   let dir = "/" + cfg.options.domain.appDir + "/static/";
   return process.env.NODE_ENV == "production" || forceStripped
      ? dir + FileUtils.getSuffixedFile(path, cfg.options.stripping.suffix)
      : dir + path;
}
```

In the base HTML template, this function is called like this for related CSS and JavaScript files:

```html
<script defer src="{{ getStatic("browser/bundle.js") }}"></script>
```

In that way, during development, a nicely structured file will be sent to the browser. However, during production use only a compacted, stripped version. As long as software, a web browser, can interpret this file, that should be enough.


## Further revelations

Of course this attempt to 'enlighten' you is not complete yet. Culture and philosophy 'strongly' encourages to preserve certain mysteries. I don't. In order to further explore the principle of compacting so you can get more insights, the following:

Stripping as in putting all code in one line, is no more than just one step on the way. Next step would be 'shortening'. Before diving into that, first some 'need to know' information:

### Words point like names

'Shortening' is about the usage of words (in code, like names). In the very first programming languages I used, [C](https://en.wikipedia.org/wiki/C_(programming_language)), you can reserve memory to remember information. Like you do, when you want to keep and retrieve 'stored' memories. Names like words point to such information, somewhere in memory. C as a language even includes explicit [pointers](https://en.wikipedia.org/wiki/Pointer_(computer_programming)), to point to a specific place in memory.

When you speak with somebody, your words refer to memories. Your memories and/or the memories of others. In software, words coming from [Node.js](https://en.wikipedia.org/wiki/Node.js) software are sent to software known as a web browser. The only thing needed during that communiation is that both pieces of software 'think' about the exact same. A matter of interpretation.

### Don't make em too big, too long, too wide

In words, you don't use more letters than necessary. A nice example comes from Czech language where 'a' means 'and' in English and 'i' means 'and also'. Compare that with Hungarian language, where words get longer depending on how well that language is mastered by the speaker. However, enough should be enough. Words (like organisations using more and more employees) which take too much space, are too big, too long, too wide are symptoms of defected, ill thinking.

To depict 'enough', I have put a socalled [easter egg](https://en.wikipedia.org/wiki/Easter_egg_(media)) in cookware-headless-ice. Which I did not intend to keep hidden. While 'shortening' your code, names will start with 'Aa'. Why? Is this just another example of 'security by obfuscation'? No. For reasons of words as mere pointers and more:

Try to imagine the two very first people in this world. One body with something between the legs, later known as a penis. The other body with some extra lips between the legs (not for blah blah). Words like 'male' or 'female' were not invented yet. At what situation were they looking?

They were both in the role of 'a', so to speak. Using 'a' from Czech language 'and'. Body with a psyche in there. And. Also in the role of 'i' as in 'and also'. Also what? In the alpha position towards there body, thinking and behavior. Both of them, though not for others. Not for outsiders of their life. Together, they were 'together as one' one 'name' like Adam. Before they split and became Adam and Eve to play fixed (gender) roles, as a 'man' or 'woman'.

So... why this 'easter egg'? What is the meaning of 'Aa'? In an original 'a' would be enough. 'Aa' symbolizes something like a situation which was still good, healty. Before Adam split into Adam and Eve, they were in a situation without friction, tensions, conflicts. No corruption yet. Problems began when 'together as one' was no longer 'good enough' and they stopped thinking the same. Though an outsider of their life was 'needed' to 'inspire' towards corrupting (malforming, misforming) an original situation. What in is known in religion as [original sin](https://en.wikipedia.org/wiki/Original_sin) is no more than malforming, misforming an original way of thinking.

### Know what you are thinking and why

Coding is like thinking. You need to know what you were thinking or coding and why. Otherwise you'll make mistakes. Error! Do you want to play software architect or programmer? That's your problem. If you stop knowing what you were thinking and why. Assuming you are not so lazy or negligent that you want to stop knowing...

### Settings for your mindset

You won't get away easy with what you wrote. Code. You'll need to complete this settings to shorten words, names. For specific projects, I did not rely on an auto-generated tags file but wrote a tiny shell script to retrieve the exact information I wanted: [shorten.sh](../tools/shorten.sh). See [configuration](../configuration.md), section JavaScript, for how to setup configuration for specific shrinking aka shortering.

After doing your homework like this, a changed JavaScript file will not only be transcompiled and stripped, but also words in code will be shortened. A translation table (dictionary) will be written to [project directory]/notes/translate-table.txt.

In case you didn't know exactly what you architected, programmed, bugs that a web browser will find during interpreting, you'll need this translation table aka dictionary to trace back what you were thinking while writing.

In the mean time, with or without errors, a web browser will not be fed with too much lines or words that are simply too long. Bigger and longer than really necessary.

### Please note

Please note the following: What I wrote in this page only applies to 'browser bundles', not to 'app bundles' that you can configure. I don't even use the latter. Why? I want to be in full control over my thinking. If others think for me, as in perhaps 'app bundles' for you, you also get to swallow any error that others produce for you. Do not err.

## Read more

Philosophically, about software architecture:

+ [Reference](../design-goals-and-roadmap.md) to debate about strong vs. loose typing. Though rigid or even loose typing (designated types) is not always necessary.

[comment]: <> (No comments here)
