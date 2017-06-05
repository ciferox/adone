describe("utils", () => {
    const { util, is, x } = adone;

    describe("arrify", () => {
        it("no args", () => {
            assert.equal(util.arrify().length, 0);
        });

        it.skip("'undefined' as argument", () => {
            assert.sameMembers(util.arrify(undefined), [undefined]);
        });

        it("'null' as argument", () => {
            assert.sameMembers(util.arrify(null), [null]);
        });

        it("array as argument", () => {
            assert.sameMembers(util.arrify([1, 2, 3]), [1, 2, 3]);
        });
    });

    describe("Function", () => {
        describe("identity", () => {
            it("should return the first argument", () => {
                expect(adone.identity(1, 2, 3)).to.be.equal(1);
            });
        });

        describe("noop", () => {
            it("should return nothing", () => {
                expect(adone.noop(1, 2, 3)).to.be.undefined;
            });
        });

        describe("by", () => {
            const getA = function (x) {
                return x.a;
            };
            const wrappedCompare = function (a, b) {
                return a - b;
            };
            const compare = util.by(getA, wrappedCompare);

            it("should compare two values", () => {
                expect(compare({ a: 10 }, { a: 20 })).to.be.equal(-10);
            });

            it("should have a by property", () => {
                expect(compare.by).to.be.equal(getA);
            });

            it("should have a compare property", () => {
                expect(compare.compare).to.be.equal(wrappedCompare);
            });
        });
    });

    describe("keys()", () => {
        const keys = util.keys;

        it("should be empty for an empty object", () => {
            const props = keys({});
            expect(props).to.be.empty;
        });

        it("should return all the properies of an object", () => {
            const props = keys({ a: 1, b: 2, c: 3, d: () => 4, e: { f: 5 } });
            expect(props).to.be.deep.equal(["a", "b", "c", "d", "e"]);
        });

        it("should work with classic classes", () => {
            function Test() {
                this.a = 2;
            }
            Test.prototype.b = adone.noop;
            const t = new Test();
            const props = keys(t, { followProto: true });
            expect(props).to.be.deep.equal(["a", "b"]);
        });

        it("should work with classic class inheritance", () => {
            function A() {
                this.aProp = 1;
            }
            A.prototype.aMethod = adone.noop;

            function B() {
                A.call(this);
                this.bProp = 2;
            }
            adone.std.util.inherits(B, A);
            B.prototype.bMethod = adone.noop;
            const t = new B();
            const props = keys(t, { followProto: true }).sort();
            expect(props).to.be.deep.equal(["aMethod", "aProp", "bMethod", "bProp"]);
        });

        it("should work with es6 classes", () => {
            class Test {
                constructor() {
                    this.a = 2;
                }

                b() {
                    return 3;
                }
            }
            const t = new Test();
            const props = keys(t, { all: true });
            expect(props).to.be.deep.equal(["a", "b"]);
        });

        it("should work with es6 class inheritance", () => {
            class A {
                constructor() {
                    this.aProp = 1;
                }

                aMethod() {

                }
            }

            class B extends A {
                constructor() {
                    super();
                    this.bProp = 2;
                }

                bMethod() {

                }
            }

            const t = new B();
            const props = keys(t, { all: true }).sort();
            expect(props).to.be.deep.equal(["aMethod", "aProp", "bMethod", "bProp"]);
        });
    });

    describe("enumerate()", () => {
        it("should count every item", () => {
            const s = [1, 2, 3, 4, 5];
            let i = 0;
            for (const [idx, t] of util.enumerate(s)) {
                expect(idx).to.be.equal(i++);
                expect(t).to.be.equal(i);
            }
        });

        it("should set the start index", () => {
            const s = "12345";
            let i = 5;
            let j = 1;
            for (const [idx, t] of util.enumerate(s, 5)) {
                expect(idx).to.be.equal(i++);
                expect(t).to.be.equal(`${j++}`);
            }
        });
    });

    describe("toDotNotation()", () => {
        it("should transform an object to the dot-noation", () => {
            expect(util.toDotNotation({
                a: 1,
                b: 2,
                c: { d: 4, e: { f: 5 } }
            })).to.be.deep.equal({
                a: 1,
                b: 2,
                "c.d": 4,
                "c.e.f": 5
            });
            expect(util.toDotNotation({
                a: [1, 2, 3],
                b: {
                    "a b c": {
                        g: 6,
                        y: [4, 5, 6]
                    }
                }
            })).to.be.deep.equal({
                "a[0]": 1,
                "a[1]": 2,
                "a[2]": 3,
                "b[\"a b c\"].g": 6,
                "b[\"a b c\"].y[0]": 4,
                "b[\"a b c\"].y[1]": 5,
                "b[\"a b c\"].y[2]": 6
            });
        });
    });

    describe("flatten", () => {
        it("should be the same", () => {
            const array = [1, 2, 3, 4, 5];
            expect(util.flatten(array)).to.be.deep.equal(array);
        });

        it("should work with kdim dim array", () => {
            const result = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            for (const i of [
                [1, 2, [3, 4, 5], [6, 7, 8], 9],
                [[[[[[[[[[[[[1]]]]]]]]]]]], [[2]], [3, [4, [5, 6, [7, [[[8]]], 9]]]]],
                [1, [2, [3, [4, [5, [6, [7, [8, [9]]]]]]]]],
                [[[[[[[[[1], 2], 3], 4], 5], 6], 7], 8], 9],
                [[1], [2], [3], [4], [5], [6], [7], [8], [9]]
            ]) {
                expect(adone.util.flatten(i, { depth: Infinity })).to.be.deep.equal(result);
            }
        });

        it("should stop flattening if the depth is 0", () => {
            const array = [1, [2, [3, [4, 5]]]];
            expect(adone.util.flatten(array, { depth: 2 })).to.be.deep.equal([1, 2, 3, [4, 5]]);
        });

        it("should set the depth = 1 by default", () => {
            const array = [1, [2, [3, [4, 5]]]];
            expect(adone.util.flatten(array)).to.be.deep.equal([1, 2, [3, [4, 5]]]);
        });
    });

    describe("match", () => {
        const matchers = [
            "path/to/file.js",
            "path/anyjs/**/*.js",
            /foo.js$/,
            (string) => string.indexOf("/bar") !== -1 && string.length > 10
        ];
        it("should resolve string matchers", () => {
            expect(util.match(matchers, "path/to/file.js")).to.be.true;
            expect(util.match(matchers[0], "path/to/file.js")).to.be.true;
            expect(util.match(matchers[0], "bar.js")).to.be.false;
        });
        it("should resolve glob matchers", () => {
            expect(util.match(matchers, "path/anyjs/baz.js")).to.be.true;
            expect(util.match(matchers[1], "path/anyjs/baz.js")).to.be.true;
            expect(util.match(matchers[1], "bar.js")).to.be.false;
        });
        it("should resolve regexp matchers", () => {
            expect(util.match(matchers, "path/to/foo.js")).to.be.true;
            expect(util.match(matchers[2], "path/to/foo.js")).to.be.true;
            expect(util.match(matchers[2], "bar.js")).to.be.false;
        });
        it("should resolve function matchers", () => {
            expect(util.match(matchers, "path/to/bar.js")).to.be.true;
            expect(util.match(matchers[3], "path/to/bar.js")).to.be.true;
            expect(util.match(matchers, "bar.js")).to.be.false;
        });
        it("should return false for unmatched strings", () => {
            expect(util.match(matchers, "bar.js")).to.be.false;
        });

        describe("with index = true", () => {
            it("should return the array index of first positive matcher", () => {
                expect(util.match(matchers, "foo.js", { index: true })).to.be.equal(2);
            });
            it("should return 0 if provided non-array matcher", () => {
                expect(util.match(matchers[2], "foo.js", { index: true })).to.be.equal(0);
            });
            it("should return -1 if no match", () => {
                expect(util.match(matchers[2], "bar.js", { index: true })).to.be.equal(-1);
            });
        });

        describe("curried matching function", () => {
            const matchFn = util.match(matchers);

            it("should resolve matchers", () => {
                expect(matchFn("path/to/file.js")).to.be.true;
                expect(matchFn("path/anyjs/baz.js")).to.be.true;
                expect(matchFn("path/to/foo.js")).to.be.true;
                expect(matchFn("path/to/bar.js")).to.be.true;
                expect(matchFn("bar.js")).to.be.false;
            });
            it("should be usable as an Array.prototype.filter callback", () => {
                const arr = [
                    "path/to/file.js",
                    "path/anyjs/baz.js",
                    "path/to/foo.js",
                    "path/to/bar.js",
                    "bar.js",
                    "foo.js"
                ];
                const expected = arr.slice();
                expected.splice(arr.indexOf("bar.js"), 1);
                expect(arr.filter(matchFn)).to.be.deep.equal(expected);
            });
            it("should bind individual criterion", () => {
                expect(util.match(matchers[0])("path/to/file.js")).to.be.true;
                expect(!util.match(matchers[0])("path/to/other.js")).to.be.true;
                expect(util.match(matchers[1])("path/anyjs/baz.js")).to.be.true;
                expect(!util.match(matchers[1])("path/to/baz.js")).to.be.true;
                expect(util.match(matchers[2])("path/to/foo.js")).to.be.true;
                expect(!util.match(matchers[2])("path/to/foo.js.bak")).to.be.true;
                expect(util.match(matchers[3])("path/to/bar.js")).to.be.true;
                expect(!util.match(matchers[3])("bar.js")).to.be.true;
            });
        });

        describe("using matcher subsets", () => {
            it("should skip matchers before the startIndex", () => {
                expect(util.match(matchers, "path/to/file.js", { index: false })).to.be.true;
                expect(util.match(matchers, "path/to/file.js", { index: false, start: 1 })).to.be.false;
            });
            it("should skip matchers after and including the endIndex", () => {
                expect(util.match(matchers, "path/to/bars.js", { index: false })).to.be.true;
                expect(util.match(matchers, "path/to/bars.js", { index: false, start: 0, end: 3 })).to.be.false;
                expect(util.match(matchers, "foo.js", { index: false, start: 0, end: 1 })).to.be.false;
            });
        });

        describe("extra args", () => {
            it("should allow string to be passed as first member of an array", () => {
                expect(util.match(matchers, ["path/to/bar.js"])).to.be.true;
            });

            it("should pass extra args to function matchers", () => {
                matchers.push((string, arg1, arg2) => arg1 || arg2);
                expect(util.match(matchers, "bar.js")).to.be.false;
                expect(util.match(matchers, ["bar.js", 0])).to.be.false;
                expect(util.match(matchers, ["bar.js", true])).to.be.true;
                expect(util.match(matchers, ["bar.js", 0, true])).to.be.true;
                // with returnIndex
                expect(util.match(matchers, ["bar.js", 1], { index: true })).to.be.equal(4);
                // curried versions
                const [matchFn1, matchFn2] = [util.match(matchers), util.match(matchers[4])];
                expect(matchFn1(["bar.js", 0])).to.be.false;
                expect(matchFn2(["bar.js", 0])).to.be.false;
                expect(matchFn1(["bar.js", true])).to.be.true;
                expect(matchFn2(["bar.js", true])).to.be.true;
                expect(matchFn1(["bar.js", 0, true])).to.be.true;
                expect(matchFn2(["bar.js", 0, true])).to.be.true;
                // curried with returnIndex
                expect(matchFn1(["bar.js", 1], { index: true })).to.be.equal(4);
                expect(matchFn2(["bar.js", 1], { index: true })).to.be.equal(0);
                expect(matchFn1(["bar.js", 0], { index: true })).to.be.equal(-1);
                expect(matchFn2(["bar.js", 0], { index: true })).to.be.equal(-1);
                matchers.pop();
            });
        });

        describe("glob negation", () => {
            after(() => {
                matchers.splice(4, 2);
            });

            it("should respect negated globs included in a matcher array", () => {
                expect(util.match(matchers, "path/anyjs/no/no.js")).to.be.true;
                matchers.push("!path/anyjs/no/*.js");
                expect(util.match(matchers, "path/anyjs/no/no.js")).to.be.false;
                expect(util.match(matchers)("path/anyjs/no/no.js")).to.be.false;
            });
            it("should not break returnIndex option", () => {
                expect(util.match(matchers, "path/anyjs/yes.js", { index: true })).to.be.equal(1);
                expect(util.match(matchers)("path/anyjs/yes.js", { index: true })).to.be.equal(1);
                expect(util.match(matchers, "path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
                expect(util.match(matchers)("path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
            });
            it("should allow negated globs to negate non-glob matchers", () => {
                expect(util.match(matchers, "path/to/bar.js", { index: true })).to.be.equal(3);
                matchers.push("!path/to/bar.*");
                expect(util.match(matchers, "path/to/bar.js")).to.be.false;
            });
        });

        describe("windows paths", () => {
            const origSep = adone.std.path.sep;
            before(() => {
                adone.std.path.sep = "\\";
            });
            after(() => {
                adone.std.path.sep = origSep;
            });

            it("should resolve backslashes against string matchers", () => {
                expect(util.match(matchers, "path\\to\\file.js")).to.be.true;
                expect(util.match(matchers)("path\\to\\file.js")).to.be.true;
            });
            it("should resolve backslashes against glob matchers", () => {
                expect(util.match(matchers, "path\\anyjs\\file.js")).to.be.true;
                expect(util.match(matchers)("path\\anyjs\\file.js")).to.be.true;
            });
            it("should resolve backslashes against regex matchers", () => {
                expect(util.match(/path\/to\/file\.js/, "path\\to\\file.js")).to.be.true;
                expect(util.match(/path\/to\/file\.js/)("path\\to\\file.js")).to.be.true;
            });
            it("should resolve backslashes against function matchers", () => {
                expect(util.match(matchers, "path\\to\\bar.js")).to.be.true;
                expect(util.match(matchers)("path\\to\\bar.js")).to.be.true;
            });
            it("should still correctly handle forward-slash paths", () => {
                expect(util.match(matchers, "path/to/file.js")).to.be.true;
                expect(util.match(matchers)("path/to/file.js")).to.be.true;
                expect(util.match(matchers)("path/no/no.js")).to.be.false;
            });
        });
    });

    describe("readdir", () => {
        const totalDirs = 6;
        const totalFiles = 12;
        const ext1Files = 4;
        const ext3Files = 2;
        const fixtures = adone.std.path.join(__dirname, "fixtures");
        const root = adone.std.path.join(fixtures, "readdir");
        const getPath = (...p) => adone.std.path.join(root, ...p);

        before(async () => {
            await adone.fs.rm(adone.std.path.join(root));
            try {
                adone.std.fs.mkdirSync(fixtures);
            } catch (err) {
                //
            }
            adone.std.fs.mkdirSync(getPath());
            adone.std.fs.writeFileSync(getPath("root_file1.ext1"), "");
            adone.std.fs.writeFileSync(getPath("root_file2.ext2"), "");
            adone.std.fs.writeFileSync(getPath("root_file3.ext3"), "");

            adone.std.fs.mkdirSync(getPath("root_dir1"));
            adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file1.ext1"), "");
            adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file2.ext2"), "");
            adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file3.ext3"), "");
            adone.std.fs.mkdirSync(getPath("root_dir1", "root_dir1_subdir1"));
            adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_subdir1", "root1_dir1_subdir1_file1.ext1"), "");
            adone.std.fs.mkdirSync(getPath("root_dir1", "root_dir1_subdir2"));
            adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_subdir2", ".ignore"), "");

            adone.std.fs.mkdirSync(getPath("root_dir2"));
            adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_file1.ext1"), "");
            adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_file2.ext2"), "");
            adone.std.fs.mkdirSync(getPath("root_dir2", "root_dir2_subdir1"));
            adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_subdir1", ".ignore"), "");
            adone.std.fs.mkdirSync(getPath("root_dir2", "root_dir2_subdir2"));
            adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_subdir2", ".ignore"), "");
        });

        after(async () => {
            await adone.fs.rm(adone.std.path.join(root));
        });

        it("reading root without filter", async () => {
            const result = await util.readdir(root);
            expect(result).to.have.lengthOf(totalFiles);
        });

        it("normal ['*.ext1', '*.ext3']", async () => {
            const result = await util.readdir(root, {
                fileFilter: ["*.ext1", "*.ext3"]
            });
            expect(result).to.have.lengthOf(ext1Files + ext3Files);
        });

        it("files only", async () => {
            const result = await util.readdir(root, {
                entryType: "files"
            });
            expect(result).to.have.lengthOf(totalFiles);
        });

        it("directories only", async () => {
            const result = await util.readdir(root, {
                entryType: "directories"
            });
            expect(result).to.have.lengthOf(totalDirs);
        });

        it("both - directories + files", async () => {
            const result = await util.readdir(root, {
                entryType: "both"
            });
            expect(result).to.have.lengthOf(totalFiles + totalDirs);
        });

        it("directory filter with directories only", async () => {
            const result = await util.readdir(root, {
                entryType: "directories",
                directoryFilter: ["root_dir1", "*dir1_subdir1"]
            });
            expect(result).to.have.lengthOf(2);
        });

        it("directory and file filters with both entries", async () => {
            const result = await util.readdir(root, {
                entryType: "both",
                directoryFilter: ["root_dir1", "*dir1_subdir1"],
                fileFilter: ["!*.ext1"]
            });
            expect(result).to.have.lengthOf(6);
        });

        it("negated: ['!*.ext1', '!*.ext3']", async () => {
            const result = await util.readdir(root, {
                fileFilter: ["!*.ext1", "!*.ext3"]
            });
            expect(result).to.have.lengthOf(totalFiles - ext1Files - ext3Files);
        });

        it("reading root without filter using lstat", async () => {
            const result = await util.readdir(root, {
                lstat: true
            });
            expect(result).to.have.lengthOf(totalFiles);
        });

        it("reading root with symlinks using lstat", async function () {
            if (adone.is.windows) {
                this.skip();
                return;
            }
            adone.std.fs.symlinkSync(adone.std.path.join(root, "root_dir1"), adone.std.path.join(root, "dirlink"));
            adone.std.fs.symlinkSync(adone.std.path.join(root, "root_file1.ext1"), adone.std.path.join(root, "link.ext1"));
            const result = await util.readdir(root, {
                entryType: "both",
                lstat: true
            });
            try {
                expect(result).to.have.lengthOf(totalDirs + totalFiles + 2);
            } finally {
                adone.std.fs.unlinkSync(adone.std.path.join(root, "dirlink"));
                adone.std.fs.unlinkSync(adone.std.path.join(root, "link.ext1"));
            }
        });
    });

    describe("jsesc", () => {
        describe("common usage", () => {
            it("works correctly for common operations", () => {
                expect(util.jsesc("\0\x31")).to.be.equal("\\x001", "`\\0` followed by `1`");
                expect(util.jsesc("\0\x38")).to.be.equal("\\x008", "`\\0` followed by `8`");
                expect(util.jsesc("\0\x39")).to.be.equal("\\x009", "`\\0` followed by `9`");
                expect(util.jsesc("\0a")).to.be.equal("\\0a", "`\\0` followed by `a`");
                expect(util.jsesc("foo\"bar'baz", {
                    quotes: "LOLWAT" // invalid setting
                })).to.be.equal("foo\"bar\\'baz");
                expect(util.jsesc("\\x00")).to.be.equal("\\\\x00", "`\\\\x00` shouldn’t be changed to `\\\\0`");
                expect(util.jsesc("a\\x00")).to.be.equal("a\\\\x00", "`a\\\\x00` shouldn’t be changed to `\\\\0`");
                expect(util.jsesc("\\\x00")).to.be.equal("\\\\\\0", "`\\\\\\x00` should be changed to `\\\\\\0`");
                expect(util.jsesc("\\\\x00")).to.be.equal("\\\\\\\\x00", "`\\\\\\\\x00` shouldn’t be changed to `\\\\\\\\0`");
                expect(util.jsesc("lolwat\"foo'bar", {
                    escapeEverything: true
                })).to.be.equal("\\x6C\\x6F\\x6C\\x77\\x61\\x74\\\"\\x66\\x6F\\x6F\\'\\x62\\x61\\x72");
                expect(util.jsesc("\0foo\u2029bar\nbaz\xA9qux\uD834\uDF06flops", {
                    minimal: true
                })).to.be.equal("\\0foo\\u2029bar\\nbaz\xA9qux\uD834\uDF06flops");
                expect(util.jsesc("foo</script>bar</style>baz</script>qux", {
                    isScriptContext: true
                })).to.be.equal("foo<\\/script>bar<\\/style>baz<\\/script>qux");
                expect(util.jsesc("foo</sCrIpT>bar</STYLE>baz</SCRIPT>qux", {
                    isScriptContext: true
                })).to.be.equal("foo<\\/sCrIpT>bar<\\/STYLE>baz<\\/SCRIPT>qux");
                expect(util.jsesc("\"<!--<script></script>\";alert(1);", {
                    isScriptContext: true
                })).to.be.equal("\"\\x3C!--<script><\\/script>\";alert(1);");
                expect(util.jsesc("\"<!--<script></script>\";alert(1);", {
                    isScriptContext: true,
                    json: true
                })).to.be.equal("\"\\\"\\u003C!--<script><\\/script>\\\";alert(1);\"");
                expect(util.jsesc([0x42, 0x1337], {
                    numbers: "decimal"
                })).to.be.equal("[66,4919]");
                expect(util.jsesc([0x42, 0x1337], {
                    numbers: "binary"
                })).to.be.equal("[0b1000010,0b1001100110111]");
                expect(util.jsesc([0x42, 0x1337, NaN, Infinity], {
                    numbers: "binary",
                    json: true
                })).to.be.equal("[66,4919,null,null]");
                expect(util.jsesc([0x42, 0x1337], {
                    numbers: "octal"
                })).to.be.equal("[0o102,0o11467]");
                expect(util.jsesc([0x42, 0x1337], {
                    numbers: "hexadecimal"
                })).to.be.equal("[0x42,0x1337]");
                expect(util.jsesc("a\uD834\uDF06b", {
                    es6: true
                })).to.be.equal("a\\u{1D306}b");
                expect(util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                    es6: true
                })).to.be.equal("a\\u{1D306}b\\u{1F4A9}c");
                expect(util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                    es6: true,
                    escapeEverything: true
                })).to.be.equal("\\x61\\u{1D306}\\x62\\u{1F4A9}\\x63");
                expect(util.jsesc({}, {
                    compact: true
                })).to.be.equal("{}");
                expect(util.jsesc({}, {
                    compact: false
                })).to.be.equal("{}");
                expect(util.jsesc([], {
                    compact: true
                })).to.be.equal("[]");
                expect(util.jsesc([], {
                    compact: false
                })).to.be.equal("[]");
                // Stringifying flat objects containing only string values
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" })).to.be.equal("{'foo\\0bar\\uFFFDbaz':'foo\\0bar\\uFFFDbaz'}", "Stringifying a flat object with default settings`");
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    quotes: "double"
                })).to.be.equal("{\"foo\\0bar\\uFFFDbaz\":\"foo\\0bar\\uFFFDbaz\"}");
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    compact: false
                })).to.be.equal("{\n\t'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
                expect(util.jsesc(["a", "b", "c"], {
                    compact: false,
                    indentLevel: 1
                })).to.be.equal("[\n\t\t'a',\n\t\t'b',\n\t\t'c'\n\t]");
                expect(util.jsesc(["a", "b", "c"], {
                    compact: false,
                    indentLevel: 2
                })).to.be.equal("[\n\t\t\t'a',\n\t\t\t'b',\n\t\t\t'c'\n\t\t]");
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    compact: false,
                    indent: "  "
                })).to.be.equal("{\n  'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    escapeEverything: true
                })).to.be.equal("{'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A':'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A'}");
                // Stringifying flat arrays containing only string values
                expect(util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                    escapeEverything: true
                })).to.be.equal("['\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A','\\xA9']");
                expect(util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                    compact: false
                })).to.be.equal("[\n\t'foo\\0bar\\uFFFDbaz',\n\t'\\xA9'\n]");
                expect(util.jsesc(new Map([]))).to.be.equal("new Map()");
                expect(util.jsesc(new Map([["a", 1], ["b", 2]]), {
                    compact: true
                })).to.be.equal("new Map([['a',1],['b',2]])");
                expect(util.jsesc(new Map([["a", 1], ["b", 2]]), {
                    compact: false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', 2]\n])");
                expect(util.jsesc(new Map([["a", 1], ["b", ["a", "nested", "array"]]]), {
                    compact: false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', [\n\t\t'a',\n\t\t'nested',\n\t\t'array'\n\t]]\n])");
                expect(util.jsesc(new Map([["a", 1], ["b", new Map([["x", 2], ["y", 3]])]]), {
                    compact: false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', new Map([\n\t\t['x', 2],\n\t\t['y', 3]\n\t])]\n])");
                expect(util.jsesc(new Set([]))).to.be.equal("new Set()");
                expect(util.jsesc(new Set([["a"], "b", {}]), {
                    compact: true
                })).to.be.equal("new Set([['a'],'b',{}])");
                expect(util.jsesc(new Set([["a"], "b", {}]), {
                    compact: false
                })).to.be.equal("new Set([\n\t[\n\t\t'a'\n\t],\n\t'b',\n\t{}\n])");
                // Buffer
                expect(util.jsesc(Buffer.from([0x13, 0x37, 0x42]))).to.be.equal("Buffer.from([19,55,66])");
                expect(util.jsesc(Buffer.from([0x13, 0x37, 0x42]), {
                    compact: false
                })).to.be.equal("Buffer.from([\n\t19,\n\t55,\n\t66\n])");
                // JSON
                expect(util.jsesc("foo\x00bar\xFF\uFFFDbaz", {
                    json: true
                })).to.be.equal("\"foo\\u0000bar\\u00FF\\uFFFDbaz\"");
                expect(util.jsesc("foo\x00bar\uFFFDbaz", {
                    escapeEverything: true,
                    json: true
                })).to.be.equal("\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"");
                expect(util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    escapeEverything: true,
                    json: true
                })).to.be.equal("{\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\":\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"}");
                expect(util.jsesc(["foo\x00bar\uFFFDbaz", "foo\x00bar\uFFFDbaz"], {
                    escapeEverything: true,
                    json: true
                })).to.be.equal("[\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\",\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"]");
                expect(util.jsesc("foo\x00bar", {
                    json: true,
                    wrap: false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo\\u0000bar");
                expect(util.jsesc("foo \"\x00\" bar", {
                    json: true,
                    wrap: false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo \\\"\\u0000\\\" bar");
                expect(util.jsesc("foo \"\x00\" bar ' qux", {
                    json: true,
                    quotes: "single", // override default `quotes: 'double'` when `json` is enabled
                    wrap: false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo \"\\u0000\" bar \\' qux");
                expect(util.jsesc("foo\uD834\uDF06bar\xA9baz", {
                    json: true,
                    es6: true // override default `es6: false` when `json` is enabled
                })).to.be.equal("\"foo\\u{1D306}bar\\u00A9baz\"");
                const tmp = {
                    "shouldn\u2019t be here": 10,
                    toJSON() {
                        return {
                            hello: "world",
                            "\uD83D\uDCA9": "foo",
                            pile: "\uD83D\uDCA9"
                        };
                    }
                };
                expect(util.jsesc(tmp, { json: true })).to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are called when `json: true`");
                expect(util.jsesc(tmp)).not.to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are not called when `json: false`");
                expect(util.jsesc(42, {
                    numbers: "hexadecimal",
                    lowercaseHex: true
                })).to.be.equal("0x2a");
                expect(util.jsesc("\u2192\xE9", {
                    lowercaseHex: true
                })).to.be.equal("\\u2192\\xe9");
                expect(util.jsesc("\u2192\xE9", {
                    lowercaseHex: false
                })).to.be.equal("\\u2192\\xE9");
                expect(util.jsesc("\u2192\xE9", {
                    lowercaseHex: true,
                    json: true
                })).to.be.equal("\"\\u2192\\u00e9\"");
                expect(util.jsesc("\u2192\xe9", {
                    lowercaseHex: false,
                    json: true
                })).to.be.equal("\"\\u2192\\u00E9\"");
                expect(util.jsesc("\xE7\xE7a\xE7\xE7", {
                    lowercaseHex: true,
                    escapeEverything: true
                })).to.be.equal("\\xe7\\xe7\\x61\\xe7\\xe7");
                expect(util.jsesc("\xE7\xE7a\xE7\xE7", {
                    lowercaseHex: false,
                    escapeEverything: true
                })).to.be.equal("\\xE7\\xE7\\x61\\xE7\\xE7");
                expect(util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                    lowercaseHex: true,
                    es6: true
                })).to.be.equal("\\u2192\\xe9\\u{1f4a9}");
                expect(util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                    lowercaseHex: false,
                    es6: true
                })).to.be.equal("\\u2192\\xE9\\u{1F4A9}");
            });
        });

        describe("advanced tests", () => {
            let allSymbols = "";
            // Generate strings based on code points. Trickier than it seems:
            // https://mathiasbynens.be/notes/javascript-encoding
            for (let codePoint = 0x000000; codePoint <= 0x10FFFF; codePoint += 0xF) {
                const symbol = String.fromCodePoint(codePoint);
                // ok(
                // 	eval('\'' + util.jsesc(symbol) + '\'') == symbol,
                // 	'U+' + codePoint.toString(16).toUpperCase()
                // );
                allSymbols += `${symbol} `;
            }
            it("works correctly for advanced operations", () => {
                expect(eval(`'${util.jsesc(allSymbols)}'`) == allSymbols).to.be.ok;
                expect(eval(`'${util.jsesc(allSymbols, {
                    quotes: "single"
                })}'`) == allSymbols).to.be.ok;
                expect(eval(util.jsesc(allSymbols, {
                    quotes: "single",
                    wrap: true
                })) == allSymbols).to.be.ok;
                expect(eval(`"${util.jsesc(allSymbols, {
                    quotes: "double"
                })}"`) == allSymbols).to.be.ok;
                expect(eval(util.jsesc(allSymbols, {
                    quotes: "double",
                    wrap: true
                })) == allSymbols).to.be.ok;

                // Some of these depend on `JSON.parse()`, so only test them in Node
                // Some of these depend on `JSON.parse()`, so only test them in Node
                const testArray = [
                    undefined, Infinity, new Number(Infinity), -Infinity,
                    new Number(-Infinity), 0, new Number(0), -0, new Number(-0), +0,
                    new Number(+0), new Function(), "str",
                    function zomg() {
                        return "desu";
                    }, null, true, new Boolean(true),
                    false, new Boolean(false), {
                        foo: 42, hah: [1, 2, 3, { foo: 42 }]
                    }
                ];
                expect(util.jsesc(testArray, {
                    json: false
                })).to.be.equal("[undefined,Infinity,Infinity,-Infinity,-Infinity,0,0,0,0,0,0,function anonymous() {\n\n},'str',function zomg() {\n                    return \"desu\";\n                },null,true,true,false,false,{'foo':42,'hah':[1,2,3,{'foo':42}]}]");
                expect(util.jsesc(testArray, {
                    json: true
                })).to.be.equal("[null,null,null,null,null,0,0,0,0,0,0,null,\"str\",null,null,true,true,false,false,{\"foo\":42,\"hah\":[1,2,3,{\"foo\":42}]}]");
                expect(util.jsesc(testArray, {
                    json: true,
                    compact: false
                })).to.be.equal("[\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\tnull,\n\t\"str\",\n\tnull,\n\tnull,\n\ttrue,\n\ttrue,\n\tfalse,\n\tfalse,\n\t{\n\t\t\"foo\": 42,\n\t\t\"hah\": [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3,\n\t\t\t{\n\t\t\t\t\"foo\": 42\n\t\t\t}\n\t\t]\n\t}\n]");
            });
        });
    });

    describe("asyncWaterfall", () => {
        it("basics", (done) => {
            const callOrder = [];

            util.asyncWaterfall([
                function (callback) {
                    callOrder.push("fn1");
                    setTimeout(() => {
                        callback(null, "one", "two");
                    }, 0);
                },
                function (arg1, arg2, callback) {
                    callOrder.push("fn2");
                    expect(arg1).to.equal("one");
                    expect(arg2).to.equal("two");
                    setTimeout(() => {
                        callback(null, arg1, arg2, "three");
                    }, 25);
                },
                function (arg1, arg2, arg3, callback) {
                    callOrder.push("fn3");
                    expect(arg1).to.equal("one");
                    expect(arg2).to.equal("two");
                    expect(arg3).to.equal("three");
                    callback(null, "four");
                },
                function (arg4, callback) {
                    callOrder.push("fn4");
                    expect(callOrder).to.eql(["fn1", "fn2", "fn3", "fn4"]);
                    callback(null, "test");
                }
            ], (err) => {
                expect(err === null, `${err} passed instead of 'null'`);
                done();
            });
        });

        it("empty array", (done) => {
            util.asyncWaterfall([], (err) => {
                if (err) {
                    throw err;
                }
                done();
            });
        });

        it("non-array", (done) => {
            util.asyncWaterfall({}, (err) => {
                expect(err.message).to.equal("First argument to waterfall must be an array of functions");
                done();
            });
        });

        it("no callback", (done) => {
            util.asyncWaterfall([
                function (callback) {
                    callback();
                },
                function (callback) {
                    callback(); done();
                }
            ]);
        });

        it("async", (done) => {
            const callOrder = [];

            util.asyncWaterfall([
                function (callback) {
                    callOrder.push(1);
                    callback();
                    callOrder.push(2);
                },
                function (callback) {
                    callOrder.push(3);
                    callback();
                },
                function () {
                    expect(callOrder).to.eql([1, 3]);
                    done();
                }
            ]);
        });

        it("error", (done) => {
            util.asyncWaterfall([
                function (callback) {
                    callback("error");
                },
                function (callback) {
                    assert(false, "next function should not be called");
                    callback();
                }
            ], (err) => {
                expect(err).to.equal("error");
                done();
            });
        });

        it("multiple callback calls", () => {
            const arr = [
                function (callback) {
                    // call the callback twice. this should call function 2 twice
                    callback(null, "one", "two");
                    callback(null, "one", "two");
                },
                function (arg1, arg2, callback) {
                    callback(null, arg1, arg2, "three");
                }
            ];
            expect(() => {
                util.asyncWaterfall(arr, adone.noop);
            }).to.throw(/already called/);
        });

        it("call in another context", (done) => {
            const vm = require("vm");
            const sandbox = { done, util };

            const fn = `(${(function () {
                util.asyncWaterfall([function (callback) {
                    callback();
                }], (err) => {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
            }).toString()}())`;

            vm.runInNewContext(fn, sandbox);
        });

        it("should not use unnecessary deferrals", (done) => {
            let sameStack = true;

            util.asyncWaterfall([
                function (cb) {
                    cb(null, 1);
                },
                function (arg, cb) {
                    cb();
                }
            ], () => {
                expect(sameStack).to.equal(true);
                done();
            });

            sameStack = false;
        });
    });

    describe("once", () => {
        const { once } = util;

        it("should call only once", () => {
            const fn = spy();
            const w = once(fn);
            w();
            w();
            w();
            expect(fn).to.have.been.calledOnce;
        });

        it("should pass arguments", () => {
            const fn = spy();
            const w = once(fn);
            w(1, 2, 3);
            expect(fn).to.be.calledWith(1, 2, 3);
        });

        it("should pass the context", () => {
            const fn = spy();
            const w = once(fn);
            const ctx = { a: 1, b: 2, c: 3, w };
            ctx.w(1, 2, 3);
            expect(fn.thisValues[0]).to.be.equal(ctx);
        });
    });

    describe("clone", () => {
        const { clone } = util;

        context("objects", () => {
            specify("not deep", () => {
                const s = { a: 1, b: { a: 1 } };
                const t = clone(s, { deep: false });
                expect(t).to.be.deep.equal(s);
                expect(t).not.to.be.equal(s);
                t.b.b = 2;
                expect(t.b).to.be.deep.equal(s.b);
            });

            specify("deep", () => {
                const s = { a: 1, b: { a: 1 } };
                const t = clone(s, { deep: true });
                expect(t).to.be.deep.equal(s);
                expect(t).not.to.be.equal(s);
                t.b.b = 2;
                expect(t.b).not.to.be.deep.equal(s.b);
            });
        });

        context("arrays", () => {
            context("inside objects", () => {
                specify("not deep", () => {
                    const s = { a: [1, 2, 3] };
                    const t = clone(s, { deep: false });
                    expect(t).to.be.deep.equal(s);
                    expect(t).not.to.be.equal(s);
                    expect(t.a).to.be.equal(s.a);
                });

                specify("deep", () => {
                    const s = { a: [1, 2, 3] };
                    const t = clone(s, { deep: true });
                    expect(t).to.be.deep.equal(s);
                    expect(t).not.to.be.equal(s);
                    expect(t.a).not.to.be.equal(s.a);
                    expect(t.a).to.be.deep.equal(s.a);
                });
            });

            specify("not deep", () => {
                const s = [1, 2, [1, 2, 3]];
                const t = clone(s, { deep: false });
                expect(t).not.to.be.equal(s);
                expect(t).to.be.deep.equal(s);
                s[2].push(3);
                expect(t).to.be.deep.equal(s);
            });

            specify("deep", () => {
                const s = [1, 2, [1, 2, 3]];
                const t = clone(s, { deep: true });
                expect(t).not.to.be.equal(s);
                expect(t).to.be.deep.equal(s);
                s[2].push(3);
                expect(t).not.to.be.deep.equal(s);
            });
        });

        it("should set deep = true by default", () => {
            const s = { a: { b: { c: 1 } } };
            const t = clone(s);
            expect(t).to.be.deep.equal(s);
            t.a.b.d = 2;
            expect(t).not.to.be.deep.equal(s);
        });
    });

    describe("zip", () => {
        const { zip } = util;
        const { collection } = adone;

        it("should be a generator", () => {
            expect(is.generator(zip)).to.be.true;
        });

        it("should zip 2 arrays", () => {
            const res = [...zip([1, 2, 3], [4, 5, 6])];
            expect(res).to.be.deep.equal([
                [1, 4],
                [2, 5],
                [3, 6]
            ]);
        });

        it("should zip many arrays", () => {
            const res = [...zip([1], [2], [3], [4], [5], [6])];
            expect(res).to.be.deep.equal([[1, 2, 3, 4, 5, 6]]);
        });

        it("should end when one of them ends", () => {
            const res = [...zip(
                [1, 2, 3, 4],
                [1, 2, 3],
                [1, 2]
            )];
            expect(res).to.be.deep.equal([[1, 1, 1], [2, 2, 2]]);
        });

        it("should support any iterable object", () => {
            const list = new collection.LinkedList(3);
            list.push(1);
            list.push(2);
            list.push(3);
            const fib = function* () {
                let [a, b] = [0, 1];
                for (; ;) {
                    yield a;
                    [a, b] = [b, a + b];
                }
            };
            const res = [...zip(list, [4, 5, 6, 7, 8, 9], fib())];
            expect(res).to.be.deep.equal([[1, 4, 0], [2, 5, 1], [3, 6, 1]]);
        });

        it("should throw if non-iterable", () => {
            expect(() => {
                for (const i of zip({})) {  // eslint-disable-line

                }
            }).to.throw(x.InvalidArgument, "Only iterables are supported");
        });

        it("should correctly handle an empty array", () => {
            const res = [...zip([], [1, 2, 3])];
            expect(res).to.be.deep.equal([]);
        });

        it("should correctly handle empty arguments", () => {
            const res = [...zip()];
            expect(res).to.be.deep.equal([]);
        });

        it("should finish iterators", () => {
            class ISomething {
                constructor(val) {
                    this.cursor = 0;
                    this.val = val;
                    this.ret = false;
                }

                next() {
                    if (this.cursor === this.val.length) {
                        return { done: true };
                    }
                    return { done: false, value: this.val[this.cursor++] };
                }

                return() {
                    this.ret = true;
                }
            }

            class Something extends Array {
                constructor(val) {
                    super(...val);
                    this.iterators = [];
                }

                [Symbol.iterator]() {
                    const it = new ISomething(this);
                    this.iterators.push();
                    return it;
                }
            }

            const smth = new Something([1, 2, 3, 4, 5]);

            const res = [...zip([1, 2, 3], smth, smth)];
            expect(res).to.be.deep.equal([[1, 1, 1], [2, 2, 2], [3, 3, 3]]);
            for (const it of smth.iterators) {
                expect(it.ret).to.be.true;
            }
        });
    });

    for (const name of ["range", "xrange"]) {
        const { [name]: range } = util;

        describe(name, () => {
            if (name === "xrange") {
                it("should be a generator", () => {
                    expect(range(0, 10)).to.be.a("generator");
                });
            } else {
                it("should be an array", () => {
                    expect(range(0, 10)).to.be.an("array");
                });
            }

            it("should return a range [start, stop)", () => {
                expect([...range(0, 10)]).to.be.deep.equal([
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
                ]);
                expect([...range(-10, 0)]).to.be.deep.equal([
                    -10, -9, -8, -7, -6, -5, -4, -3, -2, -1
                ]);
            });

            it("should increment by 2", () => {
                expect([...range(0, 10, 2)]).to.be.deep.equal([
                    0, 2, 4, 6, 8
                ]);
            });

            it("should decrement", () => {
                expect([...range(10, 0, -1)]).to.be.deep.equal([
                    10, 9, 8, 7, 6, 5, 4, 3, 2, 1
                ]);
            });

            it("should set start = 0 if only one argument", () => {
                expect([...range(5)]).to.be.deep.equal([0, 1, 2, 3, 4]);
            });

            it("should be empty", () => {
                expect([...range(-5, -10)]).to.be.empty;
            });
        });
    }

    describe("reFindAll", () => {
        it("should find all matches", () => {
            const re = /(ab|cd|ef)/g;
            const s = "abcdef";
            const matches = util.reFindAll(re, s);
            expect(matches).to.be.an("array");
            expect(matches).to.have.lengthOf(3);
            expect(matches[0]).to.be.an("array");
            expect(matches[0][1]).to.be.equal("ab");
            expect(matches[1]).to.be.an("array");
            expect(matches[1][1]).to.be.equal("cd");
            expect(matches[2]).to.be.an("array");
            expect(matches[2][1]).to.be.equal("ef");
        });

        it("should return empty array if there is no matches", () => {
            const re = /(ab|cd|ef)/g;
            const s = "012345677";
            const matches = util.reFindAll(re, s);
            expect(matches).to.be.an("array");
            expect(matches).to.be.empty;
        });
    });

    describe("assignDeep", () => {
        it("should assign deeply", () => {
            const document = {
                style: {
                    align: "left",
                    font: {
                        size: 14
                    }
                },
                body: {
                    lines: 100,
                    rows: 1000,
                    custom: {
                        words: 10,
                        chars: 28
                    }
                }
            };
            util.assignDeep(document, {
                style: {
                    font: {
                        value: "Roboto"
                    }
                },
                body: {
                    pages: 2,
                    rows: 1010,
                    custom: {
                        magic: true,
                        chars: 22
                    }
                }
            });
            expect(document).to.be.deep.equal({
                style: {
                    align: "left",
                    font: {
                        size: 14,
                        value: "Roboto"
                    }
                },
                body: {
                    pages: 2,
                    lines: 100,
                    rows: 1010,
                    custom: {
                        words: 10,
                        chars: 22,
                        magic: true
                    }
                }
            });
        });

        it("should return the target", () => {
            const target = { a: 1 };
            const ret = util.assignDeep(target, { b: 2 });
            expect(ret).to.be.equal(target);
            expect(ret).to.be.deep.equal({ a: 1, b: 2 });
        });

        it("should set the target to empty object if it is falsy", () => {
            expect(util.assignDeep(null, { a: 2 })).to.be.deep.equal({ a: 2 });
        });

        it("should support multiple sources", () => {
            expect(util.assignDeep(
                { a: 1 },
                { b: 2, c: { d: 3 } },
                { c: { e: 5 } },
                { d: { f: 7, g: 1 } },
                { d: { f: 4, y: 2 }, c: { w: 2 } }
            )).to.be.deep.equal({
                a: 1,
                b: 2,
                c: {
                    d: 3,
                    e: 5,
                    w: 2
                },
                d: {
                    f: 4,
                    g: 1,
                    y: 2
                }
            });
        });

        it("should copy values", () => {
            const a = { a: 1 };
            const b = { b: { c: 10 } };
            util.assignDeep(a, b);
            b.b.c = 42;
            expect(a).to.be.deep.equal({ a: 1, b: { c: 10 } });
        });

        it("should not touch not plain objects", () => {
            const f = () => { };
            const a = { a: { b: 10 } };
            const b = { a: f, b: f };
            util.assignDeep(a, b);
            expect(a).to.be.deep.equal({ a: f, b: f });
        });
    });

    describe("reinterval", () => {
        it("should work as an usual setInterval", () => {
            return new Promise((resolve, reject) => {
                const startTime = new Date().getTime();

                util.reinterval(() => {
                    if (Math.abs(new Date().getTime() - startTime - 1000) <= 10) {
                        resolve();
                    } else {
                        reject(new Error("Took too much (or not enough) time"));
                    }
                }, 1000);
            });
        });

        it("should be able to clear an Interval", () => {
            return new Promise((resolve, reject) => {
                const interval = util.reinterval(() => {
                    reject(new Error("Interval not cleared"));
                }, 200);

                setTimeout(interval.clear, 100);

                setTimeout(resolve, 300);
            });
        });

        it("should be able to reschedule an Interval", () => {
            return new Promise((resolve, reject) => {
                const startTime = new Date().getTime();

                const interval = util.reinterval(() => {
                    if (Math.abs(new Date().getTime() - startTime - 800) <= 10) {
                        resolve();
                    } else {
                        reject(new Error("Took too much (or not enough) time"));
                    }
                }, 500);

                setTimeout(interval.reschedule, 300, [500]);
            });
        });
    });
});
