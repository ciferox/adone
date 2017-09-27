describe("util", "matchPath", () => {
    const { util } = adone;

    const matchers = [
        "path/to/file.js",
        "path/anyjs/**/*.js",
        /foo.js$/,
        (string) => string.includes("/bar") && string.length > 10
    ];
    it("should resolve string matchers", () => {
        expect(util.matchPath(matchers, "path/to/file.js")).to.be.true;
        expect(util.matchPath(matchers[0], "path/to/file.js")).to.be.true;
        expect(util.matchPath(matchers[0], "bar.js")).to.be.false;
    });
    it("should resolve glob matchers", () => {
        expect(util.matchPath(matchers, "path/anyjs/baz.js")).to.be.true;
        expect(util.matchPath(matchers[1], "path/anyjs/baz.js")).to.be.true;
        expect(util.matchPath(matchers[1], "bar.js")).to.be.false;
    });
    it("should resolve regexp matchers", () => {
        expect(util.matchPath(matchers, "path/to/foo.js")).to.be.true;
        expect(util.matchPath(matchers[2], "path/to/foo.js")).to.be.true;
        expect(util.matchPath(matchers[2], "bar.js")).to.be.false;
    });
    it("should resolve function matchers", () => {
        expect(util.matchPath(matchers, "path/to/bar.js")).to.be.true;
        expect(util.matchPath(matchers[3], "path/to/bar.js")).to.be.true;
        expect(util.matchPath(matchers, "bar.js")).to.be.false;
    });
    it("should return false for unmatched strings", () => {
        expect(util.matchPath(matchers, "bar.js")).to.be.false;
    });

    describe("with index = true", () => {
        it("should return the array index of first positive matcher", () => {
            expect(util.matchPath(matchers, "foo.js", { index: true })).to.be.equal(2);
        });
        it("should return 0 if provided non-array matcher", () => {
            expect(util.matchPath(matchers[2], "foo.js", { index: true })).to.be.equal(0);
        });
        it("should return -1 if no match", () => {
            expect(util.matchPath(matchers[2], "bar.js", { index: true })).to.be.equal(-1);
        });
    });

    describe("curried matching function", () => {
        const matchFn = util.matchPath(matchers);

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
            expect(util.matchPath(matchers[0])("path/to/file.js")).to.be.true;
            expect(!util.matchPath(matchers[0])("path/to/other.js")).to.be.true;
            expect(util.matchPath(matchers[1])("path/anyjs/baz.js")).to.be.true;
            expect(!util.matchPath(matchers[1])("path/to/baz.js")).to.be.true;
            expect(util.matchPath(matchers[2])("path/to/foo.js")).to.be.true;
            expect(!util.matchPath(matchers[2])("path/to/foo.js.bak")).to.be.true;
            expect(util.matchPath(matchers[3])("path/to/bar.js")).to.be.true;
            expect(!util.matchPath(matchers[3])("bar.js")).to.be.true;
        });
    });

    describe("using matcher subsets", () => {
        it("should skip matchers before the startIndex", () => {
            expect(util.matchPath(matchers, "path/to/file.js", { index: false })).to.be.true;
            expect(util.matchPath(matchers, "path/to/file.js", { index: false, start: 1 })).to.be.false;
        });
        it("should skip matchers after and including the endIndex", () => {
            expect(util.matchPath(matchers, "path/to/bars.js", { index: false })).to.be.true;
            expect(util.matchPath(matchers, "path/to/bars.js", { index: false, start: 0, end: 3 })).to.be.false;
            expect(util.matchPath(matchers, "foo.js", { index: false, start: 0, end: 1 })).to.be.false;
        });
    });

    describe("extra args", () => {
        it("should allow string to be passed as first member of an array", () => {
            expect(util.matchPath(matchers, ["path/to/bar.js"])).to.be.true;
        });

        it("should pass extra args to function matchers", () => {
            matchers.push((string, arg1, arg2) => arg1 || arg2);
            expect(util.matchPath(matchers, "bar.js")).to.be.false;
            expect(util.matchPath(matchers, ["bar.js", 0])).to.be.false;
            expect(util.matchPath(matchers, ["bar.js", true])).to.be.true;
            expect(util.matchPath(matchers, ["bar.js", 0, true])).to.be.true;
            // with returnIndex
            expect(util.matchPath(matchers, ["bar.js", 1], { index: true })).to.be.equal(4);
            // curried versions
            const [matchFn1, matchFn2] = [util.matchPath(matchers), util.matchPath(matchers[4])];
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
            expect(util.matchPath(matchers, "path/anyjs/no/no.js")).to.be.true;
            matchers.push("!path/anyjs/no/*.js");
            expect(util.matchPath(matchers, "path/anyjs/no/no.js")).to.be.false;
            expect(util.matchPath(matchers)("path/anyjs/no/no.js")).to.be.false;
        });
        it("should not break returnIndex option", () => {
            expect(util.matchPath(matchers, "path/anyjs/yes.js", { index: true })).to.be.equal(1);
            expect(util.matchPath(matchers)("path/anyjs/yes.js", { index: true })).to.be.equal(1);
            expect(util.matchPath(matchers, "path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
            expect(util.matchPath(matchers)("path/anyjs/no/no.js", { index: true })).to.be.equal(-1);
        });
        it("should allow negated globs to negate non-glob matchers", () => {
            expect(util.matchPath(matchers, "path/to/bar.js", { index: true })).to.be.equal(3);
            matchers.push("!path/to/bar.*");
            expect(util.matchPath(matchers, "path/to/bar.js")).to.be.false;
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
            expect(util.matchPath(matchers, "path\\to\\file.js")).to.be.true;
            expect(util.matchPath(matchers)("path\\to\\file.js")).to.be.true;
        });
        it("should resolve backslashes against glob matchers", () => {
            expect(util.matchPath(matchers, "path\\anyjs\\file.js")).to.be.true;
            expect(util.matchPath(matchers)("path\\anyjs\\file.js")).to.be.true;
        });
        it("should resolve backslashes against regex matchers", () => {
            expect(util.matchPath(/path\/to\/file\.js/, "path\\to\\file.js")).to.be.true;
            expect(util.matchPath(/path\/to\/file\.js/)("path\\to\\file.js")).to.be.true;
        });
        it("should resolve backslashes against function matchers", () => {
            expect(util.matchPath(matchers, "path\\to\\bar.js")).to.be.true;
            expect(util.matchPath(matchers)("path\\to\\bar.js")).to.be.true;
        });
        it("should still correctly handle forward-slash paths", () => {
            expect(util.matchPath(matchers, "path/to/file.js")).to.be.true;
            expect(util.matchPath(matchers)("path/to/file.js")).to.be.true;
            expect(util.matchPath(matchers)("path/no/no.js")).to.be.false;
        });
    });
});