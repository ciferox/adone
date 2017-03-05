describe("Utils", () => {
    describe("Function", () => {
        describe("identity", function () {
            it("should return the first argument", function () {
                expect(adone.identity(1, 2, 3)).to.be.equal(1);
            });
        });

        describe("noop", function () {
            it("should return nothing", function () {
                expect(adone.noop(1, 2, 3)).to.be.undefined;
            });
        });

        describe("by", function () {
            const getA = function (x) {
                return x.a;
            };
            const wrappedCompare = function (a, b) {
                return Object.compare(a, b);
            };
            const compare = adone.util.by(getA, wrappedCompare);

            it("should compare two values", function () {
                expect(compare({ a: 10 }, { a: 20 })).to.be.equal(-10);
            });

            it("should have a by property", function () {
                expect(compare.by).to.be.equal(getA);
            });

            it("should have a compare property", function () {
                expect(compare.compare).to.be.equal(wrappedCompare);
            });
        });
    });

    describe("keys()", () => {
        const keys = adone.util.keys;

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
            const t = new Test;
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
            const t = new B;
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
            const t = new Test;
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

            const t = new B;
            const props = keys(t, { all: true }).sort();
            expect(props).to.be.deep.equal(["aMethod", "aProp", "bMethod", "bProp"]);
        });
    });

    describe("enumerate()", () => {
        it("should count every item", () => {
            const s = [1, 2, 3, 4, 5];
            let i = 0;
            for (const [idx, t] of adone.util.enumerate(s)) {
                expect(idx).to.be.equal(i++);
                expect(t).to.be.equal(i);
            }
        });

        it("should set the start index", () => {
            const s = "12345";
            let i = 5;
            let j = 1;
            for (const [idx, t] of adone.util.enumerate(s, 5)) {
                expect(idx).to.be.equal(i++);
                expect(t).to.be.equal(`${j++}`);
            }
        });
    });

    describe("toDotNotation()", () => {
        it("should transform an object to the dot-noation", () => {
            expect(adone.util.toDotNotation({
                a: 1,
                b: 2,
                c: { d: 4, e: { f: 5 } }
            })).to.be.deep.equal({
                a: 1,
                b: 2,
                "c.d": 4,
                "c.e.f": 5
            });
            expect(adone.util.toDotNotation({
                a: [1, 2, 3],
                b: {
                    "a b c": {
                        g: 6,
                        y: [4, 5, 6]
                    }
                },
            })).to.be.deep.equal({
                "a[0]": 1,
                "a[1]": 2,
                "a[2]": 3,
                "b[\"a b c\"].g": 6,
                "b[\"a b c\"].y[0]": 4,
                "b[\"a b c\"].y[1]": 5,
                "b[\"a b c\"].y[2]": 6,
            });
        });
    });

    describe("flatten", () => {
        it("should be the same", () => {
            const array = [1, 2, 3, 4, 5];
            expect(adone.util.flatten(array)).to.be.deep.equal(array);
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
                expect(adone.util.flatten(i)).to.be.deep.equal(result);
            }
        });
    });

    describe("match", () => {
        const matchers = [
            "path/to/file.js",
            "path/anyjs/**/*.js",
            /foo.js$/,
            (string) => string.indexOf("/bar") !== -1 && string.length > 10
        ];
        it("should resolve string matchers", function () {
            expect(adone.util.match(matchers, "path/to/file.js")).to.be.true;
            expect(adone.util.match(matchers[0], "path/to/file.js")).to.be.true;
            expect(adone.util.match(matchers[0], "bar.js")).to.be.false;
        });
        it("should resolve glob matchers", function () {
            expect(adone.util.match(matchers, "path/anyjs/baz.js")).to.be.true;
            expect(adone.util.match(matchers[1], "path/anyjs/baz.js")).to.be.true;
            expect(adone.util.match(matchers[1], "bar.js")).to.be.false;
        });
        it("should resolve regexp matchers", function () {
            expect(adone.util.match(matchers, "path/to/foo.js")).to.be.true;
            expect(adone.util.match(matchers[2], "path/to/foo.js")).to.be.true;
            expect(adone.util.match(matchers[2], "bar.js")).to.be.false;
        });
        it("should resolve function matchers", function () {
            expect(adone.util.match(matchers, "path/to/bar.js")).to.be.true;
            expect(adone.util.match(matchers[3], "path/to/bar.js")).to.be.true;
            expect(adone.util.match(matchers, "bar.js")).to.be.false;
        });
        it("should return false for unmatched strings", function () {
            expect(adone.util.match(matchers, "bar.js")).to.be.false;
        });

        describe("with index = true", function () {
            it("should return the array index of first positive matcher", function () {
                expect(adone.util.match(matchers, "foo.js", { index: true })).to.be.equal(2);
            });
            it("should return 0 if provided non-array matcher", function () {
                expect(adone.util.match(matchers[2], "foo.js", { index: true })).to.be.equal(0);
            });
            it("should return -1 if no match", function () {
                expect(adone.util.match(matchers[2], "bar.js", { index: true })).to.be.equal(-1);
            });
        });

        describe("curried matching function", function () {
            const matchFn = adone.util.match(matchers);

            it("should resolve matchers", function () {
                expect(matchFn("path/to/file.js")).to.be.true;
                expect(matchFn("path/anyjs/baz.js")).to.be.true;
                expect(matchFn("path/to/foo.js")).to.be.true;
                expect(matchFn("path/to/bar.js")).to.be.true;
                expect(matchFn("bar.js")).to.be.false;
            });
            it("should be usable as an Array.prototype.filter callback", function () {
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
            it("should bind individual criterion", function () {
                expect(adone.util.match(matchers[0])("path/to/file.js")).to.be.true;
                expect(!adone.util.match(matchers[0])("path/to/other.js")).to.be.true;
                expect(adone.util.match(matchers[1])("path/anyjs/baz.js")).to.be.true;
                expect(!adone.util.match(matchers[1])("path/to/baz.js")).to.be.true;
                expect(adone.util.match(matchers[2])("path/to/foo.js")).to.be.true;
                expect(!adone.util.match(matchers[2])("path/to/foo.js.bak")).to.be.true;
                expect(adone.util.match(matchers[3])("path/to/bar.js")).to.be.true;
                expect(!adone.util.match(matchers[3])("bar.js")).to.be.true;
            });
        });

        describe("using matcher subsets", function () {
            it("should skip matchers before the startIndex", function () {
                expect(adone.util.match(matchers, "path/to/file.js", { index: false })).to.be.true;
                expect(adone.util.match(matchers, "path/to/file.js", { index: false, start: 1 })).to.be.false;
            });
            it("should skip matchers after and including the endIndex", function () {
                expect(adone.util.match(matchers, "path/to/bars.js", { index: false })).to.be.true;
                expect(adone.util.match(matchers, "path/to/bars.js", { index: false, start: 0, end: 3 })).to.be.false;
                expect(adone.util.match(matchers, "foo.js", { index: false, start: 0, end: 1 })).to.be.false;
            });
        });

        describe("extra args", function () {
            it("should allow string to be passed as first member of an array", function () {
                expect(adone.util.match(matchers, ["path/to/bar.js"])).to.be.true;
            });

            it("should pass extra args to function matchers", function () {
                matchers.push((string, arg1, arg2) => arg1 || arg2);
                expect(adone.util.match(matchers, "bar.js")).to.be.false;
                expect(adone.util.match(matchers, ["bar.js", 0])).to.be.false;
                expect(adone.util.match(matchers, ["bar.js", true])).to.be.true;
                expect(adone.util.match(matchers, ["bar.js", 0, true])).to.be.true;
                // with returnIndex
                expect(adone.util.match(matchers, ["bar.js", 1], { index: true })).to.be.equal(4);
                // curried versions
                const [matchFn1, matchFn2] = [adone.util.match(matchers), adone.util.match(matchers[4])];
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

        describe("glob negation", function () {
            after(() => {
                matchers.splice(4, 2);
            });

            it("should respect negated globs included in a matcher array", function () {
                expect(adone.util.match(matchers, "path/anyjs/no/no.js")).to.be.true;
                matchers.push("!path/anyjs/no/*.js");
                expect(adone.util.match(matchers, "path/anyjs/no/no.js")).to.be.false;
                expect(adone.util.match(matchers)("path/anyjs/no/no.js")).to.be.false;
            });
            it("should not break returnIndex option", function () {
                expect(adone.util.match(matchers, "path/anyjs/yes.js", { index: true })).to.be.equal(1);
                expect(adone.util.match(matchers)("path/anyjs/yes.js", { index: true })).to.be.equal(1);
                expect(adone.util.match(matchers, "path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
                expect(adone.util.match(matchers)("path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
            });
            it("should allow negated globs to negate non-glob matchers", function () {
                expect(adone.util.match(matchers, "path/to/bar.js", { index: true })).to.be.equal(3);
                matchers.push("!path/to/bar.*");
                expect(adone.util.match(matchers, "path/to/bar.js")).to.be.false;
            });
        });

        describe("windows paths", function () {
            const origSep = adone.std.path.sep;
            before(function () {
                adone.std.path.sep = "\\";
            });
            after(function () {
                adone.std.path.sep = origSep;
            });

            it("should resolve backslashes against string matchers", function () {
                expect(adone.util.match(matchers, "path\\to\\file.js")).to.be.true;
                expect(adone.util.match(matchers)("path\\to\\file.js")).to.be.true;
            });
            it("should resolve backslashes against glob matchers", function () {
                expect(adone.util.match(matchers, "path\\anyjs\\file.js")).to.be.true;
                expect(adone.util.match(matchers)("path\\anyjs\\file.js")).to.be.true;
            });
            it("should resolve backslashes against regex matchers", function () {
                expect(adone.util.match(/path\/to\/file\.js/, "path\\to\\file.js")).to.be.true;
                expect(adone.util.match(/path\/to\/file\.js/)("path\\to\\file.js")).to.be.true;
            });
            it("should resolve backslashes against function matchers", function () {
                expect(adone.util.match(matchers, "path\\to\\bar.js")).to.be.true;
                expect(adone.util.match(matchers)("path\\to\\bar.js")).to.be.true;
            });
            it("should still correctly handle forward-slash paths", function () {
                expect(adone.util.match(matchers, "path/to/file.js")).to.be.true;
                expect(adone.util.match(matchers)("path/to/file.js")).to.be.true;
                expect(adone.util.match(matchers)("path/no/no.js")).to.be.false;
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

        it("reading root without filter", async function () {
            const result = await adone.util.readdir(root);
            expect(result).to.have.lengthOf(totalFiles);
        });

        it("normal ['*.ext1', '*.ext3']", async function () {
            const result = await adone.util.readdir(root, {
                fileFilter: ["*.ext1", "*.ext3"]
            });
            expect(result).to.have.lengthOf(ext1Files + ext3Files);
        });

        it("files only", async function () {
            const result = await adone.util.readdir(root, {
                entryType: "files"
            });
            expect(result).to.have.lengthOf(totalFiles);
        });

        it("directories only", async function () {
            const result = await adone.util.readdir(root, {
                entryType: "directories"
            });
            expect(result).to.have.lengthOf(totalDirs);
        });

        it("both - directories + files", async function () {
            const result = await adone.util.readdir(root, {
                entryType: "both"
            });
            expect(result).to.have.lengthOf(totalFiles + totalDirs);
        });

        it("directory filter with directories only", async function () {
            const result = await adone.util.readdir(root, {
                entryType: "directories",
                directoryFilter: ["root_dir1", "*dir1_subdir1"]
            });
            expect(result).to.have.lengthOf(2);
        });

        it("directory and file filters with both entries", async function () {
            const result = await adone.util.readdir(root, {
                entryType: "both",
                directoryFilter: ["root_dir1", "*dir1_subdir1"],
                fileFilter: ["!*.ext1"]
            });
            expect(result).to.have.lengthOf(6);
        });

        it("negated: ['!*.ext1', '!*.ext3']", async function () {
            const result = await adone.util.readdir(root, {
                fileFilter: ["!*.ext1", "!*.ext3"]
            });
            expect(result).to.have.lengthOf(totalFiles - ext1Files - ext3Files);
        });

        it("reading root without filter using lstat", async function () {
            const result = await adone.util.readdir(root, {
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
            const result = await adone.util.readdir(root, {
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
        describe("common usage", function () {
            it("works correctly for common operations", function () {
                expect(adone.util.jsesc("\0\x31")).to.be.equal("\\x001", "`\\0` followed by `1`");
                expect(adone.util.jsesc("\0\x38")).to.be.equal("\\x008", "`\\0` followed by `8`");
                expect(adone.util.jsesc("\0\x39")).to.be.equal("\\x009", "`\\0` followed by `9`");
                expect(adone.util.jsesc("\0a")).to.be.equal("\\0a", "`\\0` followed by `a`");
                expect(adone.util.jsesc("foo\"bar'baz", {
                    "quotes": "LOLWAT" // invalid setting
                })).to.be.equal("foo\"bar\\'baz");
                expect(adone.util.jsesc("\\x00")).to.be.equal("\\\\x00", "`\\\\x00` shouldn’t be changed to `\\\\0`");
                expect(adone.util.jsesc("a\\x00")).to.be.equal("a\\\\x00", "`a\\\\x00` shouldn’t be changed to `\\\\0`");
                expect(adone.util.jsesc("\\\x00")).to.be.equal("\\\\\\0", "`\\\\\\x00` should be changed to `\\\\\\0`");
                expect(adone.util.jsesc("\\\\x00")).to.be.equal("\\\\\\\\x00", "`\\\\\\\\x00` shouldn’t be changed to `\\\\\\\\0`");
                expect(adone.util.jsesc("lolwat\"foo'bar", {
                    "escapeEverything": true
                })).to.be.equal("\\x6C\\x6F\\x6C\\x77\\x61\\x74\\\"\\x66\\x6F\\x6F\\'\\x62\\x61\\x72");
                expect(adone.util.jsesc("\0foo\u2029bar\nbaz\xA9qux\uD834\uDF06flops", {
                    "minimal": true
                })).to.be.equal("\\0foo\\u2029bar\\nbaz\xA9qux\uD834\uDF06flops");
                expect(adone.util.jsesc("foo</script>bar</style>baz</script>qux", {
                    "isScriptContext": true
                })).to.be.equal("foo<\\/script>bar<\\/style>baz<\\/script>qux");
                expect(adone.util.jsesc("foo</sCrIpT>bar</STYLE>baz</SCRIPT>qux", {
                    "isScriptContext": true
                })).to.be.equal("foo<\\/sCrIpT>bar<\\/STYLE>baz<\\/SCRIPT>qux");
                expect(adone.util.jsesc("\"<!--<script></script>\";alert(1);", {
                    "isScriptContext": true
                })).to.be.equal("\"\\x3C!--<script><\\/script>\";alert(1);");
                expect(adone.util.jsesc("\"<!--<script></script>\";alert(1);", {
                    "isScriptContext": true,
                    "json": true
                })).to.be.equal("\"\\\"\\u003C!--<script><\\/script>\\\";alert(1);\"");
                expect(adone.util.jsesc([0x42, 0x1337], {
                    "numbers": "decimal"
                })).to.be.equal("[66,4919]");
                expect(adone.util.jsesc([0x42, 0x1337], {
                    "numbers": "binary"
                })).to.be.equal("[0b1000010,0b1001100110111]");
                expect(adone.util.jsesc([0x42, 0x1337, NaN, Infinity], {
                    "numbers": "binary",
                    "json": true
                })).to.be.equal("[66,4919,null,null]");
                expect(adone.util.jsesc([0x42, 0x1337], {
                    "numbers": "octal"
                })).to.be.equal("[0o102,0o11467]");
                expect(adone.util.jsesc([0x42, 0x1337], {
                    "numbers": "hexadecimal"
                })).to.be.equal("[0x42,0x1337]");
                expect(adone.util.jsesc("a\uD834\uDF06b", {
                    "es6": true
                })).to.be.equal("a\\u{1D306}b");
                expect(adone.util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                    "es6": true
                })).to.be.equal("a\\u{1D306}b\\u{1F4A9}c");
                expect(adone.util.jsesc("a\uD834\uDF06b\uD83D\uDCA9c", {
                    "es6": true,
                    "escapeEverything": true
                })).to.be.equal("\\x61\\u{1D306}\\x62\\u{1F4A9}\\x63");
                expect(adone.util.jsesc({}, {
                    "compact": true
                })).to.be.equal("{}");
                expect(adone.util.jsesc({}, {
                    "compact": false
                })).to.be.equal("{}");
                expect(adone.util.jsesc([], {
                    "compact": true
                })).to.be.equal("[]");
                expect(adone.util.jsesc([], {
                    "compact": false
                })).to.be.equal("[]");
                // Stringifying flat objects containing only string values
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" })).to.be.equal("{'foo\\0bar\\uFFFDbaz':'foo\\0bar\\uFFFDbaz'}", "Stringifying a flat object with default settings`");
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    "quotes": "double"
                })).to.be.equal("{\"foo\\0bar\\uFFFDbaz\":\"foo\\0bar\\uFFFDbaz\"}");
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    "compact": false
                })).to.be.equal("{\n\t'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
                expect(adone.util.jsesc(["a", "b", "c"], {
                    "compact": false,
                    "indentLevel": 1
                })).to.be.equal("[\n\t\t'a',\n\t\t'b',\n\t\t'c'\n\t]");
                expect(adone.util.jsesc(["a", "b", "c"], {
                    "compact": false,
                    "indentLevel": 2
                })).to.be.equal("[\n\t\t\t'a',\n\t\t\t'b',\n\t\t\t'c'\n\t\t]");
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    "compact": false,
                    "indent": "  "
                })).to.be.equal("{\n  'foo\\0bar\\uFFFDbaz': 'foo\\0bar\\uFFFDbaz'\n}");
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    "escapeEverything": true
                })).to.be.equal("{'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A':'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A'}");
                // Stringifying flat arrays containing only string values
                expect(adone.util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                    "escapeEverything": true
                })).to.be.equal("['\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A','\\xA9']");
                expect(adone.util.jsesc(["foo\x00bar\uFFFDbaz", "\xA9"], {
                    "compact": false
                })).to.be.equal("[\n\t'foo\\0bar\\uFFFDbaz',\n\t'\\xA9'\n]");
                expect(adone.util.jsesc(new Map([]))).to.be.equal("new Map()");
                expect(adone.util.jsesc(new Map([["a", 1], ["b", 2]]), {
                    "compact": true
                })).to.be.equal("new Map([['a',1],['b',2]])");
                expect(adone.util.jsesc(new Map([["a", 1], ["b", 2]]), {
                    "compact": false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', 2]\n])");
                expect(adone.util.jsesc(new Map([["a", 1], ["b", ["a", "nested", "array"]]]), {
                    "compact": false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', [\n\t\t'a',\n\t\t'nested',\n\t\t'array'\n\t]]\n])");
                expect(adone.util.jsesc(new Map([["a", 1], ["b", new Map([["x", 2], ["y", 3]])]]), {
                    "compact": false
                })).to.be.equal("new Map([\n\t['a', 1],\n\t['b', new Map([\n\t\t['x', 2],\n\t\t['y', 3]\n\t])]\n])");
                expect(adone.util.jsesc(new Set([]))).to.be.equal("new Set()");
                expect(adone.util.jsesc(new Set([["a"], "b", {}]), {
                    "compact": true
                })).to.be.equal("new Set([['a'],'b',{}])");
                expect(adone.util.jsesc(new Set([["a"], "b", {}]), {
                    "compact": false
                })).to.be.equal("new Set([\n\t[\n\t\t'a'\n\t],\n\t'b',\n\t{}\n])");
                // Buffer
                expect(adone.util.jsesc(Buffer.from([0x13, 0x37, 0x42]))).to.be.equal("Buffer.from([19,55,66])");
                expect(adone.util.jsesc(Buffer.from([0x13, 0x37, 0x42]), {
                    "compact": false
                })).to.be.equal("Buffer.from([\n\t19,\n\t55,\n\t66\n])");
                // JSON
                expect(adone.util.jsesc("foo\x00bar\xFF\uFFFDbaz", {
                    "json": true
                })).to.be.equal("\"foo\\u0000bar\\u00FF\\uFFFDbaz\"");
                expect(adone.util.jsesc("foo\x00bar\uFFFDbaz", {
                    "escapeEverything": true,
                    "json": true
                })).to.be.equal("\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"");
                expect(adone.util.jsesc({ "foo\x00bar\uFFFDbaz": "foo\x00bar\uFFFDbaz" }, {
                    "escapeEverything": true,
                    "json": true
                })).to.be.equal("{\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\":\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"}");
                expect(adone.util.jsesc(["foo\x00bar\uFFFDbaz", "foo\x00bar\uFFFDbaz"], {
                    "escapeEverything": true,
                    "json": true
                })).to.be.equal("[\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\",\"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A\"]");
                expect(adone.util.jsesc("foo\x00bar", {
                    "json": true,
                    "wrap": false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo\\u0000bar");
                expect(adone.util.jsesc("foo \"\x00\" bar", {
                    "json": true,
                    "wrap": false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo \\\"\\u0000\\\" bar");
                expect(adone.util.jsesc("foo \"\x00\" bar ' qux", {
                    "json": true,
                    "quotes": "single", // override default `quotes: 'double'` when `json` is enabled
                    "wrap": false // override default `wrap: true` when `json` is enabled
                })).to.be.equal("foo \"\\u0000\" bar \\' qux");
                expect(adone.util.jsesc("foo\uD834\uDF06bar\xA9baz", {
                    "json": true,
                    "es6": true // override default `es6: false` when `json` is enabled
                })).to.be.equal("\"foo\\u{1D306}bar\\u00A9baz\"");
                const tmp = {
                    "shouldn\u2019t be here": 10,
                    "toJSON": function () {
                        return {
                            "hello": "world",
                            "\uD83D\uDCA9": "foo",
                            "pile": "\uD83D\uDCA9"
                        };
                    }
                };
                expect(adone.util.jsesc(tmp, { "json": true })).to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are called when `json: true`");
                expect(adone.util.jsesc(tmp)).not.to.be.equal("{\"hello\":\"world\",\"\\uD83D\\uDCA9\":\"foo\",\"pile\":\"\\uD83D\\uDCA9\"}", "`toJSON` methods are not called when `json: false`");
                expect(adone.util.jsesc(42, {
                    "numbers": "hexadecimal",
                    "lowercaseHex": true
                })).to.be.equal("0x2a");
                expect(adone.util.jsesc("\u2192\xE9", {
                    "lowercaseHex": true
                })).to.be.equal("\\u2192\\xe9");
                expect(adone.util.jsesc("\u2192\xE9", {
                    "lowercaseHex": false
                })).to.be.equal("\\u2192\\xE9");
                expect(adone.util.jsesc("\u2192\xE9", {
                    "lowercaseHex": true,
                    "json": true
                })).to.be.equal("\"\\u2192\\u00e9\"");
                expect(adone.util.jsesc("\u2192\xe9", {
                    "lowercaseHex": false,
                    "json": true
                })).to.be.equal("\"\\u2192\\u00E9\"");
                expect(adone.util.jsesc("\xE7\xE7a\xE7\xE7", {
                    "lowercaseHex": true,
                    "escapeEverything": true
                })).to.be.equal("\\xe7\\xe7\\x61\\xe7\\xe7");
                expect(adone.util.jsesc("\xE7\xE7a\xE7\xE7", {
                    "lowercaseHex": false,
                    "escapeEverything": true
                })).to.be.equal("\\xE7\\xE7\\x61\\xE7\\xE7");
                expect(adone.util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                    "lowercaseHex": true,
                    "es6": true
                })).to.be.equal("\\u2192\\xe9\\u{1f4a9}");
                expect(adone.util.jsesc("\u2192\xE9\uD83D\uDCA9", {
                    "lowercaseHex": false,
                    "es6": true
                })).to.be.equal("\\u2192\\xE9\\u{1F4A9}");
            });
        });

        describe("advanced tests", function () {
            let allSymbols = "";
            // Generate strings based on code points. Trickier than it seems:
            // https://mathiasbynens.be/notes/javascript-encoding
            for (let codePoint = 0x000000; codePoint <= 0x10FFFF; codePoint += 0xF) {
                const symbol = String.fromCodePoint(codePoint);
                // ok(
                // 	eval('\'' + adone.util.jsesc(symbol) + '\'') == symbol,
                // 	'U+' + codePoint.toString(16).toUpperCase()
                // );
                allSymbols += symbol + " ";
            }
            it("works correctly for advanced operations", function () {
                expect(eval("'" + adone.util.jsesc(allSymbols) + "'") == allSymbols).to.be.ok;
                expect(eval("'" + adone.util.jsesc(allSymbols, {
                    "quotes": "single"
                }) + "'") == allSymbols).to.be.ok;
                expect(eval(adone.util.jsesc(allSymbols, {
                    "quotes": "single",
                    "wrap": true
                })) == allSymbols).to.be.ok;
                expect(eval("\"" + adone.util.jsesc(allSymbols, {
                    "quotes": "double"
                }) + "\"") == allSymbols).to.be.ok;
                expect(eval(adone.util.jsesc(allSymbols, {
                    "quotes": "double",
                    "wrap": true
                })) == allSymbols).to.be.ok;

                // Some of these depend on `JSON.parse()`, so only test them in Node
                // Some of these depend on `JSON.parse()`, so only test them in Node
                const testArray = [
                    undefined, Infinity, new Number(Infinity), -Infinity,
                    new Number(-Infinity), 0, new Number(0), -0, new Number(-0), +0,
                    new Number(+0), new Function(), 'str',
                    function zomg() { return 'desu'; }, null, true, new Boolean(true),
                    false, new Boolean(false), {
                        "foo": 42, "hah": [1, 2, 3, { "foo": 42 }]
                    }
                ];
                expect(adone.util.jsesc(testArray, {
                    "json": false
                })).to.be.equal("[undefined,Infinity,Infinity,-Infinity,-Infinity,0,0,0,0,0,0,function anonymous() {\n\n},'str',function zomg() {\n                    return 'desu';\n                },null,true,true,false,false,{'foo':42,'hah':[1,2,3,{'foo':42}]}]");
                expect(adone.util.jsesc(testArray, {
                    "json": true
                })).to.be.equal("[null,null,null,null,null,0,0,0,0,0,0,null,\"str\",null,null,true,true,false,false,{\"foo\":42,\"hah\":[1,2,3,{\"foo\":42}]}]");
                expect(adone.util.jsesc(testArray, {
                    "json": true,
                    "compact": false
                })).to.be.equal("[\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\tnull,\n\t\"str\",\n\tnull,\n\tnull,\n\ttrue,\n\ttrue,\n\tfalse,\n\tfalse,\n\t{\n\t\t\"foo\": 42,\n\t\t\"hah\": [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3,\n\t\t\t{\n\t\t\t\t\"foo\": 42\n\t\t\t}\n\t\t]\n\t}\n]");
            }).timeout(15000);
        });
    });

    describe("Stat", function () {

        it("should return a `adone.util.Mode` instance with `new`", function () {
            const m = new adone.util.Mode({});
            expect(m instanceof adone.util.Mode).to.be.true;
        });

        it("should throw an Error if no `stat` object is passed in", function () {
            try {
                new adone.util.Mode();
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
        }].forEach(function (test) {
            const m = new adone.util.Mode(test);
            const isFn = "is" + test.type[0].toUpperCase() + test.type.substring(1);
            const strMode = m.toString();
            const opposite = test.type == "file" ? "isDirectory" : "isFile";
            const first = test.type == "file" ? "d" : "-";
            describe("input: 0" + test.mode.toString(8), function () {
                describe("#toString()", function () {
                    it("should equal \"" + test.string + "\"", function () {
                        expect(m.toString()).to.be.equal(test.string);
                    });
                });
                describe("#toOctal()", function () {
                    it("should equal \"" + test.octal + "\"", function () {
                        expect(m.toOctal()).to.be.equal(test.octal);
                    });
                });
                describe("#" + isFn + "()", function () {
                    it("should return `true` for #" + isFn + "()", function () {
                        expect(m[isFn]()).to.be.ok;
                    });
                    it("should remain \"" + strMode + "\" after #" + isFn + "(true) (gh-2)", function () {
                        expect(true).to.be.equal(m[isFn](true));
                        expect(strMode).to.be.equal(m.toString());
                    });
                });
                describe("#" + opposite + "(true)", function () {
                    it("should return `false` for `#" + opposite + "(true)`", function () {
                        expect(false).to.be.equal(m[opposite](true));
                    });
                    it("should be \"" + first + m.toString().substring(1) + "\" after #" + opposite + "(true) (gh-2)", function () {
                        expect(first + m.toString().substring(1)).to.be.equal(m.toString());
                    });
                });
            });
        });
    });

    describe("random(min, max)", function () {
        it("should generate number in interval [min, max)", () => {
            for (let i = 0; i < 100; i++) {
                const max = Math.floor(Math.random() * (1000000 - 100) + 100);
                const min = Math.floor(Math.random() * max);

                for (let i = 0; i < 100; i++) {
                    const num = adone.util.random(min, max);
                    expect(num).to.be.least(min);
                    expect(num).to.be.below(max);
                }
            }
        });
    });

    describe(".packObject", function () {
        it("should return correctly", function () {
            expect(adone.util.packObject([1, 2])).to.eql({ 1: 2 });
            expect(adone.util.packObject([1, "2"])).to.eql({ 1: "2" });
            expect(adone.util.packObject([1, "2", "abc", "def"])).to.eql({ 1: "2", abc: "def" });
        });
    });

    describe("typeDetect", function () {

        it("array", function () {
            assert(adone.util.typeDetect([]) === "Array");
            assert(adone.util.typeDetect([]) === "Array");
        });

        it("regexp", function () {
            assert(adone.util.typeDetect(/a-z/gi) === "RegExp");
            assert(adone.util.typeDetect(new RegExp("a-z")) === "RegExp");
        });

        it("function", function () {
            assert(adone.util.typeDetect(function () { }) === "function");
        });

        it("arguments", function () {
            assert(adone.util.typeDetect(arguments) === "Arguments");
        });

        it("date", function () {
            assert(adone.util.typeDetect(new Date()) === "Date");
        });

        it("number", function () {
            assert(adone.util.typeDetect(1) === "number");
            assert(adone.util.typeDetect(1.234) === "number");
            assert(adone.util.typeDetect(-1) === "number");
            assert(adone.util.typeDetect(-1.234) === "number");
            assert(adone.util.typeDetect(Infinity) === "number");
            assert(adone.util.typeDetect(NaN) === "number");
        });

        it("number objects", function () {
            assert(adone.util.typeDetect(new Number(2)) === "Number");
        });

        it("string", function () {
            assert(adone.util.typeDetect("hello world") === "string");
        });

        it("string objects", function () {
            assert(adone.util.typeDetect(new String("hello")) === "String");
        });

        it("null", function () {
            assert(adone.util.typeDetect(null) === "null");
            assert(adone.util.typeDetect(undefined) !== "null");
        });

        it("undefined", function () {
            assert(adone.util.typeDetect(undefined) === "undefined");
            assert(adone.util.typeDetect(null) !== "undefined");
        });

        it("object", function () {
            function Noop() { }
            assert(adone.util.typeDetect({}) === "Object");
            assert(adone.util.typeDetect(Noop) !== "Object");
            assert(adone.util.typeDetect(new Noop()) === "Object");
            assert(adone.util.typeDetect(new Object()) === "Object");
            assert(adone.util.typeDetect(Object.create(null)) === "Object");
            assert(adone.util.typeDetect(Object.create(Object.prototype)) === "Object");
        });

        // See: https://github.com/chaijs/type-detect/pull/25
        it("object with .undefined property getter", function () {
            const foo = {};
            Object.defineProperty(foo, "undefined", {
                get() {
                    throw Error("Should never happen");
                },
            });
            assert(adone.util.typeDetect(foo) === "Object");
        });

        it("boolean", function () {
            assert(adone.util.typeDetect(true) === "boolean");
            assert(adone.util.typeDetect(false) === "boolean");
            assert(adone.util.typeDetect(!0) === "boolean");
        });

        it("boolean object", function () {
            assert(adone.util.typeDetect(new Boolean()) === "Boolean");
        });

        it("error", function () {
            assert(adone.util.typeDetect(new Error()) === "Error");
            assert(adone.util.typeDetect(new EvalError()) === "Error");
            assert(adone.util.typeDetect(new RangeError()) === "Error");
            assert(adone.util.typeDetect(new ReferenceError()) === "Error");
            assert(adone.util.typeDetect(new SyntaxError()) === "Error");
            assert(adone.util.typeDetect(new URIError()) === "Error");
        });

        it("Math", function () {
            assert(adone.util.typeDetect(Math) === "Math");
        });

        it("JSON", function () {
            assert(adone.util.typeDetect(JSON) === "JSON");
        });

        describe("Stubbed ES2015 Types", function () {
            const originalObjectToString = Object.prototype.toString;
            function stubObjectToStringOnce(staticValue) {
                Object.prototype.toString = function () {  // eslint-disable-line no-extend-native
                    Object.prototype.toString = originalObjectToString;  // eslint-disable-line no-extend-native
                    return staticValue;
                };
            }
            function Thing() { }

            it("map", function () {
                stubObjectToStringOnce("[object Map]");
                assert(adone.util.typeDetect(new Thing()) === "Map");
            });

            it("weakmap", function () {
                stubObjectToStringOnce("[object WeakMap]");
                assert(adone.util.typeDetect(new Thing()) === "WeakMap");
            });

            it("set", function () {
                stubObjectToStringOnce("[object Set]");
                assert(adone.util.typeDetect(new Thing()) === "Set");
            });

            it("weakset", function () {
                stubObjectToStringOnce("[object WeakSet]");
                assert(adone.util.typeDetect(new Thing()) === "WeakSet");
            });

            it("symbol", function () {
                stubObjectToStringOnce("[object Symbol]");
                assert(adone.util.typeDetect(new Thing()) === "Symbol");
            });

            it("promise", function () {
                stubObjectToStringOnce("[object Promise]");
                assert(adone.util.typeDetect(new Thing()) === "Promise");
            });

            it("int8array", function () {
                stubObjectToStringOnce("[object Int8Array]");
                assert(adone.util.typeDetect(new Thing()) === "Int8Array");
            });

            it("uint8array", function () {
                stubObjectToStringOnce("[object Uint8Array]");
                assert(adone.util.typeDetect(new Thing()) === "Uint8Array");
            });

            it("uint8clampedarray", function () {
                stubObjectToStringOnce("[object Uint8ClampedArray]");
                assert(adone.util.typeDetect(new Thing()) === "Uint8ClampedArray");
            });

            it("int16array", function () {
                stubObjectToStringOnce("[object Int16Array]");
                assert(adone.util.typeDetect(new Thing()) === "Int16Array");
            });

            it("uint16array", function () {
                stubObjectToStringOnce("[object Uint16Array]");
                assert(adone.util.typeDetect(new Thing()) === "Uint16Array");
            });

            it("int32array", function () {
                stubObjectToStringOnce("[object Int32Array]");
                assert(adone.util.typeDetect(new Thing()) === "Int32Array");
            });

            it("uint32array", function () {
                stubObjectToStringOnce("[object Uint32Array]");
                assert(adone.util.typeDetect(new Thing()) === "Uint32Array");
            });

            it("float32array", function () {
                stubObjectToStringOnce("[object Float32Array]");
                assert(adone.util.typeDetect(new Thing()) === "Float32Array");
            });

            it("float64array", function () {
                stubObjectToStringOnce("[object Float64Array]");
                assert(adone.util.typeDetect(new Thing()) === "Float64Array");
            });

            it("dataview", function () {
                stubObjectToStringOnce("[object DataView]");
                assert(adone.util.typeDetect(new Thing()) === "DataView");
            });

            it("arraybuffer", function () {
                stubObjectToStringOnce("[object ArrayBuffer]");
                assert(adone.util.typeDetect(new Thing()) === "ArrayBuffer");
            });

            it("generatorfunction", function () {
                stubObjectToStringOnce("[object GeneratorFunction]");
                assert(adone.util.typeDetect(new Thing()) === "GeneratorFunction");
            });

            it("generator", function () {
                stubObjectToStringOnce("[object Generator]");
                assert(adone.util.typeDetect(new Thing()) === "Generator");
            });

            it("string iterator", function () {
                stubObjectToStringOnce("[object String Iterator]");
                assert(adone.util.typeDetect(new Thing()) === "String Iterator");
            });

            it("array iterator", function () {
                stubObjectToStringOnce("[object Array Iterator]");
                assert(adone.util.typeDetect(new Thing()) === "Array Iterator");
            });

            it("map iterator", function () {
                stubObjectToStringOnce("[object Map Iterator]");
                assert(adone.util.typeDetect(new Thing()) === "Map Iterator");
            });

            it("set iterator", function () {
                stubObjectToStringOnce("[object Set Iterator]");
                assert(adone.util.typeDetect(new Thing()) === "Set Iterator");
            });

        });

        describe("@@toStringTag Sham", function () {
            const originalObjectToString = Object.prototype.toString;
            before(function () {
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
                            return "[object " + this[Symbol.toStringTag]() + "]";
                        }
                        return originalObjectToString.call(this);
                    };
                }
            });

            after(function () {
                Object.prototype.toString = originalObjectToString; // eslint-disable-line no-extend-native
            });


            it("plain object", function () {
                const obj = {};
                obj[Symbol.toStringTag] = function () {
                    return "Foo";
                };

                assert(adone.util.typeDetect(obj) === "Foo");
            });

        });

        describe("ES2015 Specific", function () {
            it("string iterator", function () {
                assert(adone.util.typeDetect(""[Symbol.iterator]()) === "String Iterator");
            });

            it("array iterator", function () {
                assert(adone.util.typeDetect([][Symbol.iterator]()) === "Array Iterator");
            });

            it("array iterator (entries)", function () {
                assert(adone.util.typeDetect([].entries()) === "Array Iterator");
            });

            it("map", function () {
                assert(adone.util.typeDetect(new Map()) === "Map");
            });

            it("map iterator", function () {
                assert(adone.util.typeDetect(new Map()[Symbol.iterator]()) === "Map Iterator");
            });

            it("map iterator (entries)", function () {
                assert(adone.util.typeDetect(new Map().entries()) === "Map Iterator");
            });

            it("weakmap", function () {
                assert(adone.util.typeDetect(new WeakMap()) === "WeakMap");
            });

            it("set", function () {
                assert(adone.util.typeDetect(new Set()) === "Set");
            });

            it("set iterator", function () {
                assert(adone.util.typeDetect(new Set()[Symbol.iterator]()) === "Set Iterator");
            });

            it("set iterator", function () {
                assert(adone.util.typeDetect(new Set().entries()) === "Set Iterator");
            });

            it("weakset", function () {
                assert(adone.util.typeDetect(new WeakSet()) === "WeakSet");
            });

            it("symbol", function () {
                assert(adone.util.typeDetect(Symbol()) === "symbol");
            });

            it("promise", function () {
                function noop() { }
                assert(adone.util.typeDetect(new Promise(noop)) === "Promise");
            });

            it("int8array", function () {
                assert(adone.util.typeDetect(new Int8Array()) === "Int8Array");
            });

            it("uint8array", function () {
                assert(adone.util.typeDetect(new Uint8Array()) === "Uint8Array");
            });

            it("uint8clampedarray", function () {
                assert(adone.util.typeDetect(new Uint8ClampedArray()) === "Uint8ClampedArray");
            });

            it("int16array", function () {
                assert(adone.util.typeDetect(new Int16Array()) === "Int16Array");
            });

            it("uint16array", function () {
                assert(adone.util.typeDetect(new Uint16Array()) === "Uint16Array");
            });

            it("int32array", function () {
                assert(adone.util.typeDetect(new Int32Array()) === "Int32Array");
            });

            it("uint32array", function () {
                assert(adone.util.typeDetect(new Uint32Array()) === "Uint32Array");
            });

            it("float32array", function () {
                assert(adone.util.typeDetect(new Float32Array()) === "Float32Array");
            });

            it("float64array", function () {
                assert(adone.util.typeDetect(new Float64Array()) === "Float64Array");
            });

            it("dataview", function () {
                const arrayBuffer = new ArrayBuffer(1);
                assert(adone.util.typeDetect(new DataView(arrayBuffer)) === "DataView");
            });

            it("arraybuffer", function () {
                assert(adone.util.typeDetect(new ArrayBuffer(1)) === "ArrayBuffer");
            });

            it("arrow function", function () {
                assert(adone.util.typeDetect(eval("() => {}")) === "function"); // eslint-disable-line no-eval
            });

            it("generator function", function () {
                assert(adone.util.typeDetect(eval("function * foo () {}; foo")) === "function"); // eslint-disable-line no-eval
            });

            it("generator", function () {
                assert(adone.util.typeDetect(eval("(function * foo () {}())")) === "Generator"); // eslint-disable-line no-eval
            });

        });
    });

    describe("deepEqual", function () {
        const eql = adone.util.deepEqual;

        describe("genertic", () => {
            describe("strings", function () {

                it("returns true for same values", function () {
                    assert(eql("x", "x"), "eql('x', 'x')");
                });

                it("returns true for different instances with same values", function () {
                    assert(eql(new String("x"), new String("x")), "eql(new String('x'), new String('x'))");
                });

                it("returns false for literal vs instance with same value", function () {
                    assert(eql("x", new String("x")) === false, "eql('x', new String('x')) === false");
                    assert(eql(new String("x"), "x") === false, "eql(new String('x'), 'x') === false");
                });

                it("returns false for different instances with different values", function () {
                    assert(eql(new String("x"), new String("y")) === false,
                        "eql(new String('x'), new String('y')) === false");
                });

                it("returns false for different values", function () {
                    assert(eql("x", "y") === false, "eql('x', 'y') === false");
                });

            });

            describe("booleans", function () {

                it("returns true for same values", function () {
                    assert(eql(true, true), "eql(true, true)");
                });

                it("returns true for instances with same value", function () {
                    assert(eql(new Boolean(true), new Boolean(true)), "eql(new Boolean(true), new Boolean(true))");
                });

                it("returns false for literal vs instance with same value", function () {
                    assert(eql(true, new Boolean(true)) === false, "eql(true, new Boolean(true)) === false");
                });

                it("returns false for literal vs instance with different values", function () {
                    assert(eql(false, new Boolean(true)) === false, "eql(false, new Boolean(true)) === false");
                    assert(eql(new Boolean(false), true) === false, "eql(new Boolean(false), true) === false");
                });

                it("returns false for instances with different values", function () {
                    assert(eql(new Boolean(false), new Boolean(true)) === false,
                        "eql(new Boolean(false), new Boolean(true)) === false");
                    assert(eql(new Boolean(true), new Boolean(false)) === false,
                        "eql(new Boolean(true), new Boolean(false)) === false");
                });

                it("returns false for different values", function () {
                    assert(eql(true, false) === false, "eql(true, false) === false");
                    assert(eql(true, Boolean(false)) === false, "eql(true, Boolean(false)) === false");
                });

            });

            describe("null", function () {

                it("returns true for two nulls", function () {
                    assert(eql(null, null), "eql(null, null)");
                });

                it("returns false for null, undefined", function () {
                    assert(eql(null, undefined) === false, "eql(null, undefined) === false");
                });

                it("doesn't crash on weakmap key error (#33)", function () {
                    assert(eql({}, null) === false, "eql({}, null) === false");
                });

            });

            describe("undefined", function () {

                it("returns true for two undefineds", function () {
                    assert(eql(undefined, undefined), "eql(undefined, undefined)");
                });

                it("returns false for undefined, null", function () {
                    assert(eql(undefined, null) === false, "eql(undefined, null) === false");
                });

            });

            describe("numbers", function () {

                it("returns true for same values", function () {
                    assert(eql(-0, -0), "eql(-0, -0)");
                    assert(eql(+0, +0), "eql(+0, +0)");
                    assert(eql(0, 0), "eql(0, 0)");
                    assert(eql(1, 1), "eql(1, 1)");
                    assert(eql(Infinity, Infinity), "eql(Infinity, Infinity)");
                    assert(eql(-Infinity, -Infinity), "eql(-Infinity, -Infinity)");
                });

                it("returns false for literal vs instance with same value", function () {
                    assert(eql(1, new Number(1)) === false, "eql(1, new Number(1)) === false");
                });

                it("returns true NaN vs NaN", function () {
                    assert(eql(NaN, NaN), "eql(NaN, NaN)");
                });

                it("returns true for NaN instances", function () {
                    assert(eql(new Number(NaN), new Number(NaN)), "eql(new Number(NaN), new Number(NaN))");
                });

                it("returns false on numbers with different signs", function () {
                    assert(eql(-1, 1) === false, "eql(-1, 1) === false");
                    assert(eql(-0, +0) === false, "eql(-0, +0) === false");
                    assert(eql(-Infinity, Infinity) === false, "eql(-Infinity, +Infinity) === false");
                });

                it("returns false on instances with different signs", function () {
                    assert(eql(new Number(-1), new Number(1)) === false, "eql(new Number(-1), new Number(1)) === false");
                    assert(eql(new Number(-0), new Number(+0)) === false, "eql(new Number(-0), new Number(+0)) === false");
                    assert(eql(new Number(-Infinity), new Number(Infinity)) === false,
                        "eql(new Number(-Infinity), new Number(+Infinity)) === false");
                });

            });

            describe("dates", function () {

                it("returns true given two dates with the same time", function () {
                    const dateA = new Date();
                    assert(eql(dateA, new Date(dateA.getTime())), "eql(dateA, new Date(dateA.getTime()))");
                });

                it("returns true given two invalid dates", function () {
                    assert(eql(new Date(NaN), new Date(NaN)), "eql(new Date(NaN), new Date(NaN))");
                });

                it("returns false given two dates with the different times", function () {
                    const dateA = new Date();
                    assert(eql(dateA, new Date(dateA.getTime() + 1)) === false,
                        "eql(dateA, new Date(dateA.getTime() + 1)) === false");
                });

            });

            describe("regexp", function () {

                it("returns true given two regexes with the same source", function () {
                    assert(eql(/\s/, /\s/), "eql(/\\s/, /\\s/)");
                    assert(eql(/\s/, new RegExp("\\s")), "eql(/\\s/, new RegExp('\\s'))");
                });

                it("returns false given two regexes with different source", function () {
                    assert(eql(/^$/, /^/) === false, "eql(/^$/, /^/) === false");
                    assert(eql(/^$/, new RegExp("^")) === false, "eql(/^$/, new RegExp('^'))");
                });

                it("returns false given two regexes with different flags", function () {
                    assert(eql(/^/m, /^/i) === false, "eql(/^/m, /^/i) === false");
                });

            });

            describe("empty types", function () {

                it("returns true on two empty objects", function () {
                    assert(eql({}, {}), "eql({}, {})");
                });

                it("returns true on two empty arrays", function () {
                    assert(eql([], []), "eql([], [])");
                });

                it("returns false on different types", function () {
                    assert(eql([], {}) === false, "eql([], {}) === false");
                });

            });

            describe("class instances", function () {

                it("returns true given two empty class instances", function () {
                    function BaseA() { }
                    assert(eql(new BaseA(), new BaseA()), "eql(new BaseA(), new BaseA())");
                });

                it("returns true given two class instances with same properties", function () {
                    function BaseA(prop) {
                        this.prop = prop;
                    }
                    assert(eql(new BaseA(1), new BaseA(1)), "eql(new BaseA(1), new BaseA(1))");
                });

                it("returns true given two class instances with deeply equal bases", function () {
                    function BaseA() { }
                    function BaseB() { }
                    BaseA.prototype.foo = { a: 1 };
                    BaseB.prototype.foo = { a: 1 };
                    assert(eql(new BaseA(), new BaseB()) === true,
                        "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 1 }>) === true");
                });

                it("returns false given two class instances with different properties", function () {
                    function BaseA(prop) {
                        this.prop = prop;
                    }
                    assert(eql(new BaseA(1), new BaseA(2)) === false, "eql(new BaseA(1), new BaseA(2)) === false");
                });

                it("returns false given two class instances with deeply unequal bases", function () {
                    function BaseA() { }
                    function BaseB() { }
                    BaseA.prototype.foo = { a: 1 };
                    BaseB.prototype.foo = { a: 2 };
                    assert(eql(new BaseA(), new BaseB()) === false,
                        "eql(new <base with .prototype.foo = { a: 1 }>, new <base with .prototype.foo = { a: 2 }>) === false");
                });

            });

            describe("arguments", function () {
                function getArguments() {
                    return arguments;
                }

                it("returns true given two arguments", function () {
                    const argumentsA = getArguments();
                    const argumentsB = getArguments();
                    assert(eql(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
                });

                it("returns true given two arguments with same properties", function () {
                    const argumentsA = getArguments(1, 2);
                    const argumentsB = getArguments(1, 2);
                    assert(eql(argumentsA, argumentsB), "eql(argumentsA, argumentsB)");
                });

                it("returns false given two arguments with different properties", function () {
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

            describe("arrays", function () {

                it("returns true with arrays containing same literals", function () {
                    assert(eql([1, 2, 3], [1, 2, 3]), "eql([ 1, 2, 3 ], [ 1, 2, 3 ])");
                    assert(eql(["a", "b", "c"], ["a", "b", "c"]), "eql([ 'a', 'b', 'c' ], [ 'a', 'b', 'c' ])");
                });

                it("returns true given literal or constructor", function () {
                    assert(eql([1, 2, 3], new Array(1, 2, 3)), "eql([ 1, 2, 3 ], new Array(1, 2, 3))");
                });

                it("returns false with arrays containing literals in different order", function () {
                    assert(eql([3, 2, 1], [1, 2, 3]) === false, "eql([ 3, 2, 1 ], [ 1, 2, 3 ]) === false");
                });

                it("returns false for arrays of different length", function () {
                    assert(eql(new Array(1), new Array(100)) === false, "eql(new Array(1), new Array(100)) === false");
                });

            });

            describe("objects", function () {

                it("returns true with objects containing same literals", function () {
                    assert(eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }), "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 })");
                    assert(eql({ foo: "baz" }, { foo: "baz" }), "eql({ foo: 'baz' }, { foo: 'baz' })");
                });

                it("returns true for deeply nested objects", function () {
                    assert(eql({ foo: { bar: "foo" } }, { foo: { bar: "foo" } }),
                        "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'foo' }})");
                });

                it("returns true with objects with same circular reference", function () {
                    const objectA = { foo: 1 };
                    const objectB = { foo: 1 };
                    const objectC = { a: objectA, b: objectB };
                    objectA.bar = objectC;
                    objectB.bar = objectC;
                    assert(eql(objectA, objectB) === true,
                        "eql({ foo: 1, bar: objectC }, { foo: 1, bar: objectC }) === true");
                });

                it("returns true with objects with deeply equal prototypes", function () {
                    const objectA = Object.create({ foo: { a: 1 } });
                    const objectB = Object.create({ foo: { a: 1 } });
                    assert(eql(objectA, objectB) === true,
                        "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 1 } })) === true");
                });

                it("returns false with objects containing different literals", function () {
                    assert(eql({ foo: 1, bar: 1 }, { foo: 1, bar: 2 }) === false,
                        "eql({ foo: 1, bar: 2 }, { foo: 1, bar: 2 }) === false");
                    assert(eql({ foo: "bar" }, { foo: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
                    assert(eql({ foo: { bar: "foo" } }, { foo: { bar: "baz" } }) === false,
                        "eql({ foo: { bar: 'foo' }}, { foo: { bar: 'baz' }}) === false");
                });

                it("returns false with objects containing different keys", function () {
                    assert(eql({ foo: 1, bar: 1 }, { foo: 1, baz: 2 }) === false,
                        "eql({ foo: 1, bar: 2 }, { foo: 1, baz: 2 }) === false");
                    assert(eql({ foo: "bar" }, { bar: "baz" }) === false, "eql({ foo: 'bar' }, { foo: 'baz' }) === false");
                });

                it("returns true with circular objects", function () {
                    const objectA = { foo: 1 };
                    const objectB = { foo: 1 };
                    objectA.bar = objectB;
                    objectB.bar = objectA;
                    assert(eql(objectA, objectB) === true,
                        "eql({ foo: 1, bar: -> }, { foo: 1, bar: <- }) === true");
                });

                it("returns false with objects with deeply unequal prototypes", function () {
                    const objectA = Object.create({ foo: { a: 1 } });
                    const objectB = Object.create({ foo: { a: 2 } });
                    assert(eql(objectA, objectB) === false,
                        "eql(Object.create({ foo: { a: 1 } }), Object.create({ foo: { a: 2 } })) === false");
                });

            });

            describe("functions", function () {

                it("returns true for same functions", function () {
                    function foo() { }
                    assert(eql(foo, foo), "eql(function foo() {}, function foo() {})");
                });

                it("returns false for different functions", function () {
                    assert(eql(function foo() { }, function bar() { }) === false,
                        "eql(function foo() {}, function bar() {}) === false");
                });

            });

            describe("errors", function () {

                it("returns true for same errors", function () {
                    const error = new Error("foo");
                    assert(eql(error, error), "eql(error, error)");
                });

                it("returns false for different errors", function () {
                    assert(eql(new Error("foo"), new Error("foo")) === false,
                        "eql(new Error('foo'), new Error('foo')) === false");
                });

            });

        });

        describe("Node Specific", function () {

            describe("buffers", function () {

                it("returns true for same buffers", function () {
                    assert(eql(new Buffer([1]), new Buffer([1])) === true,
                        "eql(new Buffer([ 1 ]), new Buffer([ 1 ])) === true");
                });

                it("returns false for different buffers", function () {
                    assert(eql(new Buffer([1]), new Buffer([2])) === false,
                        "eql(new Buffer([ 1 ]), new Buffer([ 2 ])) === false");
                });

            });

        });

        describe("Memoize", function () {

            it("returns true if MemoizeMap says so", function () {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = { not: "equal" };
                valueAMap.set(valueB, true);
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === true,
                    "eql({}, {not:'equal'}, <memoizeMap>) === true");
            });

            it("returns false if MemoizeMap says so", function () {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = {};
                valueAMap.set(valueB, false);
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === false,
                    "eql({}, {}, <memoizeMap>) === false");
            });

            it("resorts to default behaviour if MemoizeMap has no answer (same objects)", function () {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = {};
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === true,
                    "eql({}, {}, <memoizeMap>) === true");
            });

            it("resorts to default behaviour if MemoizeMap has no answer (different objects)", function () {
                const memoizeMap = new WeakMap();
                const valueAMap = new WeakMap();
                const valueA = {};
                const valueB = { not: "equal" };
                memoizeMap.set(valueA, valueAMap);
                assert(eql(valueA, valueB, { memoize: memoizeMap }) === false,
                    "eql({}, {}, <memoizeMap>) === false");
            });

        });

        describe("Comparator", function () {
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

            it("returns true if Comparator says so", function () {
                const valueA = { "@@specialValue": 1, a: 1 };
                const valueB = { "@@specialValue": 1, a: 2 };
                assert(eql(valueA, valueB, { comparator: specialComparator }) === true,
                    "eql({@@specialValue:1,a:1}, {@@specialValue:1,a:2}, <comparator>) === true");
            });

            it("returns true if Comparator says so even on primitives", function () {
                const valueA = {
                    a: new Matcher(function (value) {
                        return typeof value === "number";
                    }),
                };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: matcherComparator }) === true,
                    "eql({a:value => typeof value === 'number'}, {a:1}, <comparator>) === true");
            });

            it("returns true if Comparator says so even on primitives (switch arg order)", function () {
                const valueA = { a: 1 };
                const valueB = {
                    a: new Matcher(function (value) {
                        return typeof value === "number";
                    }),
                };
                assert(eql(valueA, valueB, { comparator: matcherComparator }) === true,
                    "eql({a:1}, {a:value => typeof value === 'number'}, <comparator>) === true");
            });

            it("returns true if Comparator says so (deep-equality)", function () {
                const valueA = { a: { "@@specialValue": 1, a: 1 }, b: 1 };
                const valueB = { a: { "@@specialValue": 1, a: 2 }, b: 1 };
                assert(eql(valueA, valueB, { comparator: specialComparator }) === true,
                    "eql({a:{@@specialValue:1,a:1},b:1}, {a:{@@specialValue:2,a:2},b:1}, <comparator>) === true");
            });

            it("returns false if Comparator returns false (same objects)", function () {
                const valueA = { a: 1 };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: falseComparator }) === false,
                    "eql({}, {}, <falseComparator>) === false");
            });

            it("resorts to deep-eql if Comparator returns null (same objects)", function () {
                const valueA = { a: 1 };
                const valueB = { a: 1 };
                assert(eql(valueA, valueB, { comparator: nullComparator }) === true,
                    "eql({}, {}, <nullComparator>) === true");
            });

            it("resorts to deep-eql behaviour if Comparator returns null (different objects)", function () {
                const valueA = { a: 1 };
                const valueB = { a: 2 };
                assert(eql(valueA, valueB, { comparator: nullComparator }) === false,
                    "eql({}, {}, <nullComparator>) === false");
            });

        });
    });

});
