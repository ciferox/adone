import * as util from "./util";

describe("glosses", "sourcemap", "consumer", () => {
    const {
        sourcemap: { createConsumer, createGenerator, Consumer, IndexedConsumer, BasicConsumer }
    } = adone;

    specify("that we can instantiate with a string or an object", () => {
        assert.doesNotThrow(() => {
            createConsumer(util.testMap);
        });
        assert.doesNotThrow(() => {
            createConsumer(JSON.stringify(util.testMap));
        });
    });

    specify("that the object returned from new SourceMapConsumer inherits from SourceMapConsumer", () => {
        assert.ok(createConsumer(util.testMap) instanceof Consumer);
    });

    specify("that a BasicSourceMapConsumer is returned for sourcemaps without sections", () => {
        assert.ok(createConsumer(util.testMap) instanceof BasicConsumer);
    });

    specify("that an IndexedSourceMapConsumer is returned for sourcemaps with sections", () => {
        assert.ok(createConsumer(util.indexedTestMap) instanceof IndexedConsumer);
    });

    specify("that the `sources` field has the original sources", () => {
        let map;
        let sources;

        map = createConsumer(util.testMap);
        sources = map.sources;
        assert.equal(sources[0], "/the/root/one.js");
        assert.equal(sources[1], "/the/root/two.js");
        assert.equal(sources.length, 2);

        map = createConsumer(util.indexedTestMap);
        sources = map.sources;
        assert.equal(sources[0], "/the/root/one.js");
        assert.equal(sources[1], "/the/root/two.js");
        assert.equal(sources.length, 2);

        map = createConsumer(util.indexedTestMapDifferentSourceRoots);
        sources = map.sources;
        assert.equal(sources[0], "/the/root/one.js");
        assert.equal(sources[1], "/different/root/two.js");
        assert.equal(sources.length, 2);

        map = createConsumer(util.testMapNoSourceRoot);
        sources = map.sources;
        assert.equal(sources[0], "one.js");
        assert.equal(sources[1], "two.js");
        assert.equal(sources.length, 2);

        map = createConsumer(util.testMapEmptySourceRoot);
        sources = map.sources;
        assert.equal(sources[0], "one.js");
        assert.equal(sources[1], "two.js");
        assert.equal(sources.length, 2);
    });

    specify("that the source root is reflected in a mapping's source field", () => {
        let map;
        let mapping;

        map = createConsumer(util.testMap);

        mapping = map.originalPositionFor({
            line: 2,
            column: 1
        });
        assert.equal(mapping.source, "/the/root/two.js");

        mapping = map.originalPositionFor({
            line: 1,
            column: 1
        });
        assert.equal(mapping.source, "/the/root/one.js");


        map = createConsumer(util.testMapNoSourceRoot);

        mapping = map.originalPositionFor({
            line: 2,
            column: 1
        });
        assert.equal(mapping.source, "two.js");

        mapping = map.originalPositionFor({
            line: 1,
            column: 1
        });
        assert.equal(mapping.source, "one.js");


        map = createConsumer(util.testMapEmptySourceRoot);

        mapping = map.originalPositionFor({
            line: 2,
            column: 1
        });
        assert.equal(mapping.source, "two.js");

        mapping = map.originalPositionFor({
            line: 1,
            column: 1
        });
        assert.equal(mapping.source, "one.js");
    });

    specify("mapping tokens back exactly", () => {
        const map = createConsumer(util.testMap);

        util.assertMapping(1, 1, "/the/root/one.js", 1, 1, null, null, map, assert);
        util.assertMapping(1, 5, "/the/root/one.js", 1, 5, null, null, map, assert);
        util.assertMapping(1, 9, "/the/root/one.js", 1, 11, null, null, map, assert);
        util.assertMapping(1, 18, "/the/root/one.js", 1, 21, "bar", null, map, assert);
        util.assertMapping(1, 21, "/the/root/one.js", 2, 3, null, null, map, assert);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 10, "baz", null, map, assert);
        util.assertMapping(1, 32, "/the/root/one.js", 2, 14, "bar", null, map, assert);

        util.assertMapping(2, 1, "/the/root/two.js", 1, 1, null, null, map, assert);
        util.assertMapping(2, 5, "/the/root/two.js", 1, 5, null, null, map, assert);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 11, null, null, map, assert);
        util.assertMapping(2, 18, "/the/root/two.js", 1, 21, "n", null, map, assert);
        util.assertMapping(2, 21, "/the/root/two.js", 2, 3, null, null, map, assert);
        util.assertMapping(2, 28, "/the/root/two.js", 2, 10, "n", null, map, assert);
    });

    specify("mapping tokens back exactly in indexed source map", () => {
        const map = createConsumer(util.indexedTestMap);

        util.assertMapping(1, 1, "/the/root/one.js", 1, 1, null, null, map, assert);
        util.assertMapping(1, 5, "/the/root/one.js", 1, 5, null, null, map, assert);
        util.assertMapping(1, 9, "/the/root/one.js", 1, 11, null, null, map, assert);
        util.assertMapping(1, 18, "/the/root/one.js", 1, 21, "bar", null, map, assert);
        util.assertMapping(1, 21, "/the/root/one.js", 2, 3, null, null, map, assert);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 10, "baz", null, map, assert);
        util.assertMapping(1, 32, "/the/root/one.js", 2, 14, "bar", null, map, assert);

        util.assertMapping(2, 1, "/the/root/two.js", 1, 1, null, null, map, assert);
        util.assertMapping(2, 5, "/the/root/two.js", 1, 5, null, null, map, assert);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 11, null, null, map, assert);
        util.assertMapping(2, 18, "/the/root/two.js", 1, 21, "n", null, map, assert);
        util.assertMapping(2, 21, "/the/root/two.js", 2, 3, null, null, map, assert);
        util.assertMapping(2, 28, "/the/root/two.js", 2, 10, "n", null, map, assert);
    });

    specify("mapping tokens fuzzy", () => {
        const map = createConsumer(util.testMap);

        // Finding original positions with default (glb) bias.
        util.assertMapping(1, 20, "/the/root/one.js", 1, 21, "bar", null, map, assert, true);
        util.assertMapping(1, 30, "/the/root/one.js", 2, 10, "baz", null, map, assert, true);
        util.assertMapping(2, 12, "/the/root/two.js", 1, 11, null, null, map, assert, true);

        // Finding original positions with lub bias.
        util.assertMapping(1, 16, "/the/root/one.js", 1, 21, "bar", Consumer.LEAST_UPPER_BOUND, map, assert, true);
        util.assertMapping(1, 26, "/the/root/one.js", 2, 10, "baz", Consumer.LEAST_UPPER_BOUND, map, assert, true);
        util.assertMapping(2, 6, "/the/root/two.js", 1, 11, null, Consumer.LEAST_UPPER_BOUND, map, assert, true);

        // Finding generated positions with default (glb) bias.
        util.assertMapping(1, 18, "/the/root/one.js", 1, 22, "bar", null, map, assert, null, true);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 13, "baz", null, map, assert, null, true);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 16, null, null, map, assert, null, true);

        // Finding generated positions with lub bias.
        util.assertMapping(1, 18, "/the/root/one.js", 1, 20, "bar", Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 7, "baz", Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 6, null, Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
    });

    specify("mapping tokens fuzzy in indexed source map", () => {
        const map = createConsumer(util.indexedTestMap);

        // Finding original positions with default (glb) bias.
        util.assertMapping(1, 20, "/the/root/one.js", 1, 21, "bar", null, map, assert, true);
        util.assertMapping(1, 30, "/the/root/one.js", 2, 10, "baz", null, map, assert, true);
        util.assertMapping(2, 12, "/the/root/two.js", 1, 11, null, null, map, assert, true);

        // Finding original positions with lub bias.
        util.assertMapping(1, 16, "/the/root/one.js", 1, 21, "bar", Consumer.LEAST_UPPER_BOUND, map, assert, true);
        util.assertMapping(1, 26, "/the/root/one.js", 2, 10, "baz", Consumer.LEAST_UPPER_BOUND, map, assert, true);
        util.assertMapping(2, 6, "/the/root/two.js", 1, 11, null, Consumer.LEAST_UPPER_BOUND, map, assert, true);

        // Finding generated positions with default (glb) bias.
        util.assertMapping(1, 18, "/the/root/one.js", 1, 22, "bar", null, map, assert, null, true);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 13, "baz", null, map, assert, null, true);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 16, null, null, map, assert, null, true);

        // Finding generated positions with lub bias.
        util.assertMapping(1, 18, "/the/root/one.js", 1, 20, "bar", Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
        util.assertMapping(1, 28, "/the/root/one.js", 2, 7, "baz", Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
        util.assertMapping(2, 9, "/the/root/two.js", 1, 6, null, Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
    });

    specify("mappings and end of lines", () => {
        const smg = createGenerator({
            file: "foo.js"
        });
        smg.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 1 },
            source: "bar.js"
        });
        smg.addMapping({
            original: { line: 2, column: 2 },
            generated: { line: 2, column: 2 },
            source: "bar.js"
        });
        smg.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 1 },
            source: "baz.js"
        });

        const map = BasicConsumer.fromSourceMap(smg);

        // When finding original positions, mappings end at the end of the line.
        util.assertMapping(2, 1, null, null, null, null, null, map, assert, true);

        // When finding generated positions, mappings do not end at the end of the line.
        util.assertMapping(1, 1, "bar.js", 2, 1, null, null, map, assert, null, true);

        // When finding generated positions with, mappings end at the end of the source.
        util.assertMapping(null, null, "bar.js", 3, 1, null, Consumer.LEAST_UPPER_BOUND, map, assert, null, true);
    });

    specify("creating source map consumers with )]}' prefix", () => {
        assert.doesNotThrow(() => {
            createConsumer(`)]}'${JSON.stringify(util.testMap)}`);
        });
    });

    specify("eachMapping", () => {
        let map;

        map = createConsumer(util.testMap);
        let previousLine = -Infinity;
        let previousColumn = -Infinity;
        map.eachMapping((mapping) => {
            assert.ok(mapping.generatedLine >= previousLine);

            assert.ok(mapping.source === "/the/root/one.js" || mapping.source === "/the/root/two.js");

            if (mapping.generatedLine === previousLine) {
                assert.ok(mapping.generatedColumn >= previousColumn);
                previousColumn = mapping.generatedColumn;
            } else {
                previousLine = mapping.generatedLine;
                previousColumn = -Infinity;
            }
        });

        map = createConsumer(util.testMapNoSourceRoot);
        map.eachMapping((mapping) => {
            assert.ok(mapping.source === "one.js" || mapping.source === "two.js");
        });

        map = createConsumer(util.testMapEmptySourceRoot);
        map.eachMapping((mapping) => {
            assert.ok(mapping.source === "one.js" || mapping.source === "two.js");
        });
    });

    specify("eachMapping for indexed source maps", () => {
        const map = createConsumer(util.indexedTestMap);
        let previousLine = -Infinity;
        let previousColumn = -Infinity;
        map.eachMapping((mapping) => {
            assert.ok(mapping.generatedLine >= previousLine);

            if (mapping.source) {
                assert.equal(mapping.source.indexOf(util.testMap.sourceRoot), 0);
            }

            if (mapping.generatedLine === previousLine) {
                assert.ok(mapping.generatedColumn >= previousColumn);
                previousColumn = mapping.generatedColumn;
            } else {
                previousLine = mapping.generatedLine;
                previousColumn = -Infinity;
            }
        });
    });


    specify("iterating over mappings in a different order", () => {
        const map = createConsumer(util.testMap);
        let previousLine = -Infinity;
        let previousColumn = -Infinity;
        let previousSource = "";
        map.eachMapping((mapping) => {
            assert.ok(mapping.source >= previousSource);

            if (mapping.source === previousSource) {
                assert.ok(mapping.originalLine >= previousLine);

                if (mapping.originalLine === previousLine) {
                    assert.ok(mapping.originalColumn >= previousColumn);
                    previousColumn = mapping.originalColumn;
                } else {
                    previousLine = mapping.originalLine;
                    previousColumn = -Infinity;
                }
            } else {
                previousSource = mapping.source;
                previousLine = -Infinity;
                previousColumn = -Infinity;
            }
        }, null, Consumer.ORIGINAL_ORDER);
    });

    specify("iterating over mappings in a different order in indexed source maps", () => {
        const map = createConsumer(util.indexedTestMap);
        let previousLine = -Infinity;
        let previousColumn = -Infinity;
        let previousSource = "";
        map.eachMapping((mapping) => {
            assert.ok(mapping.source >= previousSource);

            if (mapping.source === previousSource) {
                assert.ok(mapping.originalLine >= previousLine);

                if (mapping.originalLine === previousLine) {
                    assert.ok(mapping.originalColumn >= previousColumn);
                    previousColumn = mapping.originalColumn;
                } else {
                    previousLine = mapping.originalLine;
                    previousColumn = -Infinity;
                }
            } else {
                previousSource = mapping.source;
                previousLine = -Infinity;
                previousColumn = -Infinity;
            }
        }, null, Consumer.ORIGINAL_ORDER);
    });

    specify("that we can set the context for `this` in eachMapping", () => {
        const map = createConsumer(util.testMap);
        const context = {};
        map.eachMapping(function each() {
            assert.equal(this, context);
        }, context);
    });

    specify("that we can set the context for `this` in eachMapping in indexed source maps", () => {
        const map = createConsumer(util.indexedTestMap);
        const context = {};
        map.eachMapping(function each() {
            assert.equal(this, context);
        }, context);
    });

    specify("that the `sourcesContent` field has the original sources", () => {
        const map = createConsumer(util.testMapWithSourcesContent);
        const sourcesContent = map.sourcesContent;

        assert.equal(sourcesContent[0], " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(sourcesContent[1], " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.equal(sourcesContent.length, 2);
    });

    specify("that we can get the original sources for the sources", () => {
        const map = createConsumer(util.testMapWithSourcesContent);
        const sources = map.sources;

        assert.equal(map.sourceContentFor(sources[0]), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor(sources[1]), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.equal(map.sourceContentFor("one.js"), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor("two.js"), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.throws(() => {
            map.sourceContentFor("");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("/the/root/three.js");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("three.js");
        }, Error);
    });

    specify("that we can get the original source content with relative source paths", () => {
        const map = createConsumer(util.testMapRelativeSources);
        const sources = map.sources;

        assert.equal(map.sourceContentFor(sources[0]), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor(sources[1]), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.equal(map.sourceContentFor("one.js"), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor("two.js"), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.throws(() => {
            map.sourceContentFor("");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("/the/root/three.js");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("three.js");
        }, Error);
    });

    specify("that we can get the original source content for the sources on an indexed source map", () => {
        const map = createConsumer(util.indexedTestMap);
        const sources = map.sources;

        assert.equal(map.sourceContentFor(sources[0]), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor(sources[1]), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.equal(map.sourceContentFor("one.js"), " ONE.foo = function (bar) {\n   return baz(bar);\n };");
        assert.equal(map.sourceContentFor("two.js"), " TWO.inc = function (n) {\n   return n + 1;\n };");
        assert.throws(() => {
            map.sourceContentFor("");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("/the/root/three.js");
        }, Error);
        assert.throws(() => {
            map.sourceContentFor("three.js");
        }, Error);
    });

    specify("hasContentsOfAllSources, single source with contents", () => {
        // Has one source: foo.js (with contents).
        const mapWithContents = createGenerator();
        mapWithContents.addMapping({
            source: "foo.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        mapWithContents.setSourceContent("foo.js", "content of foo.js");
        const consumer = createConsumer(mapWithContents.toJSON());
        assert.ok(consumer.hasContentsOfAllSources());
    });

    specify("hasContentsOfAllSources, single source without contents", () => {
        // Has one source: foo.js (without contents).
        const mapWithoutContents = createGenerator();
        mapWithoutContents.addMapping({
            source: "foo.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        const consumer = createConsumer(mapWithoutContents.toJSON());
        assert.ok(!consumer.hasContentsOfAllSources());
    });

    specify("hasContentsOfAllSources, two sources with contents", () => {
        // Has two sources: foo.js (with contents) and bar.js (with contents).
        const mapWithBothContents = createGenerator();
        mapWithBothContents.addMapping({
            source: "foo.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        mapWithBothContents.addMapping({
            source: "bar.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        mapWithBothContents.setSourceContent("foo.js", "content of foo.js");
        mapWithBothContents.setSourceContent("bar.js", "content of bar.js");
        const consumer = createConsumer(mapWithBothContents.toJSON());
        assert.ok(consumer.hasContentsOfAllSources());
    });

    specify("hasContentsOfAllSources, two sources one with and one without contents", () => {
        // Has two sources: foo.js (with contents) and bar.js (without contents).
        const mapWithoutSomeContents = createGenerator();
        mapWithoutSomeContents.addMapping({
            source: "foo.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        mapWithoutSomeContents.addMapping({
            source: "bar.js",
            original: { line: 1, column: 10 },
            generated: { line: 1, column: 10 }
        });
        mapWithoutSomeContents.setSourceContent("foo.js", "content of foo.js");
        const consumer = createConsumer(mapWithoutSomeContents.toJSON());
        assert.ok(!consumer.hasContentsOfAllSources());
    });

    specify("sourceRoot + generatedPositionFor", () => {
        let map = createGenerator({
            sourceRoot: "foo/bar",
            file: "baz.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "bang.coffee"
        });
        map.addMapping({
            original: { line: 5, column: 5 },
            generated: { line: 6, column: 6 },
            source: "bang.coffee"
        });
        map = createConsumer(map.toString());

        // Should handle without sourceRoot.
        let pos = map.generatedPositionFor({
            line: 1,
            column: 1,
            source: "bang.coffee"
        });

        assert.equal(pos.line, 2);
        assert.equal(pos.column, 2);

        // Should handle with sourceRoot.
        pos = map.generatedPositionFor({
            line: 1,
            column: 1,
            source: "foo/bar/bang.coffee"
        });

        assert.equal(pos.line, 2);
        assert.equal(pos.column, 2);
    });

    specify("sourceRoot + generatedPositionFor for path above the root", () => {
        let map = createGenerator({
            sourceRoot: "foo/bar",
            file: "baz.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "../bang.coffee"
        });
        map = createConsumer(map.toString());

        // Should handle with sourceRoot.
        const pos = map.generatedPositionFor({
            line: 1,
            column: 1,
            source: "foo/bang.coffee"
        });

        assert.equal(pos.line, 2);
        assert.equal(pos.column, 2);
    });

    specify("allGeneratedPositionsFor for line", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "bar.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 1 },
            generated: { line: 3, column: 2 },
            source: "bar.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 2 },
            generated: { line: 3, column: 3 },
            source: "bar.coffee"
        });
        map.addMapping({
            original: { line: 3, column: 1 },
            generated: { line: 4, column: 2 },
            source: "bar.coffee"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 2,
            source: "bar.coffee"
        });

        assert.equal(mappings.length, 2);
        assert.equal(mappings[0].line, 3);
        assert.equal(mappings[0].column, 2);
        assert.equal(mappings[1].line, 3);
        assert.equal(mappings[1].column, 3);
    });

    specify("allGeneratedPositionsFor for line fuzzy", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "bar.coffee"
        });
        map.addMapping({
            original: { line: 3, column: 1 },
            generated: { line: 4, column: 2 },
            source: "bar.coffee"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 2,
            source: "bar.coffee"
        });

        assert.equal(mappings.length, 1);
        assert.equal(mappings[0].line, 4);
        assert.equal(mappings[0].column, 2);
    });

    specify("allGeneratedPositionsFor for empty source map", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 2,
            source: "bar.coffee"
        });

        assert.equal(mappings.length, 0);
    });

    specify("allGeneratedPositionsFor for column", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 2 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 3 },
            source: "foo.coffee"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 1,
            column: 1,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 2);
        assert.equal(mappings[0].line, 1);
        assert.equal(mappings[0].column, 2);
        assert.equal(mappings[1].line, 1);
        assert.equal(mappings[1].column, 3);
    });

    specify("allGeneratedPositionsFor for column fuzzy", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 2 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 3 },
            source: "foo.coffee"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 1,
            column: 0,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 2);
        assert.equal(mappings[0].line, 1);
        assert.equal(mappings[0].column, 2);
        assert.equal(mappings[1].line, 1);
        assert.equal(mappings[1].column, 3);
    });

    specify("allGeneratedPositionsFor for column on different line fuzzy", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 2, column: 1 },
            generated: { line: 2, column: 2 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 1 },
            generated: { line: 2, column: 3 },
            source: "foo.coffee"
        });
        map = createConsumer(map.toString());

        const mappings = map.allGeneratedPositionsFor({
            line: 1,
            column: 0,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 0);
    });

    specify("computeColumnSpans", () => {
        let map = createGenerator({
            file: "generated.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 1, column: 1 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 1 },
            generated: { line: 2, column: 1 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 2 },
            generated: { line: 2, column: 10 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 2, column: 3 },
            generated: { line: 2, column: 20 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 3, column: 1 },
            generated: { line: 3, column: 1 },
            source: "foo.coffee"
        });
        map.addMapping({
            original: { line: 3, column: 2 },
            generated: { line: 3, column: 2 },
            source: "foo.coffee"
        });
        map = createConsumer(map.toString());

        map.computeColumnSpans();

        let mappings = map.allGeneratedPositionsFor({
            line: 1,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 1);
        assert.equal(mappings[0].lastColumn, Infinity);

        mappings = map.allGeneratedPositionsFor({
            line: 2,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 3);
        assert.equal(mappings[0].lastColumn, 9);
        assert.equal(mappings[1].lastColumn, 19);
        assert.equal(mappings[2].lastColumn, Infinity);

        mappings = map.allGeneratedPositionsFor({
            line: 3,
            source: "foo.coffee"
        });

        assert.equal(mappings.length, 2);
        assert.equal(mappings[0].lastColumn, 1);
        assert.equal(mappings[1].lastColumn, Infinity);
    });

    specify("sourceRoot + originalPositionFor", () => {
        let map = createGenerator({
            sourceRoot: "foo/bar",
            file: "baz.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "bang.coffee"
        });
        map = createConsumer(map.toString());

        const pos = map.originalPositionFor({
            line: 2,
            column: 2
        });

        // Should always have the prepended source root
        assert.equal(pos.source, "foo/bar/bang.coffee");
        assert.equal(pos.line, 1);
        assert.equal(pos.column, 1);
    });

    specify('root has "/" postfix', () => {
        let map = createGenerator({
            sourceRoot: "http://",
            file: "www.example.com/foo.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "www.example.com/original.js"
        });
        map = createConsumer(map.toString());

        const sources = map.sources;
        assert.equal(sources.length, 1);
        assert.equal(sources[0], "http://www.example.com/original.js");
    });

    specify("do not prepend source urls with the `sourceRoot` if the source url is absolute", () => {
        let map = createGenerator({
            sourceRoot: "http://example.com",
            file: "foo.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "http://cdn.example.com/original.js"
        });
        map = createConsumer(map.toString());

        const sources = map.sources;
        assert.equal(sources.length, 1,
            "Should only be one source.");
        assert.equal(sources[0], "http://cdn.example.com/original.js",
            "Should not be joined with the sourceRoot.");
    });

    specify("absolute path, but same host sources", () => {
        let map = createGenerator({
            sourceRoot: "http://example.com/foo/bar",
            file: "foo.js"
        });
        map.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "/original.js"
        });
        map = createConsumer(map.toString());

        const sources = map.sources;
        assert.equal(sources.length, 1,
            "Should only be one source.");
        assert.equal(sources[0], "http://example.com/original.js",
            "Source should be relative the host of the source root.");
    });

    specify("indexed source map errors when sections are out of order by line", () => {
        // Make a deep copy of the indexedTestMap
        const misorderedIndexedTestMap = JSON.parse(JSON.stringify(util.indexedTestMap));

        misorderedIndexedTestMap.sections[0].offset = {
            line: 2,
            column: 0
        };

        assert.throws(() => {
            createConsumer(misorderedIndexedTestMap);
        }, Error);
    });

    specify("original file path is absolute", () => {
        const map = createConsumer({
            version: 3,
            file: "foo.js",
            sourceRoot: "http://example.com/",
            sources: ["/a"],
            names: [],
            mappings: "AACA",
            sourcesContent: ["foo"]
        });

        assert.equal(map.sourceContentFor("a"), "foo");
        assert.equal(map.sourceContentFor("/a"), "foo");
    });

    specify("bug 885597", () => {
        const map = createConsumer({
            version: 3,
            file: "foo.js",
            sourceRoot: "file:///Users/AlGore/Invented/The/Internet/",
            sources: ["/a"],
            names: [],
            mappings: "AACA",
            sourcesContent: ["foo"]
        });

        const s = map.sources[0];
        assert.equal(map.sourceContentFor(s), "foo");
    });

    specify("duplicate sources", () => {
        const map = createConsumer({
            version: 3,
            file: "foo.js",
            sources: ["source1.js", "source1.js", "source3.js"],
            names: [],
            mappings: ";EAAC;;IAEE;;MEEE",
            sourceRoot: "http://example.com"
        });

        let pos = map.originalPositionFor({
            line: 2,
            column: 2
        });
        assert.equal(pos.source, "http://example.com/source1.js");
        assert.equal(pos.line, 1);
        assert.equal(pos.column, 1);

        pos = map.originalPositionFor({
            line: 4,
            column: 4
        });
        assert.equal(pos.source, "http://example.com/source1.js");
        assert.equal(pos.line, 3);
        assert.equal(pos.column, 3);

        pos = map.originalPositionFor({
            line: 6,
            column: 6
        });
        assert.equal(pos.source, "http://example.com/source3.js");
        assert.equal(pos.line, 5);
        assert.equal(pos.column, 5);
    });

    specify("duplicate names", () => {
        const map = createConsumer({
            version: 3,
            file: "foo.js",
            sources: ["source.js"],
            names: ["name1", "name1", "name3"],
            mappings: ";EAACA;;IAEEA;;MAEEE",
            sourceRoot: "http://example.com"
        });

        let pos = map.originalPositionFor({
            line: 2,
            column: 2
        });
        assert.equal(pos.name, "name1");
        assert.equal(pos.line, 1);
        assert.equal(pos.column, 1);

        pos = map.originalPositionFor({
            line: 4,
            column: 4
        });
        assert.equal(pos.name, "name1");
        assert.equal(pos.line, 3);
        assert.equal(pos.column, 3);

        pos = map.originalPositionFor({
            line: 6,
            column: 6
        });
        assert.equal(pos.name, "name3");
        assert.equal(pos.line, 5);
        assert.equal(pos.column, 5);
    });

    specify("SourceMapConsumer.fromSourceMap", () => {
        const smg = createGenerator({
            sourceRoot: "http://example.com/",
            file: "foo.js"
        });
        smg.addMapping({
            original: { line: 1, column: 1 },
            generated: { line: 2, column: 2 },
            source: "bar.js"
        });
        smg.addMapping({
            original: { line: 2, column: 2 },
            generated: { line: 4, column: 4 },
            source: "baz.js",
            name: "dirtMcGirt"
        });
        smg.setSourceContent("baz.js", "baz.js content");

        const smc = BasicConsumer.fromSourceMap(smg);
        assert.equal(smc.file, "foo.js");
        assert.equal(smc.sourceRoot, "http://example.com/");
        assert.equal(smc.sources.length, 2);
        assert.equal(smc.sources[0], "http://example.com/bar.js");
        assert.equal(smc.sources[1], "http://example.com/baz.js");
        assert.equal(smc.sourceContentFor("baz.js"), "baz.js content");

        let pos = smc.originalPositionFor({
            line: 2,
            column: 2
        });
        assert.equal(pos.line, 1);
        assert.equal(pos.column, 1);
        assert.equal(pos.source, "http://example.com/bar.js");
        assert.equal(pos.name, null);

        pos = smc.generatedPositionFor({
            line: 1,
            column: 1,
            source: "http://example.com/bar.js"
        });
        assert.equal(pos.line, 2);
        assert.equal(pos.column, 2);

        pos = smc.originalPositionFor({
            line: 4,
            column: 4
        });
        assert.equal(pos.line, 2);
        assert.equal(pos.column, 2);
        assert.equal(pos.source, "http://example.com/baz.js");
        assert.equal(pos.name, "dirtMcGirt");

        pos = smc.generatedPositionFor({
            line: 2,
            column: 2,
            source: "http://example.com/baz.js"
        });
        assert.equal(pos.line, 4);
        assert.equal(pos.column, 4);
    });

    it("should work", () => {
        const generator = createGenerator({ file: "a.css" });
        generator.addMapping({
            source: "b.css",
            original: {
                line: 1,
                column: 0
            },
            generated: {
                line: 1,
                column: 0
            }
        });

        // Create a SourceMapConsumer from the SourceMapGenerator, ...
        BasicConsumer.fromSourceMap(generator);
        // ... and then try and use the SourceMapGenerator again. This should not
        // throw.
        generator.toJSON();

        assert.ok(true, "Using a SourceMapGenerator again after creating a " +
            "SourceMapConsumer from it should not throw");
    });

    specify("sources where their prefix is the source root", () => {
        const testSourceMap = {
            version: 3,
            sources: ["/source/app/app/app.js"],
            names: ["System"],
            mappings: "AAAAA",
            file: "app/app.js",
            sourcesContent: ["'use strict';"],
            sourceRoot: "/source/"
        };

        const consumer = createConsumer(testSourceMap);

        const consumerHasSource = (s) => {
            assert.ok(consumer.sourceContentFor(s));
        };

        consumer.sources.forEach(consumerHasSource);
        testSourceMap.sources.forEach(consumerHasSource);
    });

    specify("sources where their prefix is the source root and the source root is a url", () => {
        const testSourceMap = {
            version: 3,
            sources: ["http://example.com/source/app/app/app.js"],
            names: ["System"],
            mappings: "AAAAA",
            sourcesContent: ["'use strict';"],
            sourceRoot: "http://example.com/source/"
        };

        const consumer = createConsumer(testSourceMap);

        const consumerHasSource = (s) => {
            assert.ok(consumer.sourceContentFor(s));
        };

        consumer.sources.forEach(consumerHasSource);
        testSourceMap.sources.forEach(consumerHasSource);
    });

    specify("consuming names and sources that are numbers", () => {
        const testSourceMap = {
            version: 3,
            sources: [0],
            names: [1],
            mappings: "AAAAA"
        };

        const consumer = createConsumer(testSourceMap);

        assert.equal(consumer.sources.length, 1);
        assert.equal(consumer.sources[0], "0");

        let i = 0;
        consumer.eachMapping((m) => {
            i++;
            assert.equal(m.name, "1");
        });
        assert.equal(i, 1);
    });
});
