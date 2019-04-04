/* eslint-disable func-style */

adone.sourcemap.support.install({
    emptyCacheBetweenOperations: true // Needed to be able to test for failure
});

const {
    sourcemap: { SourceMapGenerator },
    std: { fs, childProcess }
} = adone;

const bufferFrom = require("buffer-from");

const fixturePath = (...args) => adone.std.path.join(__dirname, ...args);

function compareLines(actual, expected) {
    assert(actual.length >= expected.length, `got ${actual.length} lines but expected at least ${expected.length} lines`);
    for (let i = 0; i < expected.length; i++) {
        // Some tests are regular expressions because the output format changed slightly between node v0.9.2 and v0.9.3
        if (expected[i] instanceof RegExp) {
            assert(expected[i].test(actual[i]), `${JSON.stringify(actual[i])} does not match ${expected[i]}`);
        } else {
            assert.equal(actual[i], expected[i]);
        }
    }
}

function createEmptySourceMap() {
    return new SourceMapGenerator({
        file: fixturePath(".generated.js"),
        sourceRoot: fixturePath(".")
    });
}

function createSourceMapWithGap() {
    const sourceMap = createEmptySourceMap();
    sourceMap.addMapping({
        generated: { line: 100, column: 0 },
        original: { line: 100, column: 0 },
        source: ".original.js"
    });
    return sourceMap;
}

function createSingleLineSourceMap() {
    const sourceMap = createEmptySourceMap();
    sourceMap.addMapping({
        generated: { line: 1, column: 0 },
        original: { line: 1, column: 0 },
        source: ".original.js"
    });
    return sourceMap;
}

function createSecondLineSourceMap() {
    const sourceMap = createEmptySourceMap();
    sourceMap.addMapping({
        generated: { line: 2, column: 0 },
        original: { line: 1, column: 0 },
        source: ".original.js"
    });
    return sourceMap;
}

function createMultiLineSourceMap() {
    const sourceMap = createEmptySourceMap();
    for (let i = 1; i <= 100; i++) {
        sourceMap.addMapping({
            generated: { line: i, column: 0 },
            original: { line: 1000 + i, column: 99 + i },
            source: `line${i}.js`
        });
    }
    return sourceMap;
}

function createMultiLineSourceMapWithSourcesContent() {
    const sourceMap = createEmptySourceMap();
    let original = new Array(1001).join("\n");
    for (let i = 1; i <= 100; i++) {
        sourceMap.addMapping({
            generated: { line: i, column: 0 },
            original: { line: 1000 + i, column: 4 },
            source: "original.js"
        });
        original += `    line ${i}\n`;
    }
    sourceMap.setSourceContent("original.js", original);
    return sourceMap;
}

function compareStackTrace(sourceMap, source, expected) {
    // Check once with a separate source map
    fs.writeFileSync(fixturePath(".generated.js.map"), sourceMap);
    fs.writeFileSync(fixturePath(".generated.js"), `exports.test = function() {${source.join("\n")}};//@ sourceMappingURL=.generated.js.map`);

    const resolvePath = require.resolve("./.generated");

    try {    
        delete require.cache[resolvePath];
        require("./.generated").test();
    } catch (e) {
        compareLines(e.stack.split(/\r\n|\n/), expected);
    }
    fs.unlinkSync(fixturePath(".generated.js"));
    fs.unlinkSync(fixturePath(".generated.js.map"));

    // Check again with an inline source map (in a data URL)
    fs.writeFileSync(fixturePath(".generated.js"), `exports.test = function() {${
        source.join("\n")}};//@ sourceMappingURL=data:application/json;base64,${
        bufferFrom(sourceMap.toString()).toString("base64")}`);
    try {
        delete require.cache[resolvePath];
        require("./.generated").test();
    } catch (e) {
        compareLines(e.stack.split(/\r\n|\n/), expected);
    }
    fs.unlinkSync(fixturePath(".generated.js"));
}

function compareStdout(done, sourceMap, source, expected) {
    fs.writeFileSync(".original.js", "this is the original code");
    fs.writeFileSync(".generated.js.map", sourceMap);
    fs.writeFileSync(".generated.js", `${source.join("\n")}//@ sourceMappingURL=.generated.js.map`);
    childProcess.exec("node ./.generated", (error, stdout, stderr) => {
        try {
            compareLines(
                (stdout + stderr)
                    .trim()
                    .split(/\r\n|\n/)
                    .filter((line) => {
                        return line !== "";
                    }), // Empty lines are not relevant.
                expected
            );
        } catch (e) {
            return done(e);
        }
        fs.unlinkSync(".generated.js");
        fs.unlinkSync(".generated.js.map");
        fs.unlinkSync(".original.js");
        done();
    });
}

describe.todo("support", () => {
    it("normal throw", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'throw new Error("test");'
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ]);
    });

    /**
     * The following test duplicates some of the code in
     * `normal throw` but triggers file read failure.
     */
    it("fs.readFileSync failure", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'var fs = require("fs");',
            "var rfs = fs.readFileSync;",
            "fs.readFileSync = function() {",
            '  throw new Error("no rfs for you");',
            "};",
            "try {",
            '  throw new Error("test");',
            "} finally {",
            "  fs.readFileSync = rfs;",
            "}"
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line7\.js:1007:107\)$/
        ]);
    });


    it("throw inside function", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            "function foo() {",
            '  throw new Error("test");',
            "}",
            "foo();"
        ], [
            "Error: test",
            /^ {4}at foo \((?:.*[/\\])?line2\.js:1002:102\)$/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line4\.js:1004:104\)$/
        ]);
    });

    it("throw inside function inside function", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            "function foo() {",
            "  function bar() {",
            '    throw new Error("test");',
            "  }",
            "  bar();",
            "}",
            "foo();"
        ], [
            "Error: test",
            /^ {4}at bar \((?:.*[/\\])?line3\.js:1003:103\)$/,
            /^ {4}at foo \((?:.*[/\\])?line5\.js:1005:105\)$/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line7\.js:1007:107\)$/
        ]);
    });

    it("eval", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'eval("throw new Error(\'test\')");'
        ], [
            "Error: test",

            // Before Node 4, `Object.eval`, after just `eval`.
            /^ {4}at (?:Object\.)?eval \(eval at (<anonymous>|exports.test) \((?:.*[/\\])?line1\.js:1001:101\)/,

            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ]);
    });

    it("eval inside eval", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'eval("eval(\'throw new Error(\\"test\\")\')");'
        ], [
            "Error: test",
            /^ {4}at (?:Object\.)?eval \(eval at (<anonymous>|exports.test) \(eval at (<anonymous>|exports.test) \((?:.*[/\\])?line1\.js:1001:101\)/,
            /^ {4}at (?:Object\.)?eval \(eval at (<anonymous>|exports.test) \((?:.*[/\\])?line1\.js:1001:101\)/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ]);
    });

    it("eval inside function", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            "function foo() {",
            '  eval("throw new Error(\'test\')");',
            "}",
            "foo();"
        ], [
            "Error: test",
            /^ {4}at eval \(eval at foo \((?:.*[/\\])?line2\.js:1002:102\)/,
            /^ {4}at foo \((?:.*[/\\])?line2\.js:1002:102\)/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line4\.js:1004:104\)$/
        ]);
    });

    it("eval with sourceURL", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'eval("throw new Error(\'test\')//@ sourceURL=sourceURL.js");'
        ], [
            "Error: test",
            /^ {4}at (?:Object\.)?eval \(sourceURL\.js:1:7\)$/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ]);
    });

    it("eval with sourceURL inside eval", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'eval("eval(\'throw new Error(\\"test\\")//@ sourceURL=sourceURL.js\')");'
        ], [
            "Error: test",
            /^ {4}at (?:Object\.)?eval \(sourceURL\.js:1:7\)$/,
            /^ {4}at (?:Object\.)?eval \(eval at (<anonymous>|exports.test) \((?:.*[/\\])?line1\.js:1001:101\)/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ]);
    });

    it("native function", () => {
        compareStackTrace(createSingleLineSourceMap(), [
            "[1].map(function(x) { throw new Error(x); });"
        ], [
            "Error: 1",
            /[/\\].original\.js/,
            /at Array\.map \((native|<anonymous>)\)/
        ]);
    });

    it("function constructor", () => {
        compareStackTrace(createMultiLineSourceMap(), [
            'throw new Function(")");'
        ], [
            "SyntaxError: Unexpected token )"
        ]);
    });

    it("throw with empty source map", () => {
        compareStackTrace(createEmptySourceMap(), [
            'throw new Error("test");'
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?\.generated.js:1:34\)$/
        ]);
    });

    it("throw in Timeout with empty source map", (done) => {
        compareStdout(done, createEmptySourceMap(), [
            'require("./source-map-support").install();',
            "setTimeout(function () {",
            '    throw new Error("this is the error")',
            "})"
        ], [
            /[/\\].generated.js:3$/,
            '    throw new Error("this is the error")',
            /^ {10}\^$/,
            "Error: this is the error",
            /^ {4}at ((null)|(Timeout))\._onTimeout \((?:.*[/\\])?.generated\.js:3:11\)$/
        ]);
    });

    it("throw with source map with gap", () => {
        compareStackTrace(createSourceMapWithGap(), [
            'throw new Error("test");'
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?\.generated\.js:1:34\)$/
        ]);
    });

    it("sourcesContent with data URL", () => {
        compareStackTrace(createMultiLineSourceMapWithSourcesContent(), [
            'throw new Error("test");'
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?original\.js:1001:5\)$/
        ]);
    });

    it("finds the last sourceMappingURL", () => {
        compareStackTrace(createMultiLineSourceMapWithSourcesContent(), [
            "//# sourceMappingURL=missing.map.js", // NB: compareStackTrace adds another source mapping.
            'throw new Error("test");'
        ], [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?original\.js:1002:5\)$/
        ]);
    });

    it("maps original name from source", () => {
        const sourceMap = createEmptySourceMap();
        sourceMap.addMapping({
            generated: { line: 2, column: 8 },
            original: { line: 1000, column: 10 },
            source: ".original.js",
            name: "myOriginalName"
        });
        compareStackTrace(sourceMap, [
            "function foo() {",
            '  throw new Error("test");',
            "}",
            "foo();"
        ], [
            "Error: test",
            /^ {4}at myOriginalName \((?:.*[/\\])?\.original.js:1000:11\)$/,
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?\.generated.js:4:1\)$/
        ]);
    });

    it("default options", (done) => {
        compareStdout(done, createSecondLineSourceMap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install();',
            "process.nextTick(foo);",
            "process.nextTick(function() { process.exit(1); });"
        ], [
            /[/\\].original\.js:1$/,
            "this is the original code",
            "^",
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?\.original\.js:1:1\)$/
        ]);
    });

    it("handleUncaughtExceptions is true", (done) => {
        compareStdout(done, createSecondLineSourceMap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install({ handleUncaughtExceptions: true });',
            "process.nextTick(foo);"
        ], [
            /[/\\].original\.js:1$/,
            "this is the original code",
            "^",
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?\.original\.js:1:1\)$/
        ]);
    });

    it("handleUncaughtExceptions is false", (done) => {
        compareStdout(done, createSecondLineSourceMap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install({ handleUncaughtExceptions: false });',
            "process.nextTick(foo);"
        ], [
            /[/\\].generated.js:2$/,
            'function foo() { throw new Error("this is the error"); }',

            // Before Node 4, the arrow points on the `new`, after on the
            // `throw`.
            /^ {17}(?: {6})?\^$/,

            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?.original\.js:1:1\)$/
        ]);
    });

    it("default options with empty source map", (done) => {
        compareStdout(done, createEmptySourceMap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install();',
            "process.nextTick(foo);"
        ], [
            /[/\\].generated.js:2$/,
            'function foo() { throw new Error("this is the error"); }',
            /^ {17}(?: {6})?\^$/,
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?.generated.js:2:24\)$/
        ]);
    });

    it("default options with source map with gap", (done) => {
        compareStdout(done, createSourceMapWithGap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install();',
            "process.nextTick(foo);"
        ], [
            /[/\\].generated.js:2$/,
            'function foo() { throw new Error("this is the error"); }',
            /^ {17}(?: {6})?\^$/,
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?.generated.js:2:24\)$/
        ]);
    });

    it("specifically requested error source", (done) => {
        compareStdout(done, createSecondLineSourceMap(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'var sms = require("./source-map-support");',
            "sms.install({ handleUncaughtExceptions: false });",
            'process.on("uncaughtException", function (e) { console.log("SRC:" + sms.getErrorSource(e)); });',
            "process.nextTick(foo);"
        ], [
            /^SRC:.*[/\\]\.original\.js:1$/,
            "this is the original code",
            "^"
        ]);
    });

    it("sourcesContent", (done) => {
        compareStdout(done, createMultiLineSourceMapWithSourcesContent(), [
            "",
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install();',
            "process.nextTick(foo);",
            "process.nextTick(function() { process.exit(1); });"
        ], [
            /[/\\]original\.js:1002$/,
            "    line 2",
            "    ^",
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?original\.js:1002:5\)$/
        ]);
    });

    it("missing source maps should also be cached", (done) => {
        compareStdout(done, createSingleLineSourceMap(), [
            "",
            "var count = 0;",
            "function foo() {",
            '  console.log(new Error("this is the error").stack.split("\\n").slice(0, 2).join("\\n"));',
            "}",
            'require("./source-map-support").install({',
            "  overrideRetrieveSourceMap: true,",
            "  retrieveSourceMap: function(name) {",
            "    if (/\\.generated.js$/.test(name)) count++;",
            "    return null;",
            "  }",
            "});",
            "process.nextTick(foo);",
            "process.nextTick(foo);",
            "process.nextTick(function() { console.log(count); });"
        ], [
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?.generated.js:4:15\)$/,
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?.generated.js:4:15\)$/,
            "1" // The retrieval should only be attempted once
        ]);
    });

    it("should consult all retrieve source map providers", (done) => {
        compareStdout(done, createSingleLineSourceMap(), [
            "",
            "var count = 0;",
            "function foo() {",
            '  console.log(new Error("this is the error").stack.split("\\n").slice(0, 2).join("\\n"));',
            "}",
            'require("./source-map-support").install({',
            "  retrieveSourceMap: function(name) {",
            "    if (/\\.generated.js$/.test(name)) count++;",
            "    return undefined;",
            "  }",
            "});",
            'require("./source-map-support").install({',
            "  retrieveSourceMap: function(name) {",
            "    if (/\\.generated.js$/.test(name)) {",
            "      count++;",
            `      return ${JSON.stringify({ url: ".original.js", map: createMultiLineSourceMapWithSourcesContent().toJSON() })};`,
            "    }",
            "  }",
            "});",
            "process.nextTick(foo);",
            "process.nextTick(foo);",
            "process.nextTick(function() { console.log(count); });"
        ], [
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?original\.js:1004:5\)$/,
            "Error: this is the error",
            /^ {4}at foo \((?:.*[/\\])?original\.js:1004:5\)$/,
            "1" // The retrieval should only be attempted once
        ]);
    });

    it("should allow for runtime inline source maps", (done) => {
        const sourceMap = createMultiLineSourceMapWithSourcesContent();

        fs.writeFileSync(".generated.jss", "foo");

        compareStdout((err) => {
            fs.unlinkSync(".generated.jss");
            done(err);
        }, createSingleLineSourceMap(), [
            'require("./source-map-support").install({',
            "  hookRequire: true",
            "});",
            'require.extensions[".jss"] = function(module, filename) {',
            "  module._compile(",
            JSON.stringify([
                "",
                "var count = 0;",
                "function foo() {",
                '  console.log(new Error("this is the error").stack.split("\\n").slice(0, 2).join("\\n"));',
                "}",
                "process.nextTick(foo);",
                "process.nextTick(foo);",
                "process.nextTick(function() { console.log(count); });",
                `//@ sourceMappingURL=data:application/json;charset=utf8;base64,${bufferFrom(sourceMap.toString()).toString("base64")}`
            ].join("\n")),
            ", filename);",
            "};",
            'require("./.generated.jss");'
        ], [
            "Error: this is the error",
            /^ {4}at foo \(.*[/\\]original\.js:1004:5\)$/,
            "Error: this is the error",
            /^ {4}at foo \(.*[/\\]original\.js:1004:5\)$/,
            "0" // The retrieval should only be attempted once
        ]);
    });

    /**
     * The following test duplicates some of the code in
     * `compareStackTrace` but appends a charset to the
     * source mapping url.
     */
    it("finds source maps with charset specified", () => {
        const sourceMap = createMultiLineSourceMap();
        const source = ['throw new Error("test");'];
        const expected = [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ];

        fs.writeFileSync(".generated.js", `exports.test = function() {${
            source.join("\n")}};//@ sourceMappingURL=data:application/json;charset=utf8;base64,${
            bufferFrom(sourceMap.toString()).toString("base64")}`);
        try {
            delete require.cache[require.resolve("./.generated")];
            require("./.generated").test();
        } catch (e) {
            compareLines(e.stack.split(/\r\n|\n/), expected);
        }
        fs.unlinkSync(".generated.js");
    });

    /**
     * The following test duplicates some of the code in
     * `compareStackTrace` but appends some code and a
     * comment to the source mapping url.
     */
    it("allows code/comments after sourceMappingURL", () => {
        const sourceMap = createMultiLineSourceMap();
        const source = ['throw new Error("test");'];
        const expected = [
            "Error: test",
            /^ {4}at Object\.exports\.test \((?:.*[/\\])?line1\.js:1001:101\)$/
        ];

        fs.writeFileSync(".generated.js", `exports.test = function() {${
            source.join("\n")}};//# sourceMappingURL=data:application/json;base64,${
            bufferFrom(sourceMap.toString()).toString("base64")}\n// Some comment below the sourceMappingURL\nvar foo = 0;`);
        try {
            delete require.cache[require.resolve("./.generated")];
            require("./.generated").test();
        } catch (e) {
            compareLines(e.stack.split(/\r\n|\n/), expected);
        }
        fs.unlinkSync(".generated.js");
    });

    it("handleUncaughtExceptions is true with existing listener", (done) => {
        const source = [
            'process.on("uncaughtException", function() { /* Silent */ });',
            'function foo() { throw new Error("this is the error"); }',
            'require("./source-map-support").install();',
            "process.nextTick(foo);",
            "//@ sourceMappingURL=.generated.js.map"
        ];

        fs.writeFileSync(".original.js", "this is the original code");
        fs.writeFileSync(".generated.js.map", createSingleLineSourceMap());
        fs.writeFileSync(".generated.js", source.join("\n"));

        childProcess.exec("node ./.generated", (error, stdout, stderr) => {
            fs.unlinkSync(".generated.js");
            fs.unlinkSync(".generated.js.map");
            fs.unlinkSync(".original.js");
            assert.equal((stdout + stderr).trim(), "");
            done();
        });
    });
});
