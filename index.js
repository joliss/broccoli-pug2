let pug = require("pug");
let MultiFilter = require("broccoli-multifilter");
let glob = require("glob");
let path = require("path");
let fs = require("fs");
let mkdirp = require("mkdirp");

class BroccoliPug extends MultiFilter {
  constructor(inputNode, inputGlobs, options) {
    if (options == null) options = {};
    super([inputNode], { annotation: options.annotation });

    this.render = options.render;
    if (this.render == null) this.render = true;

    this.pugOptions = options.pugOptions;

    if (inputGlobs == null) inputGlobs = "**/*.pug";
    if (typeof inputGlobs === "string") inputGlobs = [inputGlobs];
    if (!Array.isArray(inputGlobs))
      throw new Error(
        "Expected string or array of input files or globs, got " + inputGlobs
      );
    this.inputGlobs = inputGlobs;

    this.moduleType = options.moduleType || "es";
    if (
      this.moduleType !== "es" &&
      this.moduleType !== "cjs" &&
      this.moduleType !== "none"
    ) {
      throw new Error(
        'Expected moduleType "es", "cjs" or "none", got ' + this.moduleType
      );
    }
  }

  build() {
    let inputFiles = glob.sync("{" + this.inputGlobs.join(",") + ",}", {
      cwd: this.inputPaths[0],
      root: this.inputPaths[0]
    });

    return this.buildAndCache(
      inputFiles,
      (inputFilePath, outputDirectoryPath) => {
        let absoluteInputPath = this.inputPaths[0] + "/" + inputFilePath;

        let pugOptions = Object.assign({}, this.pugOptions || {}, {
          filename: absoluteInputPath,
          basedir: this.inputPaths[0]
        });
        let source = fs.readFileSync(absoluteInputPath);
        let output, outputFilePath, dependencies;
        if (this.render) {
          let templateFn = pug.compile(source, pugOptions);
          output = templateFn(pugOptions);
          outputFilePath = inputFilePath.replace(/\.[^.]+$/, ".html");
          dependencies = templateFn.dependencies;
        } else {
          if (pugOptions.name == null) pugOptions.name = "template";
          let res = pug.compileClientWithDependenciesTracked(
            source,
            pugOptions
          );
          output = res.body;
          if (this.moduleType === "es") {
            output += "\nexport default " + pugOptions.name + ";";
          } else if (this.moduleType === "cjs") {
            output += "\nmodule.exports = " + pugOptions.name + ";";
          }
          outputFilePath = inputFilePath.replace(/\.[^.]+$/, ".js");
          dependencies = res.dependencies;
        }

        mkdirp.sync(outputDirectoryPath + "/" + path.dirname(outputFilePath));
        fs.writeFileSync(outputDirectoryPath + "/" + outputFilePath, output);

        return [inputFilePath]
          .concat(dependencies)
          .map(relativePath => path.resolve(this.inputPaths[0], relativePath));
      }
    );
  }
}

module.exports = BroccoliPug;
