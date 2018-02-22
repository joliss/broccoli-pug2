# broccoli-pug2

[![Build Status](https://travis-ci.org/joliss/broccoli-pug2.svg?branch=master)](https://travis-ci.org/joliss/broccoli-pug2)

## Installation

```sh
npm install --save broccoli-pug2
```

## Example

```js
let Pug = require("broccoli-pug2");

let pugSources = "src/templates";

// Compile to .html:
let htmlFiles = new Pug(pugSources, "pages/**/*.pug");

// Compile to .js ES6 modules, exporting client-side template functions:
let jsTemplates = new Pug(pugSources, "pages/**/*.pug", "es");
```

This compiles `pages/dir/foo.pug` to `pages/dir/foo.html` and
`pages/dir/foo.js`.

## Usage

* `new Pug(inputNode, globs, outputType, options)`

    * `inputNode`: A Broccoli node containing `.pug` files.

    * `globs` (default: `"**/*.pug"`): a glob or array of globs specifying
      which files to compile

    * `outputType`:

        * `"html"` (default): Compile to HTML. Any JavaScript in Pug files will be
          executed at build time in the Node/Broccoli process.

        * `"es"`: Compile to ES6 modules, with
          `export default function template() { ... }`.

        * `"cjs"`: Compile to CommonJS (Node/Browserify) modules, with
          `module.exports = function template() { ... }`.

        * `"function"`: Compile to raw JavaScript function declarations
          `function template() { ... }`.

    * `options`: An options object.

        * `extension` (default: `"html"` or `"js"`, depending on `outputType`):
          The file extension of the output files.

        * `pugOptions`: Options to pass through to Pug. See the [Pug API
          reference](https://pugjs.org/api/reference.html#options) for details.

          The "filename" and "basedir" options are set automatically, and the
          "name" option defaults to `"template"`.

        * `annotation`: A note to help tell multiple plugin instances apart.
