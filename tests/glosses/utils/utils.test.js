describe("glosses", "utils", () => {
    const { util } = adone;

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
                return Object.compare(a, b);
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
            Test.prototype.b = () => { };
            const t = new Test();
            const props = keys(t, { followProto: true });
            expect(props).to.be.deep.equal(["a", "b"]);
        });

        it("should work with classic class inheritance", () => {
            function A() {
                this.aProp = 1;
            }
            A.prototype.aMethod = () => { };

            function B() {
                A.call(this);
                this.bProp = 2;
            }
            adone.std.util.inherits(B, A);
            B.prototype.bMethod = () => { };
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
            if (adone.is.win32) {
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
            }).timeout(15000);
        });
    });

    describe("Stat", () => {

        it("should return a `util.Mode` instance with `new`", () => {
            const m = new util.Mode({});
            expect(m instanceof util.Mode).to.be.true;
        });

        it("should throw an Error if no `stat` object is passed in", () => {
            try {
                new util.Mode();
                expect(false).to.be.true;
            } catch (e) {
                expect("You must pass in a \"stat\" object").to.be.equal(e.message);
            }
        });

        [{
            mode: 33188 /* 0100644 */
            , octal: "0644",
            string: "-rw-r--r--",
            type: "file"
        }, {
            mode: 16877 /* 040755 */
            , octal: "0755",
            string: "drwxr-xr-x",
            type: "directory"
        }, {
            mode: 16832 /* 040700 */
            , octal: "0700",
            string: "drwx------",
            type: "directory"
        }, {
            mode: 41325 /* 0120555 */
            , octal: "0555",
            string: "lr-xr-xr-x",
            type: "symbolicLink"
        }, {
            mode: 8592 /* 020620 */
            , octal: "0620",
            string: "crw--w----",
            type: "characterDevice"
        }, {
            mode: 24960 /* 060600 */
            , octal: "0600",
            string: "brw-------",
            type: "blockDevice"
        }, {
            mode: 4516 /* 010644 */
            , octal: "0644",
            string: "prw-r--r--",
            type: "FIFO"
        }].forEach((test) => {
            const m = new util.Mode(test);
            const isFn = `is${test.type[0].toUpperCase()}${test.type.substring(1)}`;
            const strMode = m.toString();
            const opposite = test.type == "file" ? "isDirectory" : "isFile";
            const first = test.type == "file" ? "d" : "-";
            describe(`input: 0${test.mode.toString(8)}`, () => {
                describe("#toString()", () => {
                    it(`should equal "${test.string}"`, () => {
                        expect(m.toString()).to.be.equal(test.string);
                    });
                });
                describe("#toOctal()", () => {
                    it(`should equal "${test.octal}"`, () => {
                        expect(m.toOctal()).to.be.equal(test.octal);
                    });
                });
                describe(`#${isFn}()`, () => {
                    it(`should return \`true\` for #${isFn}()`, () => {
                        expect(m[isFn]()).to.be.ok;
                    });
                    it(`should remain "${strMode}" after #${isFn}(true) (gh-2)`, () => {
                        expect(true).to.be.equal(m[isFn](true));
                        expect(strMode).to.be.equal(m.toString());
                    });
                });
                describe(`#${opposite}(true)`, () => {
                    it(`should return \`false\` for \`#${opposite}(true)\``, () => {
                        expect(false).to.be.equal(m[opposite](true));
                    });
                    it(`should be "${first}${m.toString().substring(1)}" after #${opposite}(true) (gh-2)`, () => {
                        expect(first + m.toString().substring(1)).to.be.equal(m.toString());
                    });
                });
            });
        });
    });

    describe("random(min, max)", () => {
        it("should generate number in interval [min, max)", () => {
            for (let i = 0; i < 100; i++) {
                const max = Math.floor(Math.random() * (1000000 - 100) + 100);
                const min = Math.floor(Math.random() * max);

                for (let i = 0; i < 100; i++) {
                    const num = util.random(min, max);
                    expect(num).to.be.least(min);
                    expect(num).to.be.below(max);
                }
            }
        });
    });

    describe("typeOf", () => {

        it("array", () => {
            assert(util.typeOf([]) === "Array");
            assert(util.typeOf([]) === "Array");
        });

        it("regexp", () => {
            assert(util.typeOf(/a-z/gi) === "RegExp");
            assert(util.typeOf(new RegExp("a-z")) === "RegExp");
        });

        it("function", () => {
            assert(util.typeOf(() => { }) === "function");
        });

        it("arguments", function () {
            assert(util.typeOf(arguments) === "Arguments");
        });

        it("date", () => {
            assert(util.typeOf(new Date()) === "Date");
        });

        it("number", () => {
            assert(util.typeOf(1) === "number");
            assert(util.typeOf(1.234) === "number");
            assert(util.typeOf(-1) === "number");
            assert(util.typeOf(-1.234) === "number");
            assert(util.typeOf(Infinity) === "number");
            assert(util.typeOf(NaN) === "number");
        });

        it("number objects", () => {
            assert(util.typeOf(new Number(2)) === "Number");
        });

        it("string", () => {
            assert(util.typeOf("hello world") === "string");
        });

        it("string objects", () => {
            assert(util.typeOf(new String("hello")) === "String");
        });

        it("null", () => {
            assert(util.typeOf(null) === "null");
            assert(util.typeOf(undefined) !== "null");
        });

        it("undefined", () => {
            assert(util.typeOf(undefined) === "undefined");
            assert(util.typeOf(null) !== "undefined");
        });

        it("object", () => {
            function Noop() { }
            assert(util.typeOf({}) === "Object");
            assert(util.typeOf(Noop) !== "Object");
            assert(util.typeOf(new Noop()) === "Object");
            assert(util.typeOf(new Object()) === "Object");
            assert(util.typeOf(Object.create(null)) === "Object");
            assert(util.typeOf(Object.create(Object.prototype)) === "Object");
        });

        // See: https://github.com/chaijs/type-detect/pull/25
        it("object with .undefined property getter", () => {
            const foo = {};
            Object.defineProperty(foo, "undefined", {
                get() {
                    throw Error("Should never happen");
                }
            });
            assert(util.typeOf(foo) === "Object");
        });

        it("boolean", () => {
            assert(util.typeOf(true) === "boolean");
            assert(util.typeOf(false) === "boolean");
            assert(util.typeOf(!0) === "boolean");
        });

        it("boolean object", () => {
            assert(util.typeOf(new Boolean()) === "Boolean");
        });

        it("error", () => {
            assert(util.typeOf(new Error()) === "Error");
            assert(util.typeOf(new EvalError()) === "Error");
            assert(util.typeOf(new RangeError()) === "Error");
            assert(util.typeOf(new ReferenceError()) === "Error");
            assert(util.typeOf(new SyntaxError()) === "Error");
            assert(util.typeOf(new URIError()) === "Error");
        });

        it("Math", () => {
            assert(util.typeOf(Math) === "Math");
        });

        it("JSON", () => {
            assert(util.typeOf(JSON) === "JSON");
        });

        describe("Stubbed ES2015 Types", () => {
            const originalObjectToString = Object.prototype.toString;
            function stubObjectToStringOnce(staticValue) {
                Object.prototype.toString = function () {  // eslint-disable-line no-extend-native
                    Object.prototype.toString = originalObjectToString;  // eslint-disable-line no-extend-native
                    return staticValue;
                };
            }
            function Thing() { }

            it("map", () => {
                stubObjectToStringOnce("[object Map]");
                assert(util.typeOf(new Thing()) === "Map");
            });

            it("weakmap", () => {
                stubObjectToStringOnce("[object WeakMap]");
                assert(util.typeOf(new Thing()) === "WeakMap");
            });

            it("set", () => {
                stubObjectToStringOnce("[object Set]");
                assert(util.typeOf(new Thing()) === "Set");
            });

            it("weakset", () => {
                stubObjectToStringOnce("[object WeakSet]");
                assert(util.typeOf(new Thing()) === "WeakSet");
            });

            it("symbol", () => {
                stubObjectToStringOnce("[object Symbol]");
                assert(util.typeOf(new Thing()) === "Symbol");
            });

            it("promise", () => {
                stubObjectToStringOnce("[object Promise]");
                assert(util.typeOf(new Thing()) === "Promise");
            });

            it("int8array", () => {
                stubObjectToStringOnce("[object Int8Array]");
                assert(util.typeOf(new Thing()) === "Int8Array");
            });

            it("uint8array", () => {
                stubObjectToStringOnce("[object Uint8Array]");
                assert(util.typeOf(new Thing()) === "Uint8Array");
            });

            it("uint8clampedarray", () => {
                stubObjectToStringOnce("[object Uint8ClampedArray]");
                assert(util.typeOf(new Thing()) === "Uint8ClampedArray");
            });

            it("int16array", () => {
                stubObjectToStringOnce("[object Int16Array]");
                assert(util.typeOf(new Thing()) === "Int16Array");
            });

            it("uint16array", () => {
                stubObjectToStringOnce("[object Uint16Array]");
                assert(util.typeOf(new Thing()) === "Uint16Array");
            });

            it("int32array", () => {
                stubObjectToStringOnce("[object Int32Array]");
                assert(util.typeOf(new Thing()) === "Int32Array");
            });

            it("uint32array", () => {
                stubObjectToStringOnce("[object Uint32Array]");
                assert(util.typeOf(new Thing()) === "Uint32Array");
            });

            it("float32array", () => {
                stubObjectToStringOnce("[object Float32Array]");
                assert(util.typeOf(new Thing()) === "Float32Array");
            });

            it("float64array", () => {
                stubObjectToStringOnce("[object Float64Array]");
                assert(util.typeOf(new Thing()) === "Float64Array");
            });

            it("dataview", () => {
                stubObjectToStringOnce("[object DataView]");
                assert(util.typeOf(new Thing()) === "DataView");
            });

            it("arraybuffer", () => {
                stubObjectToStringOnce("[object ArrayBuffer]");
                assert(util.typeOf(new Thing()) === "ArrayBuffer");
            });

            it("generatorfunction", () => {
                stubObjectToStringOnce("[object GeneratorFunction]");
                assert(util.typeOf(new Thing()) === "GeneratorFunction");
            });

            it("generator", () => {
                stubObjectToStringOnce("[object Generator]");
                assert(util.typeOf(new Thing()) === "Generator");
            });

            it("string iterator", () => {
                stubObjectToStringOnce("[object String Iterator]");
                assert(util.typeOf(new Thing()) === "String Iterator");
            });

            it("array iterator", () => {
                stubObjectToStringOnce("[object Array Iterator]");
                assert(util.typeOf(new Thing()) === "Array Iterator");
            });

            it("map iterator", () => {
                stubObjectToStringOnce("[object Map Iterator]");
                assert(util.typeOf(new Thing()) === "Map Iterator");
            });

            it("set iterator", () => {
                stubObjectToStringOnce("[object Set Iterator]");
                assert(util.typeOf(new Thing()) === "Set Iterator");
            });

        });

        describe("@@toStringTag Sham", () => {
            const originalObjectToString = Object.prototype.toString;
            before(() => {
                global.Symbol = global.Symbol || {};
                if (!global.Symbol.toStringTag) {
                    global.Symbol.toStringTag = "__@@toStringTag__";
                }
                const test = {};
                test[Symbol.toStringTag] = function () {
                    return "foo";
                };
                if (Object.prototype.toString(test) !== "[object foo]") {
                    Object.prototype.toString = function () { // eslint-disable-line no-extend-native
                        if (typeof this === "object" && typeof this[Symbol.toStringTag] === "function") {
                            return `[object ${this[Symbol.toStringTag]()}]`;
                        }
                        return originalObjectToString.call(this);
                    };
                }
            });

            after(() => {
                Object.prototype.toString = originalObjectToString; // eslint-disable-line no-extend-native
            });


            it("plain object", () => {
                const obj = {};
                obj[Symbol.toStringTag] = function () {
                    return "Foo";
                };

                assert(util.typeOf(obj) === "Foo");
            });

        });

        describe("ES2015 Specific", () => {
            it("string iterator", () => {
                assert(util.typeOf(""[Symbol.iterator]()) === "String Iterator");
            });

            it("array iterator", () => {
                assert(util.typeOf([][Symbol.iterator]()) === "Array Iterator");
            });

            it("array iterator (entries)", () => {
                assert(util.typeOf([].entries()) === "Array Iterator");
            });

            it("map", () => {
                assert(util.typeOf(new Map()) === "Map");
            });

            it("map iterator", () => {
                assert(util.typeOf(new Map()[Symbol.iterator]()) === "Map Iterator");
            });

            it("map iterator (entries)", () => {
                assert(util.typeOf(new Map().entries()) === "Map Iterator");
            });

            it("weakmap", () => {
                assert(util.typeOf(new WeakMap()) === "WeakMap");
            });

            it("set", () => {
                assert(util.typeOf(new Set()) === "Set");
            });

            it("set iterator", () => {
                assert(util.typeOf(new Set()[Symbol.iterator]()) === "Set Iterator");
            });

            it("set iterator", () => {
                assert(util.typeOf(new Set().entries()) === "Set Iterator");
            });

            it("weakset", () => {
                assert(util.typeOf(new WeakSet()) === "WeakSet");
            });

            it("symbol", () => {
                assert(util.typeOf(Symbol()) === "symbol");
            });

            it("promise", () => {
                function noop() { }
                assert(util.typeOf(new Promise(noop)) === "Promise");
            });

            it("int8array", () => {
                assert(util.typeOf(new Int8Array()) === "Int8Array");
            });

            it("uint8array", () => {
                assert(util.typeOf(new Uint8Array()) === "Uint8Array");
            });

            it("uint8clampedarray", () => {
                assert(util.typeOf(new Uint8ClampedArray()) === "Uint8ClampedArray");
            });

            it("int16array", () => {
                assert(util.typeOf(new Int16Array()) === "Int16Array");
            });

            it("uint16array", () => {
                assert(util.typeOf(new Uint16Array()) === "Uint16Array");
            });

            it("int32array", () => {
                assert(util.typeOf(new Int32Array()) === "Int32Array");
            });

            it("uint32array", () => {
                assert(util.typeOf(new Uint32Array()) === "Uint32Array");
            });

            it("float32array", () => {
                assert(util.typeOf(new Float32Array()) === "Float32Array");
            });

            it("float64array", () => {
                assert(util.typeOf(new Float64Array()) === "Float64Array");
            });

            it("dataview", () => {
                const arrayBuffer = new ArrayBuffer(1);
                assert(util.typeOf(new DataView(arrayBuffer)) === "DataView");
            });

            it("arraybuffer", () => {
                assert(util.typeOf(new ArrayBuffer(1)) === "ArrayBuffer");
            });

            it("arrow function", () => {
                assert(util.typeOf(eval("() => {}")) === "function"); // eslint-disable-line no-eval
            });

            it("generator function", () => {
                assert(util.typeOf(eval("function * foo () {}; foo")) === "function"); // eslint-disable-line no-eval
            });

            it("generator", () => {
                assert(util.typeOf(eval("(function * foo () {}())")) === "Generator"); // eslint-disable-line no-eval
            });

        });
    });

    describe("deepEqual", () => {
        const eql = util.deepEqual;

        describe("genertic", () => {
            describe("strings", () => {

                it("returns true for same values", () => {
                    assert(eql("x", "x"), "eql('x', 'x')");
                });

                it("returns true for different instances with same values", () => {
                    assert(eql(new String("x"), new String("x")), "eql(new String('x'), new String('x'))");
                });

                it("returns false for literal vs instance with same value", () => {
                    assert(eql("x", new String("x")) === false, "eql('x', new String('x')) === false");
                    assert(eql(new String("x"), "x") === false, "eql(new String('x'), 'x') === false");
                });

                it("returns false for different instances with different values", () => {
                    assert(eql(new String("x"), new String("y")) === false,
                        "eql(new String('x'), new String('y')) === false");
                });

                it("returns false for different values", () => {
                    assert(eql("x", "y") === false, "eql('x', 'y') === false");
                });

            });

            describe("booleans", () => {

                it("returns true for same values", () => {
                    assert(eql(true, true), "eql(true, true)");
                });

                it("returns true for instances with same value", () => {
                    assert(eql(new Boolean(true), new Boolean(true)), "eql(new Boolean(true), new Boolean(true))");
                });

                it("returns false for literal vs instance with same value", () => {
                    assert(eql(true, new Boolean(true)) === false, "eql(true, new Boolean(true)) === false");
                });

                it("returns false for literal vs instance with different values", () => {
                    assert(eql(false, new Boolean(true)) === false, "eql(false, new Boolean(true)) === false");
                    assert(eql(new Boolean(false), true) === false, "eql(new Boolean(false), true) === false");
                });

                it("returns false for instances with different values", () => {
                    assert(eql(new Boolean(false), new Boolean(true)) === false,
                        "eql(new Boolean(false), new Boolean(true)) === false");
                    assert(eql(new Boolean(true), new Boolean(false)) === false,
                        "eql(new Boolean(true), new Boolean(false)) === false");
                });

                it("returns false for different values", () => {
                    assert(eql(true, false) === false, "eql(true, false) === false");
                    assert(eql(true, Boolean(false)) === false, "eql(true, Boolean(false)) === false");
                });

            });

            describe("null", () => {

                it("returns true for two nulls", () => {
                    assert(eql(null, null), "eql(null, null)");
                });

                it("returns false for null, undefined", () => {
                    assert(eql(null, undefined) === false, "eql(null, undefined) === false");
                });

                it("doesn't crash on weakmap key error (#33)", () => {
                    assert(eql({}, null) === false, "eql({}, null) === false");
                });

            });

            describe("undefined", () => {

                it("returns true for two undefineds", () => {
                    assert(eql(undefined, undefined), "eql(undefined, undefined)");
                });

                it("returns false for undefined, null", () => {
                    assert(eql(undefined, null) === false, "eql(undefined, null) === false");
                });

            });

            describe("numbers", () => {

                it("returns true for same values", () => {
                    assert(eql(-0, -0), "eql(-0, -0)");
                    assert(eql(+0, +0), "eql(+0, +0)");
                    assert(eql(0, 0), "eql(0, 0)");
                    assert(eql(1, 1), "eql(1, 1)");
                    assert(eql(Infinity, Infinity), "eql(Infinity, Infinity)");
                    assert(eql(-Infinity, -Infinity), "eql(-Infinity, -Infinity)");
                });

                it("returns false for literal vs instance with same value", () => {
                    assert(eql(1, new Number(1)) === false, "eql(1, new Number(1)) === false");
                });

                it("returns true NaN vs NaN", () => {
                    assert(eql(NaN, NaN), "eql(NaN, NaN)");
                });

                it("returns true for NaN instances", () => {
                    assert(eql(new Number(NaN), new Number(NaN)), "eql(new Number(NaN), new Number(NaN))");
                });

                it("returns false on numbers with different signs", () => {
                    assert(eql(-1, 1) === false, "eql(-1, 1) === false");
                    assert(eql(-0, +0) === false, "eql(-0, +0) === false");
                    assert(eql(-Infinity, Infinity) === false, "eql(-Infinity, +Infinity) === false");
                });

                it("returns false on instances with different signs", () => {
                    assert(eql(new Number(-1), new Number(1)) === false, "eql(new Number(-1), new Number(1)) === false");
                    assert(eql(new Number(-0), new Number(+0)) === false, "eql(new Number(-0), new Number(+0)) === false");
                    assert(eql(new Number(-Infinity), new Number(Infinity)) === false,
                        "eql(new Number(-Infinity), new Number(+Infinity)) === false");
                });

            });

            describe("dates", () => {

                it("returns true given two dates with the same time", () => {
                    const dateA = new Date();
                    assert(eql(dateA, new Date(dateA.getTime())), "eql(dateA, new Date(dateA.getTime()))");
                });

                it("returns true given two invalid dates", () => {
                    assert(eql(new Date(NaN), new Date(NaN)), "eql(new Date(NaN), new Date(NaN))");
                });

                it("returns false given two dates with the different times", () => {
                    const dateA = new Date();
                    assert(eql(dateA, new Date(dateA.getTime() + 1)) === false,
                        "eql(dateA, new Date(dateA.getTime() + 1)) === false");
                });

            });

            describe("regexp", () => {

                it("returns true given two regexes with the same source", () => {
                    assert(eql(/\s/, /\s/), "eql(/\\s/, /\\s/)");
                    assert(eql(/\s/, new RegExp("\\s")), "eql(/\\s/, new RegExp('\\s'))");
                });

                it("returns false given two regexes with different source", () => {
                    assert(eql(/^$/, /^/) === false, "eql(/^$/, /^/) === false");
                    assert(eql(/^$/, new RegExp("^")) === false, "eql(/^$/, new RegExp('^'))");
                });

                it("returns false given two regexes with different flags", () => {
                    assert(eql(/^/m, /^/i) === false, "eql(/^/m, /^/i) === false");
                });

            });

            describe("empty types", () => {

                it("returns true on two empty objects", () => {
                    assert(eql({}, {}), "eql({}, {})");
                });

                it("returns true on two empty arrays", () => {
                    assert(eql([], []), "eql([], [])");
                });

                it("returns false on different types", () => {
                    assert(eql([], {}) === false, "eql([], {}) === false");
                });

            });

            describe("class instances", () => {

                it("returns true given two empty class instances", () => {
                    function BaseA() { }
                    assert(eql(new BaseA(), new BaseA()), "eql(new BaseA(), new BaseA())");
                });

                it("returns true given two class instances with same properties", () => {
                    function BaseA(prop) {
                        this.prop = prop;
                    }
                    assert(eql(new BaseA(1), new BaseA(1)), "eql(new BaseA(1), new BaseA(1))");
                });

                it("returns true given two class instances with deeply equal bases", () => {
                    function BaseA() { }
                    function BaseB() { }
                    BaseA.prototype.foo = { a: 1 };
                    BaseB.prototype.foo = { a: 1 };
                    assert(eql(new BaseA(), new BaseB()) === true,
                        "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 1 }>) === true");
                });

                it("returns false given two class instances with different properties", () => {
                    function BaseA(prop) {
                        this.prop = prop;
                    }
                    assert(eql(new BaseA(1), new BaseA(2)) === false, "eql(new BaseA(1), new BaseA(2)) === false");
                });

                it("returns false given two class instances with deeply unequal bases", () => {
                    function BaseA() { }
                    function BaseB() { }
                    BaseA.prototype.foo = { a: 1 };
                    BaseB.prototype.foo = { a: 2 };
                    assert(eql(new BaseA(), new BaseB()) === false,
                        "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 2 }>) === false");
                });

            });

            describe("arguments", () => {
                function getArguments() {
                    return arguments;
                }

                it("returns true given two arguments", () => {
                    const argumentsA = getArguments();
                    const argumentsB = getArguments();
                    assert(eql(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
                });

                it("returns true given two arguments with same properties", () => {
                    const argumentsA = getArguments(1, 2);
                    const argumentsB = getArguments(1, 2);
                    assert(eql(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
                });

                it("returns false given two arguments with different properties", () => {
                    const argumentsA = getArguments(1, 2);
                    const argumentsB = getArguments(3, 4);
                    assert(eql(argumentsA, argumentsB) === false, "eql(argumentsA, argumentsB) === false");
                });

                it("returns false given an array", function () {
                    assert(eql([], arguments) === false, "eql([], arguments) === false");
                });

                it("returns false given an object", function () {
                    assert(eql({}, arguments) === false, "eql({}, arguments) === false");
                });

            });

            describe("arrays", () => {

                it("returns true with arrays containing same literals", () => {
                    assert(eql([1, 2, 3], [1, 2, 3]), "eql([ 1, 2, 3 ], [ 1, 2, 3 ])");
                    assert(eql(["a", "b", "c"], ["a", "b", "c"]), "eql([ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ])");
                });

                it("returns true given literal or constructor", () => {
                    assert(eql([1, 2, 3], new Array(1, 2, 3)), "eql([ 1, 2, 3 ], new Array(1, 2, 3))");
                });

                it("returns false with arrays containing literals in different order", () => {
                    assert(eql([3, 2, 1], [1, 2, 3]) === false, "eql([ 3, 2, 1 ], [ 1, 2, 3 ]) === false");
                });

                it("returns false for arrays of different length", () => {
                    assert(eql(new Array(1), new Array(100)) === false, "eql(new Array(1), new Array(100)) === false");
                });

            });

            describe("objects", () => {

                it("returns true with objects containing same literals", () => {
                    assert(eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }), "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 })");
                    assert(eql({ foo: "baz" }, { foo: "baz" }), "eql({ foo: 'baz' }, { foo: 'baz' })");
                });

                it("returns true for deeply nested objects", () => {
                    assert(eql({ foo: { bar: "foo" } }, { foo: { bar: "foo" } }),
                        "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'foo' }})");
                });

                it("returns true with objects with same circular reference", () => {
                    const objectA = { foo: 1 };
                    const objectB = { foo: 1 };
                    const objectC = { a: objectA, b: objectB };
                    objectA.bar = objectC;
                    objectB.bar = objectC;
                    assert(eql(objectA, objectB) === true,
                        "eql({ foo: 1, bar: objectC }, { foo: 1, bar: objectC }) === true");
                });

                it("returns true with objects with deeply equal prototypes", () => {
                    const objectA = Object.create({ foo: { a: 1 } });
                    const objectB = Object.create({ foo: { a: 1 } });
                    assert(eql(objectA, objectB) === true,
                        "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 1 } })) === true");
                });

                it("returns false with objects containing different literals", () => {
                    assert(eql({ foo: 1, bar: 1 }, { foo: 1, bar: 2 }) === false,
                        "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }) === false");
                    assert(eql({ foo: "bar" }, { foo: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
                    assert(eql({ foo: { bar: "foo" } }, { foo: { bar: "baz" } }) === false,
                        "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'baz' }}) === false");
                });

                it("returns false with objects containing different keys", () => {
                    assert(eql({ foo: 1, bar: 1 }, { foo: 1, baz: 2 }) === false,
                        "eql({ foo: 1, bar: 2 }, { foo: 1, baz: 2 }) === false");
                    assert(eql({ foo: "bar" }, { bar: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
                });

                it("returns true with circular objects", () => {
                    const objectA = { foo: 1 };
                    const objectB = { foo: 1 };
                    objectA.bar = objectB;
                    objectB.bar = objectA;
                    assert(eql(objectA, objectB) === true,
                        "eql({ foo: 1, bar: -> }, { foo: 1, bar: <- }) === true");
                });

                it("returns false with objects with deeply unequal prototypes", () => {
                    const objectA = Object.create({ foo: { a: 1 } });
                    const objectB = Object.create({ foo: { a: 2 } });
                    assert(eql(objectA, objectB) === false,
                        "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 2 } })) === false");
                });

            });

            describe("functions", () => {

                it("returns true for same functions", () => {
                    function foo() { }
                    assert(eql(foo, foo), "eql(function foo() {}, function foo() {})");
                });

                it("returns false for different functions", () => {
                    assert(eql(function foo() { }, function bar() { }) === false,
                        "eql(function foo() {}, function bar() {}) === false");
                });

            });

            describe("errors", () => {

                it("returns true for same errors", () => {
                    const error = new Error("foo");
                    assert(eql(error, error), "eql(error, error)");
                });

                it("returns false for different errors", () => {
                    assert(eql(new Error("foo"), new Error("foo")) === false,
                        "eql(new Error('foo'), new Error('foo')) === false");
                });

            });

        });

        describe("Node Specific", () => {

            describe("buffers", () => {

                it("returns true for same buffers", () => {
                    assert(eql(new Buffer([1]), new Buffer([1])) === true,
                        "eql(new Buffer([ 1 ]), new Buffer([ 1 ])) === true");
                });

                it("returns false for different buffers", () => {
                    assert(eql(new Buffer([1]), new Buffer([2])) === false,
                        "eql(new Buffer([ 1 ]), new Buffer([ 2 ])) === false");
                });

            });

        });

        describe("Memoize", () => {

            it("returns true if MemoizeMap says so", () => {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = { not: "equal" };
                valueAMap.set(valueB, true);
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === true,
                    "eql({}, {not:'equal'}, <memoizeMap>) === true");
            });

            it("returns false if MemoizeMap says so", () => {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = {};
                valueAMap.set(valueB, false);
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === false,
                    "eql({}, {}, <memoizeMap>) === false");
            });

            it("resorts to default behaviour if MemoizeMap has no answer (same objects)", () => {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = {};
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === true,
                    "eql({}, {}, <memoizeMap>) === true");
            });

            it("resorts to default behaviour if MemoizeMap has no answer (different objects)", () => {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = { not: "equal" };
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === false,
                    "eql({}, {}, <memoizeMap>) === false");
            });

        });

        describe("Comparator", () => {
            function specialComparator(left, right) {
                return left["@@specialValue"] === right["@@specialValue"];
            }
            function Matcher(func) {
                this.func = func;
            }
            function matcherComparator(left, right) {
                if (left instanceof Matcher) {
                    return left.func(right);
                } else if (right instanceof Matcher) {
                    return right.func(left);
                }
                return null;
            }
            function falseComparator() {
                return false;
            }
            function nullComparator() {
                return null;
            }

            it("returns true if Comparator says so", () => {
                const valueA = { "@@specialValue": 1, a: 1 };
                const valueB = { "@@specialValue": 1, a: 2 };
                assert(eql(valueA, valueB, { comparator: specialComparator }) === true,
                    "eql({@@specialValue:1,a:1}, {@@specialValue:1,a:2}, <comparator>) === true");
            });

            it("returns true if Comparator says so even on primitives", () => {
                const valueA = {
                    a: new Matcher((value) => {
                        return typeof value === "number";
                    })
                };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: matcherComparator }) === true,
                    "eql({a:value => typeof value === 'number'}, {a:1}, <comparator>) === true");
            });

            it("returns true if Comparator says so even on primitives (switch arg order)", () => {
                const valueA = { a: 1 };
                const valueB = {
                    a: new Matcher((value) => {
                        return typeof value === "number";
                    })
                };
                assert(eql(valueA, valueB, { comparator: matcherComparator }) === true,
                    "eql({a:1}, {a:value => typeof value === 'number'}, <comparator>) === true");
            });

            it("returns true if Comparator says so (deep-equality)", () => {
                const valueA = { a: { "@@specialValue": 1, a: 1 }, b: 1 };
                const valueB = { a: { "@@specialValue": 1, a: 2 }, b: 1 };
                assert(eql(valueA, valueB, { comparator: specialComparator }) === true,
                    "eql({a:{@@specialValue:1,a:1},b:1}, {a:{@@specialValue:2,a:2},b:1}, <comparator>) === true");
            });

            it("returns false if Comparator returns false (same objects)", () => {
                const valueA = { a: 1 };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: falseComparator }) === false,
                    "eql({}, {}, <falseComparator>) === false");
            });

            it("resorts to deep-eql if Comparator returns null (same objects)", () => {
                const valueA = { a: 1 };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: nullComparator }) === true,
                    "eql({}, {}, <nullComparator>) === true");
            });

            it("resorts to deep-eql behaviour if Comparator returns null (different objects)", () => {
                const valueA = { a: 1 };
                const valueB = { a: 2 };
                assert(eql(valueA, valueB, { comparator: nullComparator }) === false,
                    "eql({}, {}, <nullComparator>) === false");
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
                util.asyncWaterfall(arr, () => { });
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
});
