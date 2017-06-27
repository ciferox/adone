import * as util from "./util";

describe("sourcemap", "generator", () => {
    const {
        sourcemap: {
            createConsumer,
            createGenerator,
            Generator: SourceMapGenerator,
            Node: SourceNode
        }
    } = adone;

    specify("some simple stuff", () => {
        let map = createGenerator({
            file: "foo.js",
            sourceRoot: "."
        }).toJSON();
        assert.ok("file" in map);
        assert.ok("sourceRoot" in map);

        map = createGenerator().toJSON();
        assert.ok(!("file" in map));
        assert.ok(!("sourceRoot" in map));
    });

    specify("JSON serialization", () => {
        const map = createGenerator({
            file: "foo.js",
            sourceRoot: "."
        });
        assert.equal(map.toString(), JSON.stringify(map));
    });

    specify("adding mappings (case 1)", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: "."
        });

        assert.doesNotThrow(() => {
            map.addMapping({
                generated: { line: 1, column: 1 }
            });
        });
    });

    specify("adding mappings (case 2)", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: "."
        });

        assert.doesNotThrow(() => {
            map.addMapping({
                generated: { line: 1, column: 1 },
                source: "bar.js",
                original: { line: 1, column: 1 }
            });
        });
    });

    specify("adding mappings (case 3)", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: "."
        });

        assert.doesNotThrow(() => {
            map.addMapping({
                generated: { line: 1, column: 1 },
                source: "bar.js",
                original: { line: 1, column: 1 },
                name: "someToken"
            });
        });
    });

    specify("adding mappings (invalid)", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: "."
        });

        // Not enough info.
        assert.throws(() => {
            map.addMapping({});
        });

        // Original file position, but no source.
        assert.throws(() => {
            map.addMapping({
                generated: { line: 1, column: 1 },
                original: { line: 1, column: 1 }
            });
        });
    });

    specify("adding mappings with skipValidation", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: ".",
            skipValidation: true
        });

        // Not enough info, caught by `util.getArgs`
        assert.throws(() => {
            map.addMapping({});
        });

        // Original file position, but no source. Not checked.
        assert.doesNotThrow(() => {
            map.addMapping({
                generated: { line: 1, column: 1 },
                original: { line: 1, column: 1 }
            });
        });
    });

    specify("that the correct mappings are being generated", () => {
        let map = createGenerator({
            file: "min.js",
            sourceRoot: "/the/root"
        });

        map.addMapping({
            generated: { line: 1, column: 1 },
            original: { line: 1, column: 1 },
            source: "one.js"
        });
        map.addMapping({
            generated: { line: 1, column: 5 },
            original: { line: 1, column: 5 },
            source: "one.js"
        });
        map.addMapping({
            generated: { line: 1, column: 9 },
            original: { line: 1, column: 11 },
            source: "one.js"
        });
        map.addMapping({
            generated: { line: 1, column: 18 },
            original: { line: 1, column: 21 },
            source: "one.js",
            name: "bar"
        });
        map.addMapping({
            generated: { line: 1, column: 21 },
            original: { line: 2, column: 3 },
            source: "one.js"
        });
        map.addMapping({
            generated: { line: 1, column: 28 },
            original: { line: 2, column: 10 },
            source: "one.js",
            name: "baz"
        });
        map.addMapping({
            generated: { line: 1, column: 32 },
            original: { line: 2, column: 14 },
            source: "one.js",
            name: "bar"
        });

        map.addMapping({
            generated: { line: 2, column: 1 },
            original: { line: 1, column: 1 },
            source: "two.js"
        });
        map.addMapping({
            generated: { line: 2, column: 5 },
            original: { line: 1, column: 5 },
            source: "two.js"
        });
        map.addMapping({
            generated: { line: 2, column: 9 },
            original: { line: 1, column: 11 },
            source: "two.js"
        });
        map.addMapping({
            generated: { line: 2, column: 18 },
            original: { line: 1, column: 21 },
            source: "two.js",
            name: "n"
        });
        map.addMapping({
            generated: { line: 2, column: 21 },
            original: { line: 2, column: 3 },
            source: "two.js"
        });
        map.addMapping({
            generated: { line: 2, column: 28 },
            original: { line: 2, column: 10 },
            source: "two.js",
            name: "n"
        });

        map = JSON.parse(map.toString());

        util.assertEqualMaps(assert, map, util.testMap);
    });

    specify("that adding a mapping with an empty string name does not break generation", () => {
        const map = createGenerator({
            file: "generated-foo.js",
            sourceRoot: "."
        });

        map.addMapping({
            generated: { line: 1, column: 1 },
            source: "bar.js",
            original: { line: 1, column: 1 },
            name: ""
        });

        assert.doesNotThrow(() => {
            JSON.parse(map.toString());
        });
    });

    specify("that source content can be set", () => {
        let map = createGenerator({
            file: "min.js",
            sourceRoot: "/the/root"
        });
        map.addMapping({
            generated: { line: 1, column: 1 },
            original: { line: 1, column: 1 },
            source: "one.js"
        });
        map.addMapping({
            generated: { line: 2, column: 1 },
            original: { line: 1, column: 1 },
            source: "two.js"
        });
        map.setSourceContent("one.js", "one file content");

        map = JSON.parse(map.toString());
        assert.equal(map.sources[0], "one.js");
        assert.equal(map.sources[1], "two.js");
        assert.equal(map.sourcesContent[0], "one file content");
        assert.equal(map.sourcesContent[1], null);
    });

    specify(".fromSourceMap", () => {
        const map = SourceMapGenerator.fromSourceMap(createConsumer(util.testMap));
        util.assertEqualMaps(assert, map.toJSON(), util.testMap);
    });

    specify(".fromSourceMap with sourcesContent", () => {
        const map = SourceMapGenerator.fromSourceMap(
            createConsumer(util.testMapWithSourcesContent));
        util.assertEqualMaps(assert, map.toJSON(), util.testMapWithSourcesContent);
    });

    specify("applySourceMap", () => {
        let node = new SourceNode(null, null, null, [
            new SourceNode(2, 0, "fileX", "lineX2\n"),
            "genA1\n",
            new SourceNode(2, 0, "fileY", "lineY2\n"),
            "genA2\n",
            new SourceNode(1, 0, "fileX", "lineX1\n"),
            "genA3\n",
            new SourceNode(1, 0, "fileY", "lineY1\n")
        ]);
        let mapStep1 = node.toStringWithSourceMap({
            file: "fileA"
        }).map;
        mapStep1.setSourceContent("fileX", "lineX1\nlineX2\n");
        mapStep1 = mapStep1.toJSON();

        node = new SourceNode(null, null, null, [
            "gen1\n",
            new SourceNode(1, 0, "fileA", "lineA1\n"),
            new SourceNode(2, 0, "fileA", "lineA2\n"),
            new SourceNode(3, 0, "fileA", "lineA3\n"),
            new SourceNode(4, 0, "fileA", "lineA4\n"),
            new SourceNode(1, 0, "fileB", "lineB1\n"),
            new SourceNode(2, 0, "fileB", "lineB2\n"),
            "gen2\n"
        ]);
        let mapStep2 = node.toStringWithSourceMap({
            file: "fileGen"
        }).map;
        mapStep2.setSourceContent("fileB", "lineB1\nlineB2\n");
        mapStep2 = mapStep2.toJSON();

        node = new SourceNode(null, null, null, [
            "gen1\n",
            new SourceNode(2, 0, "fileX", "lineA1\n"),
            new SourceNode(2, 0, "fileA", "lineA2\n"),
            new SourceNode(2, 0, "fileY", "lineA3\n"),
            new SourceNode(4, 0, "fileA", "lineA4\n"),
            new SourceNode(1, 0, "fileB", "lineB1\n"),
            new SourceNode(2, 0, "fileB", "lineB2\n"),
            "gen2\n"
        ]);
        let expectedMap = node.toStringWithSourceMap({
            file: "fileGen"
        }).map;
        expectedMap.setSourceContent("fileX", "lineX1\nlineX2\n");
        expectedMap.setSourceContent("fileB", "lineB1\nlineB2\n");
        expectedMap = expectedMap.toJSON();

        // apply source map "mapStep1" to "mapStep2"
        const generator = SourceMapGenerator.fromSourceMap(createConsumer(mapStep2));
        generator.applySourceMap(createConsumer(mapStep1));
        const actualMap = generator.toJSON();

        util.assertEqualMaps(assert, actualMap, expectedMap);
    });

    specify("applySourceMap throws when file is missing", () => {
        const map = createGenerator({
            file: "test.js"
        });
        const map2 = createGenerator();
        assert.throws(() => {
            map.applySourceMap(createConsumer(map2.toJSON()));
        });
    });

    specify("the two additional parameters of applySourceMap", () => {
        // Assume the following directory structure:
        //
        // http://foo.org/
        //   bar.coffee
        //   app/
        //     coffee/
        //       foo.coffee
        //     temp/
        //       bundle.js
        //       temp_maps/
        //         bundle.js.map
        //     public/
        //       bundle.min.js
        //       bundle.min.js.map
        //
        // http://www.example.com/
        //   baz.coffee

        let bundleMap = createGenerator({
            file: "bundle.js"
        });
        bundleMap.addMapping({
            generated: { line: 3, column: 3 },
            original: { line: 2, column: 2 },
            source: "../../coffee/foo.coffee"
        });
        bundleMap.setSourceContent("../../coffee/foo.coffee", "foo coffee");
        bundleMap.addMapping({
            generated: { line: 13, column: 13 },
            original: { line: 12, column: 12 },
            source: "/bar.coffee"
        });
        bundleMap.setSourceContent("/bar.coffee", "bar coffee");
        bundleMap.addMapping({
            generated: { line: 23, column: 23 },
            original: { line: 22, column: 22 },
            source: "http://www.example.com/baz.coffee"
        });
        bundleMap.setSourceContent(
            "http://www.example.com/baz.coffee",
            "baz coffee"
        );
        bundleMap = createConsumer(bundleMap.toJSON());

        let minifiedMap = createGenerator({
            file: "bundle.min.js",
            sourceRoot: ".."
        });
        minifiedMap.addMapping({
            generated: { line: 1, column: 1 },
            original: { line: 3, column: 3 },
            source: "temp/bundle.js"
        });
        minifiedMap.addMapping({
            generated: { line: 11, column: 11 },
            original: { line: 13, column: 13 },
            source: "temp/bundle.js"
        });
        minifiedMap.addMapping({
            generated: { line: 21, column: 21 },
            original: { line: 23, column: 23 },
            source: "temp/bundle.js"
        });
        minifiedMap = createConsumer(minifiedMap.toJSON());

        const expectedMap = function (sources) {
            const map = createGenerator({
                file: "bundle.min.js",
                sourceRoot: ".."
            });
            map.addMapping({
                generated: { line: 1, column: 1 },
                original: { line: 2, column: 2 },
                source: sources[0]
            });
            map.setSourceContent(sources[0], "foo coffee");
            map.addMapping({
                generated: { line: 11, column: 11 },
                original: { line: 12, column: 12 },
                source: sources[1]
            });
            map.setSourceContent(sources[1], "bar coffee");
            map.addMapping({
                generated: { line: 21, column: 21 },
                original: { line: 22, column: 22 },
                source: sources[2]
            });
            map.setSourceContent(sources[2], "baz coffee");
            return map.toJSON();
        };

        const actualMap = function (aSourceMapPath) {
            const map = SourceMapGenerator.fromSourceMap(minifiedMap);
            // Note that relying on `bundleMap.file` (which is simply 'bundle.js')
            // instead of supplying the second parameter wouldn't work here.
            map.applySourceMap(bundleMap, "../temp/bundle.js", aSourceMapPath);
            return map.toJSON();
        };

        util.assertEqualMaps(assert, actualMap("../temp/temp_maps"), expectedMap([
            "coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        util.assertEqualMaps(assert, actualMap("/app/temp/temp_maps"), expectedMap([
            "/app/coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        util.assertEqualMaps(assert, actualMap("http://foo.org/app/temp/temp_maps"), expectedMap([
            "http://foo.org/app/coffee/foo.coffee",
            "http://foo.org/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        // If the third parameter is omitted or set to the current working
        // directory we get incorrect source paths:

        util.assertEqualMaps(assert, actualMap(), expectedMap([
            "../coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        util.assertEqualMaps(assert, actualMap(""), expectedMap([
            "../coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        util.assertEqualMaps(assert, actualMap("."), expectedMap([
            "../coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));

        util.assertEqualMaps(assert, actualMap("./"), expectedMap([
            "../coffee/foo.coffee",
            "/bar.coffee",
            "http://www.example.com/baz.coffee"
        ]));
    });

    specify("applySourceMap name handling", () => {
        // Imagine some CoffeeScript code being compiled into JavaScript and then
        // minified.

        const assertName = function (coffeeName, jsName, expectedName) {
            const minifiedMap = createGenerator({
                file: "test.js.min"
            });
            minifiedMap.addMapping({
                generated: { line: 1, column: 4 },
                original: { line: 1, column: 4 },
                source: "test.js",
                name: jsName
            });

            const coffeeMap = createGenerator({
                file: "test.js"
            });
            coffeeMap.addMapping({
                generated: { line: 1, column: 4 },
                original: { line: 1, column: 0 },
                source: "test.coffee",
                name: coffeeName
            });

            minifiedMap.applySourceMap(createConsumer(coffeeMap.toJSON()));

            createConsumer(minifiedMap.toJSON()).eachMapping((mapping) => {
                assert.equal(mapping.name, expectedName);
            });
        };

        // `foo = 1` -> `var foo = 1;` -> `var a=1`
        // CoffeeScript doesn’t rename variables, so there’s no need for it to
        // provide names in its source maps. Minifiers do rename variables and
        // therefore do provide names in their source maps. So that name should be
        // retained if the original map lacks names.
        assertName(null, "foo", "foo");

        // `foo = 1` -> `var coffee$foo = 1;` -> `var a=1`
        // Imagine that CoffeeScript prefixed all variables with `coffee$`. Even
        // though the minifier then also provides a name, the original name is
        // what corresponds to the source.
        assertName("foo", "coffee$foo", "foo");

        // `foo = 1` -> `var coffee$foo = 1;` -> `var coffee$foo=1`
        // Minifiers can turn off variable mangling. Then there’s no need to
        // provide names in the source map, but the names from the original map are
        // still needed.
        assertName("foo", null, "foo");

        // `foo = 1` -> `var foo = 1;` -> `var foo=1`
        // No renaming at all.
        assertName(null, null, null);
    });

    specify("sorting with duplicate generated mappings", () => {
        const map = createGenerator({
            file: "test.js"
        });
        map.addMapping({
            generated: { line: 3, column: 0 },
            original: { line: 2, column: 0 },
            source: "a.js"
        });
        map.addMapping({
            generated: { line: 2, column: 0 }
        });
        map.addMapping({
            generated: { line: 2, column: 0 }
        });
        map.addMapping({
            generated: { line: 1, column: 0 },
            original: { line: 1, column: 0 },
            source: "a.js"
        });

        util.assertEqualMaps(assert, map.toJSON(), {
            version: 3,
            file: "test.js",
            sources: ["a.js"],
            names: [],
            mappings: "AAAA;A;AACA"
        });
    });

    specify("ignore duplicate mappings.", () => {
        const init = { file: "min.js", sourceRoot: "/the/root" };

        // null original source location
        const nullMapping1 = {
            generated: { line: 1, column: 0 }
        };
        const nullMapping2 = {
            generated: { line: 2, column: 2 }
        };

        let map1 = createGenerator(init);
        let map2 = createGenerator(init);

        map1.addMapping(nullMapping1);
        map1.addMapping(nullMapping1);

        map2.addMapping(nullMapping1);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());

        map1.addMapping(nullMapping2);
        map1.addMapping(nullMapping1);

        map2.addMapping(nullMapping2);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());

        // original source location
        const srcMapping1 = {
            generated: { line: 1, column: 0 },
            original: { line: 11, column: 0 },
            source: "srcMapping1.js"
        };
        const srcMapping2 = {
            generated: { line: 2, column: 2 },
            original: { line: 11, column: 0 },
            source: "srcMapping2.js"
        };

        map1 = createGenerator(init);
        map2 = createGenerator(init);

        map1.addMapping(srcMapping1);
        map1.addMapping(srcMapping1);

        map2.addMapping(srcMapping1);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());

        map1.addMapping(srcMapping2);
        map1.addMapping(srcMapping1);

        map2.addMapping(srcMapping2);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());

        // full original source and name information
        const fullMapping1 = {
            generated: { line: 1, column: 0 },
            original: { line: 11, column: 0 },
            source: "fullMapping1.js",
            name: "fullMapping1"
        };
        const fullMapping2 = {
            generated: { line: 2, column: 2 },
            original: { line: 11, column: 0 },
            source: "fullMapping2.js",
            name: "fullMapping2"
        };

        map1 = createGenerator(init);
        map2 = createGenerator(init);

        map1.addMapping(fullMapping1);
        map1.addMapping(fullMapping1);

        map2.addMapping(fullMapping1);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());

        map1.addMapping(fullMapping2);
        map1.addMapping(fullMapping1);

        map2.addMapping(fullMapping2);

        util.assertEqualMaps(assert, map1.toJSON(), map2.toJSON());
    });

    specify("check for duplicate names or sources", () => {
        const map = createGenerator({
            file: "test.js"
        });
        map.addMapping({
            generated: { line: 1, column: 1 },
            original: { line: 2, column: 2 },
            source: "a.js",
            name: "foo"
        });
        map.addMapping({
            generated: { line: 3, column: 3 },
            original: { line: 4, column: 4 },
            source: "a.js",
            name: "foo"
        });
        util.assertEqualMaps(assert, map.toJSON(), {
            version: 3,
            file: "test.js",
            sources: ["a.js"],
            names: ["foo"],
            mappings: "CACEA;;GAEEA"
        });
    });

    specify("setting sourcesContent to null when already null", () => {
        const smg = createGenerator({ file: "foo.js" });
        assert.doesNotThrow(() => {
            smg.setSourceContent("bar.js", null);
        });
    });

    specify("applySourceMap with unexact match", () => {
        const map1 = createGenerator({
            file: "bundled-source"
        });
        map1.addMapping({
            generated: { line: 1, column: 4 },
            original: { line: 1, column: 4 },
            source: "transformed-source"
        });
        map1.addMapping({
            generated: { line: 2, column: 4 },
            original: { line: 2, column: 4 },
            source: "transformed-source"
        });

        const map2 = createGenerator({
            file: "transformed-source"
        });
        map2.addMapping({
            generated: { line: 2, column: 0 },
            original: { line: 1, column: 0 },
            source: "original-source"
        });

        const expectedMap = createGenerator({
            file: "bundled-source"
        });
        expectedMap.addMapping({
            generated: { line: 1, column: 4 },
            original: { line: 1, column: 4 },
            source: "transformed-source"
        });
        expectedMap.addMapping({
            generated: { line: 2, column: 4 },
            original: { line: 1, column: 0 },
            source: "original-source"
        });

        map1.applySourceMap(createConsumer(map2.toJSON()));

        util.assertEqualMaps(assert, map1.toJSON(), expectedMap.toJSON());
    });

    it("should not de-duplicate mappings", () => {
        const generator = createGenerator();
        generator.addMapping({
            source: "a.js",
            generated: { line: 1, column: 10 },
            original: { line: 1, column: 10 }
        });
        generator.addMapping({
            source: "b.js",
            generated: { line: 1, column: 10 },
            original: { line: 2, column: 20 }
        });

        const consumer = createConsumer(generator.toJSON());

        let n = 0;
        consumer.eachMapping(() => {
            n++;
        });

        assert.equal(n, 2, "Should not de-duplicate mappings that have the same generated positions, but different original positions.");
    });

    specify("numeric names", () => {
        const generator = createGenerator();
        generator.addMapping({
            source: "a.js",
            generated: { line: 1, column: 10 },
            original: { line: 1, column: 10 },
            name: 8
        });
        const map = generator.toJSON();
        assert.ok(map, "Adding a mapping with a numeric name did not throw");
        assert.equal(map.names.length, 1, "Should have one name");
        assert.equal(map.names[0], "8", "Should have the right name");
    });
});
