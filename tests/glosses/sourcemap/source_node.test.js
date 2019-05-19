const {
    sourcemap: { SourceMapGenerator, SourceMapConsumer, SourceNode }
} = adone;

const util = require("./util");

const forEachNewline = (fn) => function () {
    ["\n", "\r\n"].forEach(fn.bind(null));
};


describe("SourceNode", () => {
    it("test .add()", () => {
        const node = new SourceNode(null, null, null);

        // Adding a string works.
        node.add("function noop() {}");

        // Adding another source node works.
        node.add(new SourceNode(null, null, null));

        // Adding an array works.
        node.add(["function foo() {",
            new SourceNode(null, null, null,
                "return 10;"),
            "}"]);

        // Adding other stuff doesn't.
        assert.throws(() => {
            node.add({});
        });
        assert.throws(() => {
            node.add(() => { });
        });
    });

    it("test .prepend()", () => {
        const node = new SourceNode(null, null, null);

        // Prepending a string works.
        node.prepend("function noop() {}");
        assert.equal(node.children[0], "function noop() {}");
        assert.equal(node.children.length, 1);

        // Prepending another source node works.
        node.prepend(new SourceNode(null, null, null));
        assert.equal(node.children[0], "");
        assert.equal(node.children[1], "function noop() {}");
        assert.equal(node.children.length, 2);

        // Prepending an array works.
        node.prepend(["function foo() {",
            new SourceNode(null, null, null,
                "return 10;"),
            "}"]);
        assert.equal(node.children[0], "function foo() {");
        assert.equal(node.children[1], "return 10;");
        assert.equal(node.children[2], "}");
        assert.equal(node.children[3], "");
        assert.equal(node.children[4], "function noop() {}");
        assert.equal(node.children.length, 5);

        // Prepending other stuff doesn't.
        assert.throws(() => {
            node.prepend({});
        });
        assert.throws(() => {
            node.prepend(() => { });
        });
    });

    it("test .toString()", () => {
        assert.equal((new SourceNode(null, null, null,
            ["function foo() {",
                new SourceNode(null, null, null, "return 10;"),
                "}"])).toString(),
            "function foo() {return 10;}");
    });

    it("test .join()", () => {
        assert.equal((new SourceNode(null, null, null,
            ["a", "b", "c", "d"])).join(", ").toString(),
            "a, b, c, d");
    });

    it("test .walk()", () => {
        const node = new SourceNode(null, null, null,
            ["(function () {\n",
                "  ", new SourceNode(1, 0, "a.js", ["someCall()"]), ";\n",
                "  ", new SourceNode(2, 0, "b.js", ["if (foo) bar()"]), ";\n",
                "}());"]);
        const expected = [
            { str: "(function () {\n", source: null, line: null, column: null },
            { str: "  ", source: null, line: null, column: null },
            { str: "someCall()", source: "a.js", line: 1, column: 0 },
            { str: ";\n", source: null, line: null, column: null },
            { str: "  ", source: null, line: null, column: null },
            { str: "if (foo) bar()", source: "b.js", line: 2, column: 0 },
            { str: ";\n", source: null, line: null, column: null },
            { str: "}());", source: null, line: null, column: null }
        ];
        let i = 0;
        node.walk((chunk, loc) => {
            assert.equal(expected[i].str, chunk);
            assert.equal(expected[i].source, loc.source);
            assert.equal(expected[i].line, loc.line);
            assert.equal(expected[i].column, loc.column);
            i++;
        });
    });

    it("test .replaceRight", () => {
        let node;

        // Not nested
        node = new SourceNode(null, null, null, "hello world");
        node.replaceRight(/world/, "universe");
        assert.equal(node.toString(), "hello universe");

        // Nested
        node = new SourceNode(null, null, null,
            [new SourceNode(null, null, null, "hey sexy mama, "),
            new SourceNode(null, null, null, "want to kill all humans?")]);
        node.replaceRight(/kill all humans/, "watch Futurama");
        assert.equal(node.toString(), "hey sexy mama, want to watch Futurama?");
    });

    it("test .toStringWithSourceMap()", forEachNewline((nl) => {
        const node = new SourceNode(null, null, null,
            [`(function () {${nl}`,
                "  ",
            new SourceNode(1, 0, "a.js", "someCall", "originalCall"),
            new SourceNode(1, 8, "a.js", "()"),
            `;${nl}`,
                "  ", new SourceNode(2, 0, "b.js", ["if (foo) bar()"]), `;${nl}`,
                "}());"]);
        const result = node.toStringWithSourceMap({
            file: "foo.js"
        });

        assert.equal(result.code, [
            "(function () {",
            "  someCall();",
            "  if (foo) bar();",
            "}());"
        ].join(nl));

        let map = result.map;
        const mapWithoutOptions = node.toStringWithSourceMap().map;

        assert.ok(map instanceof SourceMapGenerator, "map instanceof SourceMapGenerator");
        assert.ok(mapWithoutOptions instanceof SourceMapGenerator, "mapWithoutOptions instanceof SourceMapGenerator");
        assert.ok(!("file" in mapWithoutOptions));
        mapWithoutOptions._file = "foo.js";
        util.assertEqualMaps(map.toJSON(), mapWithoutOptions.toJSON());

        map = new SourceMapConsumer(map.toString());

        let actual;

        actual = map.originalPositionFor({
            line: 1,
            column: 4
        });
        assert.equal(actual.source, null);
        assert.equal(actual.line, null);
        assert.equal(actual.column, null);

        actual = map.originalPositionFor({
            line: 2,
            column: 2
        });
        assert.equal(actual.source, "a.js");
        assert.equal(actual.line, 1);
        assert.equal(actual.column, 0);
        assert.equal(actual.name, "originalCall");

        actual = map.originalPositionFor({
            line: 3,
            column: 2
        });
        assert.equal(actual.source, "b.js");
        assert.equal(actual.line, 2);
        assert.equal(actual.column, 0);

        actual = map.originalPositionFor({
            line: 3,
            column: 16
        });
        assert.equal(actual.source, null);
        assert.equal(actual.line, null);
        assert.equal(actual.column, null);

        actual = map.originalPositionFor({
            line: 4,
            column: 2
        });
        assert.equal(actual.source, null);
        assert.equal(actual.line, null);
        assert.equal(actual.column, null);
    }));

    it("test .fromStringWithSourceMap()", forEachNewline((nl) => {
        const testCode = util.testGeneratedCode.replace(/\n/g, nl);
        const node = SourceNode.fromStringWithSourceMap(
            testCode,
            new SourceMapConsumer(util.testMap));

        const result = node.toStringWithSourceMap({
            file: "min.js"
        });
        let map = result.map;
        const code = result.code;

        assert.equal(code, testCode);
        assert.ok(map instanceof SourceMapGenerator, "map instanceof SourceMapGenerator");
        map = map.toJSON();
        assert.equal(map.version, util.testMap.version);
        assert.equal(map.file, util.testMap.file);
        assert.equal(map.mappings, util.testMap.mappings);
    }));

    it("test .fromStringWithSourceMap() empty map", forEachNewline((nl) => {
        const node = SourceNode.fromStringWithSourceMap(
            util.testGeneratedCode.replace(/\n/g, nl),
            new SourceMapConsumer(util.emptyMap));
        const result = node.toStringWithSourceMap({
            file: "min.js"
        });
        let map = result.map;
        const code = result.code;

        assert.equal(code, util.testGeneratedCode.replace(/\n/g, nl));
        assert.ok(map instanceof SourceMapGenerator, "map instanceof SourceMapGenerator");
        map = map.toJSON();
        assert.equal(map.version, util.emptyMap.version);
        assert.equal(map.file, util.emptyMap.file);
        assert.equal(map.mappings.length, util.emptyMap.mappings.length);
        assert.equal(map.mappings, util.emptyMap.mappings);
    }));

    it("test .fromStringWithSourceMap() complex version", forEachNewline((nl) => {
        let input = new SourceNode(null, null, null, [
            `(function() {${nl}`,
            `  var Test = {};${nl}`,
            "  ", new SourceNode(1, 0, "a.js", `Test.A = { value: 1234 };${nl}`),
            "  ", new SourceNode(2, 0, "a.js", "Test.A.x = 'xyz';"), nl,
            `}());${nl}`,
            "/* Generated Source */"]);
        input = input.toStringWithSourceMap({
            file: "foo.js"
        });

        const node = SourceNode.fromStringWithSourceMap(
            input.code,
            new SourceMapConsumer(input.map.toString()));

        const result = node.toStringWithSourceMap({
            file: "foo.js"
        });
        let map = result.map;
        const code = result.code;

        assert.equal(code, input.code);
        assert.ok(map instanceof SourceMapGenerator, "map instanceof SourceMapGenerator");
        map = map.toJSON();
        const inputMap = input.map.toJSON();
        util.assertEqualMaps(map, inputMap);
    }));

    it("test .fromStringWithSourceMap() third argument", () => {
        // Assume the following directory structure:
        //
        // http://foo.org/
        //   app/
        //     coffee/
        //       foo.coffee
        //       coffeeBundle.js # Made from {foo,bar,baz}.coffee
        //       maps/
        //         coffeeBundle.js.map
        //     js/
        //       foo.js
        //     public/
        //       app.js # Made from {foo,coffeeBundle}.js
        //       app.js.map

        let coffeeBundle = new SourceNode(1, 0, "foo.coffee", "foo(coffee);\n");
        coffeeBundle.setSourceContent("foo.coffee", "foo coffee");
        coffeeBundle = coffeeBundle.toStringWithSourceMap({
            file: "foo.js",
            sourceRoot: ".."
        });

        const foo = new SourceNode(1, 0, "foo.js", "foo(js);");

        const test = function (relativePath, expectedSources) {
            const app = new SourceNode();
            app.add(SourceNode.fromStringWithSourceMap(
                coffeeBundle.code,
                new SourceMapConsumer(coffeeBundle.map.toString()),
                relativePath));
            app.add(foo);
            let i = 0;
            app.walk((chunk, loc) => {
                assert.equal(loc.source, expectedSources[i]);
                i++;
            });
            app.walkSourceContents((sourceFile, sourceContent) => {
                assert.equal(sourceFile, expectedSources[0]);
                assert.equal(sourceContent, "foo coffee");
            });
        };

        test("../coffee/maps", [
            "../coffee/foo.coffee",
            "foo.js"
        ]);

        // If the third parameter is omitted or set to the current working
        // directory we get incorrect source paths:

        test(undefined, [
            "../foo.coffee",
            "foo.js"
        ]);

        test("", [
            "../foo.coffee",
            "foo.js"
        ]);

        test(".", [
            "../foo.coffee",
            "foo.js"
        ]);

        test("./", [
            "../foo.coffee",
            "foo.js"
        ]);
    });

    it("test .toStringWithSourceMap() merging duplicate mappings", forEachNewline((nl) => {
        let input = new SourceNode(null, null, null, [
            new SourceNode(1, 0, "a.js", "(function"),
            new SourceNode(1, 0, "a.js", `() {${nl}`),
            "  ",
            new SourceNode(1, 0, "a.js", "var Test = "),
            new SourceNode(1, 0, "b.js", `{};${nl}`),
            new SourceNode(2, 0, "b.js", "Test"),
            new SourceNode(2, 0, "b.js", ".A", "A"),
            new SourceNode(2, 20, "b.js", " = { value: ", "A"),
            "1234",
            new SourceNode(2, 40, "b.js", ` };${nl}`, "A"),
            `}());${nl}`,
            "/* Generated Source */"
        ]);
        input = input.toStringWithSourceMap({
            file: "foo.js"
        });

        assert.equal(input.code, [
            "(function() {",
            "  var Test = {};",
            "Test.A = { value: 1234 };",
            "}());",
            "/* Generated Source */"
        ].join(nl));

        let correctMap = new SourceMapGenerator({
            file: "foo.js"
        });
        correctMap.addMapping({
            generated: { line: 1, column: 0 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        // Here is no need for a empty mapping,
        // because mappings ends at eol
        correctMap.addMapping({
            generated: { line: 2, column: 2 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 2, column: 13 },
            source: "b.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 3, column: 0 },
            source: "b.js",
            original: { line: 2, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 3, column: 4 },
            source: "b.js",
            name: "A",
            original: { line: 2, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 3, column: 6 },
            source: "b.js",
            name: "A",
            original: { line: 2, column: 20 }
        });
        // This empty mapping is required,
        // because there is a hole in the middle of the line
        correctMap.addMapping({
            generated: { line: 3, column: 18 }
        });
        correctMap.addMapping({
            generated: { line: 3, column: 22 },
            source: "b.js",
            name: "A",
            original: { line: 2, column: 40 }
        });
        // Here is no need for a empty mapping,
        // because mappings ends at eol

        const inputMap = input.map.toJSON();
        correctMap = correctMap.toJSON();
        util.assertEqualMaps(inputMap, correctMap);
    }));

    it("test .toStringWithSourceMap() multi-line SourceNodes", forEachNewline((nl) => {
        let input = new SourceNode(null, null, null, [
            new SourceNode(1, 0, "a.js", `(function() {${nl}var nextLine = 1;${nl}anotherLine();${nl}`),
            new SourceNode(2, 2, "b.js", `Test.call(this, 123);${nl}`),
            new SourceNode(2, 2, "b.js", `this['stuff'] = 'v';${nl}`),
            new SourceNode(2, 2, "b.js", `anotherLine();${nl}`),
            `/*${nl}Generated${nl}Source${nl}*/${nl}`,
            new SourceNode(3, 4, "c.js", `anotherLine();${nl}`),
            `/*${nl}Generated${nl}Source${nl}*/`
        ]);
        input = input.toStringWithSourceMap({
            file: "foo.js"
        });

        assert.equal(input.code, [
            "(function() {",
            "var nextLine = 1;",
            "anotherLine();",
            "Test.call(this, 123);",
            "this['stuff'] = 'v';",
            "anotherLine();",
            "/*",
            "Generated",
            "Source",
            "*/",
            "anotherLine();",
            "/*",
            "Generated",
            "Source",
            "*/"
        ].join(nl));

        let correctMap = new SourceMapGenerator({
            file: "foo.js"
        });
        correctMap.addMapping({
            generated: { line: 1, column: 0 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 2, column: 0 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 3, column: 0 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 4, column: 0 },
            source: "b.js",
            original: { line: 2, column: 2 }
        });
        correctMap.addMapping({
            generated: { line: 5, column: 0 },
            source: "b.js",
            original: { line: 2, column: 2 }
        });
        correctMap.addMapping({
            generated: { line: 6, column: 0 },
            source: "b.js",
            original: { line: 2, column: 2 }
        });
        correctMap.addMapping({
            generated: { line: 11, column: 0 },
            source: "c.js",
            original: { line: 3, column: 4 }
        });

        const inputMap = input.map.toJSON();
        correctMap = correctMap.toJSON();
        util.assertEqualMaps(inputMap, correctMap);
    }));

    it("test .toStringWithSourceMap() with empty string", () => {
        const node = new SourceNode(1, 0, "empty.js", "");
        const result = node.toStringWithSourceMap();
        assert.equal(result.code, "");
    });

    it("test .toStringWithSourceMap() with consecutive newlines", forEachNewline((nl) => {
        let input = new SourceNode(null, null, null, [
            `/***/${nl}${nl}`,
            new SourceNode(1, 0, "a.js", `'use strict';${nl}`),
            new SourceNode(2, 0, "a.js", "a();")
        ]);
        input = input.toStringWithSourceMap({
            file: "foo.js"
        });

        assert.equal(input.code, [
            "/***/",
            "",
            "'use strict';",
            "a();"
        ].join(nl));

        let correctMap = new SourceMapGenerator({
            file: "foo.js"
        });
        correctMap.addMapping({
            generated: { line: 3, column: 0 },
            source: "a.js",
            original: { line: 1, column: 0 }
        });
        correctMap.addMapping({
            generated: { line: 4, column: 0 },
            source: "a.js",
            original: { line: 2, column: 0 }
        });

        const inputMap = input.map.toJSON();
        correctMap = correctMap.toJSON();
        util.assertEqualMaps(inputMap, correctMap);
    }));

    it("test setSourceContent with toStringWithSourceMap", () => {
        const aNode = new SourceNode(1, 1, "a.js", "a");
        aNode.setSourceContent("a.js", "someContent");
        const node = new SourceNode(null, null, null,
            ["(function () {\n",
                "  ", aNode,
                "  ", new SourceNode(1, 1, "b.js", "b"),
                "}());"]);
        node.setSourceContent("b.js", "otherContent");
        let map = node.toStringWithSourceMap({
            file: "foo.js"
        }).map;

        assert.ok(map instanceof SourceMapGenerator, "map instanceof SourceMapGenerator");
        map = new SourceMapConsumer(map.toString());

        assert.equal(map.sources.length, 2);
        assert.equal(map.sources[0], "a.js");
        assert.equal(map.sources[1], "b.js");
        assert.equal(map.sourcesContent.length, 2);
        assert.equal(map.sourcesContent[0], "someContent");
        assert.equal(map.sourcesContent[1], "otherContent");
    });

    it("test walkSourceContents", () => {
        const aNode = new SourceNode(1, 1, "a.js", "a");
        aNode.setSourceContent("a.js", "someContent");
        const node = new SourceNode(null, null, null,
            ["(function () {\n",
                "  ", aNode,
                "  ", new SourceNode(1, 1, "b.js", "b"),
                "}());"]);
        node.setSourceContent("b.js", "otherContent");
        const results = [];
        node.walkSourceContents((sourceFile, sourceContent) => {
            results.push([sourceFile, sourceContent]);
        });
        assert.equal(results.length, 2);
        assert.equal(results[0][0], "a.js");
        assert.equal(results[0][1], "someContent");
        assert.equal(results[1][0], "b.js");
        assert.equal(results[1][1], "otherContent");
    });

    it("test from issue 258", () => {
        const node = new SourceNode();

        const reactCode =
            ";require(0);\n//# sourceMappingURL=/index.ios.map?platform=ios&dev=false&minify=true";

        const reactMap =
            "{\"version\":3,\"file\":\"/index.ios.bundle?platform=ios&dev=false&minify=true\",\"sections\":[{\"offset\":{\"line\":0,\"column\":0},\"map\":{\"version\":3,\"sources\":[\"require-0.js\"],\"names\":[],\"mappings\":\"AAAA;\",\"file\":\"require-0.js\",\"sourcesContent\":[\";require(0);\"]}}]}";

        node.add(SourceNode.fromStringWithSourceMap(
            reactCode,
            new SourceMapConsumer(reactMap)
        ));
    });
});
