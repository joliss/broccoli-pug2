"use strict";

var BroccoliPug = require("./");
var fixture = require("broccoli-fixture");
var fixturify = require("fixturify");
var Plugin = require("broccoli-plugin");
var chai = require("chai"),
  expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe("broccoli-pug2", () => {
  it("HTML output", function() {
    let source = new fixture.Node({
      "foo.pug": "include ./included.pug",
      "bar.pug": "extends ./layout.pug",
      "included.pug": "div included",
      "layout.pug": "div layout",
      "nodeps.pug": "div nodeps"
    });
    let pugNode = new BroccoliPug(source, ["foo.pug", "bar.pug", "nodeps.pug"]);

    return expect(fixture.build(pugNode)).to.eventually.deep.equal({
      "foo.html": "<div>included</div>",
      "bar.html": "<div>layout</div>",
      "nodeps.html": "<div>nodeps</div>"
    });
  });

  describe("JS output", () => {
    function compileFooJs(outputType) {
      let source = new fixture.Node({
        "foo.pug": "include ./bar.pug",
        "bar.pug": "div bar_contents"
      });
      let pugNode = new BroccoliPug(source, "*.pug", outputType);

      return fixture.build(pugNode).then(output => {
        expect(output["foo.js"]).to.match(/function [\s\S]*bar_contents/);
        return output["foo.js"];
      });
    }

    it("ES6", () => {
      return expect(compileFooJs("es")).to.eventually.match(/export /);
    });

    it("CommonJS", () => {
      return expect(compileFooJs("cjs")).to.eventually.match(
        /module\.exports =/
      );
    });

    it("raw JavaScript function", () => {
      return expect(compileFooJs("function")).not.to.eventually.match(
        /export |module\.exports =/
      );
    });
  });

  it("creates subdirectories", () => {
    let source = new fixture.Node({
      a: {
        b: {
          "foo.pug": "include bar.pug",
          "bar.pug": "div"
        }
      }
    });
    let pugNode = new BroccoliPug(source);

    return expect(fixture.build(pugNode)).to.eventually.deep.equal({
      a: {
        b: {
          "foo.html": "<div></div>",
          "bar.html": "<div></div>"
        }
      }
    });
  });

  describe("caching", () => {
    class FixturePlugin extends Plugin {
      constructor() {
        super([], { persistentOutput: true });
      }

      build() {
        fixturify.writeSync(this.outputPath, this.fixture);
      }
    }

    it("rebuilds only files that have changed dependencies", () => {
      let source = new FixturePlugin();
      let pugNode = new BroccoliPug(source, "[^_]*.pug");

      let builder = new fixture.Builder(pugNode);

      source.fixture = {
        "foo.pug": "include ./_included1.pug",
        "_included1.pug": "include ./_included2.pug",
        "_included2.pug": "",
        "bar.pug": "extends ./_layout1.pug",
        "_layout1.pug": "extends ./_layout2.pug",
        "_layout2.pug": "",
        "nodeps.pug": ""
      };
      return expect(builder.build())
        .to.eventually.deep.equal({
          "foo.html": "",
          "bar.html": "",
          "nodeps.html": ""
        })
        .then(() => {
          expect(pugNode._stats.cacheHits).to.deep.equal([]);
          expect(pugNode._stats.cacheMisses).to.deep.equal([
            "bar.pug",
            "foo.pug",
            "nodeps.pug"
          ]);

          source.fixture = {
            "_included2.pug": "div"
          };
          return expect(builder.build()).to.eventually.deep.equal({
            "foo.html": "<div></div>",
            "bar.html": "",
            "nodeps.html": ""
          });
        })
        .then(() => {
          expect(pugNode._stats.cacheHits).to.deep.equal([
            "bar.pug",
            "nodeps.pug"
          ]);
          expect(pugNode._stats.cacheMisses).to.deep.equal(["foo.pug"]);

          source.fixture = {
            "_layout2.pug": "div"
          };
          return expect(builder.build()).to.eventually.deep.equal({
            "foo.html": "<div></div>",
            "bar.html": "<div></div>",
            "nodeps.html": ""
          });
        })
        .then(() => {
          expect(pugNode._stats.cacheHits).to.deep.equal([
            "foo.pug",
            "nodeps.pug"
          ]);
          expect(pugNode._stats.cacheMisses).to.deep.equal(["bar.pug"]);

          source.fixture = {
            "nodeps.pug": "div"
          };
          return expect(builder.build()).to.eventually.deep.equal({
            "foo.html": "<div></div>",
            "bar.html": "<div></div>",
            "nodeps.html": "<div></div>"
          });
        })
        .then(() => {
          expect(pugNode._stats.cacheHits).to.deep.equal([
            "bar.pug",
            "foo.pug"
          ]);
          expect(pugNode._stats.cacheMisses).to.deep.equal(["nodeps.pug"]);
        });
    });
  });
});
