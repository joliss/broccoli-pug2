let pug = require("pug");
let MultiFilter = require("broccoli-multifilter");
let glob = require("glob");
let path = require("path");
let fs = require("fs");
let mkdirp = require("mkdirp");

class BroccoliPug extends MultiFilter {
  constructor(inputNode, inputGlobs, outputType, options) {
    if (options == null) options = {};
    super([inputNode], { annotation: options.annotation });

    this.outputType = outputType || "html";
    let outputTypes = ["html", "es", "cjs", "function"];
    if (outputTypes.indexOf(this.outputType) === -1) {
      throw new Error(
        "Expected outputType to be one of " +
          outputTypes.join(", ") +
          ", got " +
          this.outputType
      );
    }
    this.pugOptions = options.pugOptions;
    this.extension = options.extension;

    if (inputGlobs == null) inputGlobs = "**/*.pug";
    if (typeof inputGlobs === "string") inputGlobs = [inputGlobs];
    if (!Array.isArray(inputGlobs))
      throw new Error(
        "Expected string or array of input files or globs, got " + inputGlobs
      );
    this.inputGlobs = inputGlobs;
  }

  build() {
    let inputFiles = glob.sync("{" + this.inputGlobs.join(",") + ",}", {
      cwd: this.inputPaths[0],
      root: this.inputPaths[0]
    });

    return this.buildAndCache(
      inputFiles,
      (inputFilePath, outputDirectoryPath) => {
        let fullInputPath = this.inputPaths[0] + path.sep + inputFilePath;

        let pugOptions = Object.assign({}, this.pugOptions || {}, {
          filename: fullInputPath,
          basedir: this.inputPaths[0]
        });
        let source = fs.readFileSync(fullInputPath);
        let output, outputFilePath, dependencies;
        if (this.outputType === "html") {
          let templateFn = pug.compile(source, pugOptions);
          output = templateFn(pugOptions);
          outputFilePath = inputFilePath.replace(
            /\.[^.]+$/,
            "." + (this.extension || "html")
          );
          dependencies = templateFn.dependencies;
        } else {
          if (pugOptions.name == null) pugOptions.name = "template";
          let res = pug.compileClientWithDependenciesTracked(
            source,
            pugOptions
          );
          output = res.body;
          if (this.outputType === "es") {
            output += "\nexport default " + pugOptions.name + ";";
          } else if (this.outputType === "cjs") {
            output += "\nmodule.exports = " + pugOptions.name + ";";
          }
          outputFilePath = inputFilePath.replace(
            /\.[^.]+$/,
            "." + (this.extension || "js")
          );
          dependencies = res.dependencies;
        }

        mkdirp.sync(
          outputDirectoryPath + path.sep + path.dirname(outputFilePath)
        );
        fs.writeFileSync(
          outputDirectoryPath + path.sep + outputFilePath,
          output
        );

        return {
          dependencies: [fullInputPath].concat(dependencies)
        };
      }
    );
  }
}

module.exports = BroccoliPug;
