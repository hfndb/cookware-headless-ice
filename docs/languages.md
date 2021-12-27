# Used languages

Back to [main  page](../README.md).

Some information about used languages to build this project.

## JavaScript

This project was originally written in [TypeScript](https://en.wikipedia.org/wiki/TypeScript) (.ts), transcompiled to [CommonJs](https://en.wikipedia.org/wiki/CommonJS) (.js). Starting from [Node.js](https://en.wikipedia.org/wiki/Node.js) version 15, it became possible to run 'ES modules' directly, introduced in [ECMAScript 2015](https://en.wikipedia.org/wiki/ECMAScript). Therefore I transformed the codebase from TypeScript to pure [JavaScript](https://en.wikipedia.org/wiki/JavaScript) (.mjs), so transcompiling of any kind is no longer necessary, to run this Node.js project.


## Bash Script

Some tiny [bash scripts](https://en.wikipedia.org/wiki/Bash_%28Unix_shell%29) were necessary to start the Node.js binary in a controlled way. To create automated backups, I thought a bash script would leave more space for users, to modify the backup routine according to their wishes.


## Binaries

Binaries compiled for a specific platform go faster than interpreted languages. See articles like [Rust Is The Future of JavaScript Infrastructure](https://leerob.io/blog/rust) - [Rust](https://en.wikipedia.org/wiki/Rust_%28programming_language%29) was originally designed by Graydon Hoare at Mozilla Research, with contributions from others.

Beautifying code using [prettier](https://www.npmjs.com/package/prettier) - a pure JavaScript implementation - works smoothly. However, it seems integration of a Rust project could increase speed, with projects like [dprint](https://github.com/devongovett/dprint-node).

For transcompiling [Sass](https://en.wikipedia.org/wiki/Sass_%28stylesheet_language%29), [node-sass](https://www.npmjs.com/package/node-sass) was written in C++. However, that project is now depricated. [Dart Sass](https://www.npmjs.com/package/sass), written in [Dart](https://dart.dev/overview) still needs to be implemented.

Transcompiling [TypeScript](https://en.wikipedia.org/wiki/TypeScript) using the [Microsoft compiler](https://www.typescriptlang.org/download) proved to be terribly slow and quite memory consuming. [Babel](https://www.npmjs.com/package/@babel/core) improved that using a pure JavaScript implementation. Next step would be transcompiling by a Rust project to further increase speed, with projects like [Deno](https://deno.land/manual@v1.17.1/tools/formatter).
