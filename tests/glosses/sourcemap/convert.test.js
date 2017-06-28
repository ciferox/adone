describe("sourcemap", "convert", () => {
    const { sourcemap: { convert, inline } } = adone;

    describe("comment regex", () => {
        const comment = (prefix, suffix) => {
            const rx = convert.getCommentRegex();
            return rx.test(`${prefix}sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9${suffix}`);
        };

        const commentWithCharSet = (prefix, suffix, sep) => {
            sep = sep || ":";
            const rx = convert.getCommentRegex();
            return rx.test(`${prefix}sourceMappingURL=data:application/json;charset${sep}utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9${suffix}`);
        };

        specify("comment regex old spec - @", () => {
            [
                "//@ ",
                "  //@ ", // with leading space
                "\t//@ ", // with leading tab
                "//@ ", // with leading text
                "/*@ ", // multi line style
                "  /*@ ", // multi line style with leading spaces
                "\t/*@ ", // multi line style with leading tab
                "/*@ " // multi line style with leading text
            ].forEach((x) => {
                expect(comment(x, "")).to.be.ok;
                expect(commentWithCharSet(x, "")).to.be.ok;
                expect(commentWithCharSet(x, "", "=")).to.be.ok;
            });

            [
                " @// @",
                " @/* @"
            ].forEach((x) => {
                expect(comment(x, "")).not.to.be.ok;
            });
        });

        specify("comment regex new spec - #", () => {
            [
                "  //# ", // with leading spaces
                "\t//# ", // with leading tab
                "//# ", // with leading text
                "/*# ", // multi line style
                "  /*# ", // multi line style with leading spaces
                "\t/*# ", // multi line style with leading tab
                "/*# " // multi line style with leading text
            ].forEach((x) => {
                expect(comment(x, "")).to.be.ok;
                expect(commentWithCharSet(x, "")).to.be.ok;
                expect(commentWithCharSet(x, "", "=")).to.be.ok;
            });

            [
                " #// #",
                " #/* #"
            ].forEach((x) => {
                expect(comment(x, "")).not.to.be.ok;
            });
        });
    });


    describe("convert sourcemap", () => {
        const gen = inline({ charset: "utf-8" })
            .addMappings("foo.js", [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }], { line: 5 })
            .addGeneratedMappings("bar.js", "var a = 2;\nconsole.log(a)", { line: 23, column: 22 });

        const base64 = gen.base64Encode();
        const comment = gen.inlineMappingUrl();
        const json = gen.toString();
        const obj = JSON.parse(json);

        specify("different formats", () => {
            expect(convert.fromComment(comment).toComment()).to.be.equal(comment);
            expect(convert.fromComment(comment).toBase64()).to.be.equal(base64);
            expect(convert.fromComment(comment).toJSON()).to.be.equal(json);
            expect(convert.fromComment(comment).toObject()).to.be.deep.equal(obj);

            expect(convert.fromBase64(base64).toBase64()).to.be.equal(base64);
            expect(convert.fromBase64(base64).toComment()).to.be.equal(comment);
            expect(convert.fromBase64(base64).toJSON()).to.be.equal(json);
            expect(convert.fromBase64(base64).toObject()).to.be.deep.equal(obj);

            expect(convert.fromJSON(json).toJSON()).to.be.equal(json);
            expect(convert.fromJSON(json).toBase64()).to.be.equal(base64);
            expect(convert.fromJSON(json).toComment()).to.be.equal(comment);
            expect(convert.fromJSON(json).toObject()).to.be.deep.equal(obj);
        });

        specify("to object returns a copy", () => {
            const c = convert.fromJSON(json);
            const o = c.toObject();
            o.version = "99";
            expect(c.toObject().version).to.be.equal(3);
        });

        specify("to multi-line map", () => {
            const c = convert.fromObject(obj);
            const s = c.toComment({ multiline: true });
            expect(s).to.match(/^\/\*# sourceMappingURL=.+ \*\/$/);
        });

        specify("to map file comment", () => {
            expect(convert.generateMapFileComment("index.js.map")).to.be.equal("//# sourceMappingURL=index.js.map");
            expect(convert.generateMapFileComment("index.css.map", { multiline: true })).to.be.equal("/*# sourceMappingURL=index.css.map */");
        });

        specify("from source", () => {
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

            const getComment = (src) => {
                const map = convert.fromSource(src);
                return map ? map.toComment() : null;
            };

            expect(getComment(foo)).to.be.null;
            expect(getComment(foo + map)).to.be.equal(map);
            expect(getComment(`${foo}    ${map}`)).to.be.equal(map);
            expect(getComment(`${foo}   ${map}\n\n`)).to.be.equal(map);
            expect(getComment(`${foo + map}\nconsole.log("more code");\nfoo()\n`)).to.be.equal(map);
            expect(getComment(`${foo + otherMap}\n${map}`)).to.be.equal(map);
        });
        specify("from source with a large source", () => {
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

            const getComment = (src) => {
                const map = convert.fromSource(src, true);
                return map ? map.toComment() : null;
            };

            expect(getComment(foo)).to.be.null;
            expect(getComment(foo + map)).to.be.equal(map);
            expect(getComment(`${foo}    ${map}`)).to.be.equal(map);
            expect(getComment(`${foo}   ${map}\n\n`)).to.be.equal(map);
            expect(getComment(`${foo + map}\nconsole.log("more code");\nfoo()\n`)).to.be.equal(map);
            expect(getComment(`${foo + otherMap}\n${map}`)).to.be.equal(map);
        });

        specify("remove comments", () => {
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

            expect(convert.removeComments(foo + map)).to.be.equal(foo);
            expect(convert.removeComments(foo + map + extraCode)).to.be.equal(foo + extraCode);
            expect(convert.removeComments(foo + otherMap + extraCode + map)).to.be.equal(foo + extraCode);
        });

        specify("remove map file comments", () => {
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

            expect(convert.removeMapFileComments(foo + fileMap1)).to.be.equal(foo);
            expect(convert.removeMapFileComments(foo + fileMap2)).to.be.equal(foo);
        });

        specify("pretty json", () => {
            const mod = convert.fromJSON(json).toJSON(2);
            const expected = JSON.stringify(obj, null, 2);

            expect(mod).to.be.equal(expected);
        });

        specify("adding properties", () => {
            const mod = convert
                .fromJSON(json)
                .addProperty("foo", "bar")
                .toJSON();
            const expected = JSON.parse(json);
            expected.foo = "bar";
            expect(mod).to.be.equal(JSON.stringify(expected));
        });

        specify("setting properties", () => {
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
            expect(mod).to.be.equal(JSON.stringify(expected));
        });

        specify("getting properties", () => {
            const sm = convert.fromJSON(json);

            expect(sm.getProperty("version")).to.be.equal(3);
            expect(sm.getProperty("sources")).to.be.deep.equal(["foo.js", "bar.js"]);
        });

        specify("return null fromSource when largeSource is true", () => {
            const mod = convert.fromSource("", true);
            expect(mod).to.be.null;
        });
    });
});
