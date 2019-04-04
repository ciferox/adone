const {
    sourcemap: { convert, inline: { generate: generator } }
} = adone;

describe("sourcemap", "convert", () => {
    const gen = generator({ charset: "utf-8" })
        .addMappings("foo.js", [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }], { line: 5 })
        .addGeneratedMappings("bar.js", "var a = 2;\nconsole.log(a)", { line: 23, column: 22 });

    const base64 = gen.base64Encode();
    const comment = gen.inlineMappingUrl();
    const json = gen.toString();
    const obj = JSON.parse(json);

    it("different formats", () => {
        assert.equal(convert.fromComment(comment).toComment(), comment, "comment -> comment");
        assert.equal(convert.fromComment(comment).toBase64(), base64, "comment -> base64");
        assert.equal(convert.fromComment(comment).toJSON(), json, "comment -> json");
        assert.deepEqual(convert.fromComment(comment).toObject(), obj, "comment -> object");

        assert.equal(convert.fromBase64(base64).toBase64(), base64, "base64 -> base64");
        assert.equal(convert.fromBase64(base64).toComment(), comment, "base64 -> comment");
        assert.equal(convert.fromBase64(base64).toJSON(), json, "base64 -> json");
        assert.deepEqual(convert.fromBase64(base64).toObject(), obj, "base64 -> object");

        assert.equal(convert.fromJSON(json).toJSON(), json, "json -> json");
        assert.equal(convert.fromJSON(json).toBase64(), base64, "json -> base64");
        assert.equal(convert.fromJSON(json).toComment(), comment, "json -> comment");
        assert.deepEqual(convert.fromJSON(json).toObject(), obj, "json -> object");
    });

    it("to object returns a copy", () => {
        const c = convert.fromJSON(json);
        const o = c.toObject();
        o.version = "99";
        assert.equal(c.toObject().version, 3, "setting property on returned object does not affect original");
    });

    it("to multi-line map", () => {
        const c = convert.fromObject(obj);
        const s = c.toComment({ multiline: true });
        assert.match(s, /^\/\*# sourceMappingURL=.+ \*\/$/);
    });

    it("to map file comment", () => {
        assert.equal(convert.generateMapFileComment("index.js.map"), "//# sourceMappingURL=index.js.map");
        assert.equal(convert.generateMapFileComment("index.css.map", { multiline: true }), "/*# sourceMappingURL=index.css.map */");
    });

    it("from source", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        const map = "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";
        const otherMap = "//# sourceMappingURL=data:application/json;charset=utf-8;base64,otherZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";

        function getComment(src) {
            const map = convert.fromSource(src);
            return map ? map.toComment() : null;
        }

        assert.equal(getComment(foo), null, "no comment returns null");
        assert.equal(getComment(foo + map), map, "beginning of last line");
        assert.equal(getComment(`${foo}    ${map}`), map, "indented of last line");
        assert.equal(getComment(`${foo}   ${map}\n\n`), map, "indented on last non empty line");
        assert.equal(getComment(`${foo + map}\nconsole.log("more code");\nfoo()\n`), map, "in the middle of code");
        assert.equal(getComment(`${foo + otherMap}\n${map}`), map, "finds last map in source");
    });

    it("from source with a large source", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        const map = "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";
        const otherMap = "//# sourceMappingURL=data:application/json;charset=utf-8;base64,otherZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";

        function getComment(src) {
            const map = convert.fromSource(src, true);
            return map ? map.toComment() : null;
        }

        assert.equal(getComment(foo), null, "no comment returns null");
        assert.equal(getComment(foo + map), map, "beginning of last line");
        assert.equal(getComment(`${foo}    ${map}`), map, "indented of last line");
        assert.equal(getComment(`${foo}   ${map}\n\n`), map, "indented on last non empty line");
        assert.equal(getComment(`${foo + map}\nconsole.log("more code");\nfoo()\n`), map, "in the middle of code");
        assert.equal(getComment(`${foo + otherMap}\n${map}`), map, "finds last map in source");
    });

    it("remove comments", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        // this one is old spec on purpose
        const map = "//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";
        const otherMap = "//# sourceMappingURL=data:application/json;base64,ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";
        const extraCode = '\nconsole.log("more code");\nfoo()\n';

        assert.equal(convert.removeComments(foo + map), foo, "from last line");
        assert.equal(convert.removeComments(foo + map + extraCode), foo + extraCode, "from the middle of code");
        assert.equal(convert.removeComments(foo + otherMap + extraCode + map), foo + extraCode, "multiple comments from the middle of code");
    });

    it("remove map file comments", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        const fileMap1 = "//# sourceMappingURL=foo.js.map";
        const fileMap2 = "/*# sourceMappingURL=foo.js.map */";

        assert.equal(convert.removeMapFileComments(foo + fileMap1), foo, "// style filemap comment");
        assert.equal(convert.removeMapFileComments(foo + fileMap2), foo, "/* */ style filemap comment");
    });

    it("pretty json", () => {
        const mod = convert.fromJSON(json).toJSON(2);
        const expected = JSON.stringify(obj, null, 2);

        assert.equal(
            mod
            , expected
            , "pretty prints json when space is given");
    });

    it("adding properties", () => {
        const mod = convert
            .fromJSON(json)
            .addProperty("foo", "bar")
            .toJSON();
        const expected = JSON.parse(json);
        expected.foo = "bar";
        assert.equal(
            mod
            , JSON.stringify(expected)
            , "includes added property"
        );
    });

    it("adding properties, existing property", () => {
        try {
            convert
                .fromJSON(json)
                .addProperty("foo", "bar")
                .addProperty("foo", "bar");
        } catch (error) {
            assert.equal(error.message, 'property "foo" already exists on the sourcemap, use set property instead', "the error message includes the property name");
        }
    });

    it("setting properties", () => {
        const mod = convert
            .fromJSON(json)
            .setProperty("version", "2")
            .setProperty("mappings", ";;;UACG")
            .setProperty("should add", "this")
            .toJSON();
        const expected = JSON.parse(json);
        expected.version = "2";
        expected.mappings = ";;;UACG";
        expected["should add"] = "this";
        assert.equal(
            mod
            , JSON.stringify(expected)
            , "includes new property and changes existing properties"
        );
    });

    it("getting properties", () => {
        const sm = convert.fromJSON(json);

        assert.equal(sm.getProperty("version"), 3, "gets version");
        assert.deepEqual(sm.getProperty("sources"), ["foo.js", "bar.js"], "gets sources");
    });

    it("return null fromSource when largeSource is true", () => {
        const mod = convert.fromSource("", true);
        const expected = null;

        assert.equal(
            mod
            , expected
            , "return value should be null"
        );
    });

    it("getCommentRegex() returns new RegExp on each get", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        const map = "//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9";
        const re = convert.getCommentRegex();

        re.exec(foo + map);

        assert.equal(re.lastIndex, 372, "has an updated lastIndex");
        assert.equal(convert.getCommentRegex().lastIndex, 0, "a fresh RegExp has lastIndex of 0");
    });

    it("getMapFileCommentRegex() returns new RegExp on each get", () => {
        const foo = [
            "function foo() {",
            ' console.log("hello I am foo");',
            ' console.log("who are you");',
            "}",
            "",
            "foo();",
            ""
        ].join("\n");
        const map = "//# sourceMappingURL=foo.js.map";
        const re = convert.getMapFileCommentRegex();

        re.exec(foo + map);

        assert.equal(re.lastIndex, 119, "has an updated lastIndex");
        assert.equal(convert.getMapFileCommentRegex().lastIndex, 0, "a fresh RegExp has lastIndex of 0");
    });
});
