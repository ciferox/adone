const {
    path,
    rollup: { pluginutils: { createFilter } }
} = adone;

describe("createFilter", () => {
    it("includes by default", () => {
        const filter = createFilter();
        expect(filter(path.resolve("x"))).to.be.true;
    });

    it("excludes IDs that are not included, if include.length > 0", () => {
        const filter = createFilter(["y"]);
        expect(filter(path.resolve("x"))).to.be.false;
        expect(filter(path.resolve("y"))).to.be.true;
    });

    it("excludes IDs explicitly", () => {
        const filter = createFilter(null, ["y"]);
        expect(filter(path.resolve("x"))).to.be.true;
        expect(filter(path.resolve("y"))).to.be.false;
    });

    it("handles non-array arguments", () => {
        const filter = createFilter("foo/*", "foo/baz");
        expect(filter(path.resolve("foo/bar"))).to.be.true;
        expect(filter(path.resolve("foo/baz"))).to.be.false;
    });

    it("negation patterns", () => {
        const filter = createFilter(["a/!(b)/c"]);
        expect(filter(path.resolve("a/d/c"))).to.be.true;
        expect(filter(path.resolve("a/b/c"))).to.be.false;
    });

    it("excludes non-string IDs", () => {
        const filter = createFilter(null, null);
        expect(filter({})).to.be.false;
    });

    it("excludes strings beginning with NUL", () => {
        const filter = createFilter(null, null);
        expect(filter("\0someid")).to.be.false;
    });

    it("includes with regexp", () => {
        const filter = createFilter(["a/!(b)/c", /\.js$/]);
        expect(filter(path.resolve("a/d/c"))).to.be.true;
        expect(filter(path.resolve("a/b/c"))).to.be.false;
        expect(filter(path.resolve("a.js"))).to.be.true;
        expect(filter(path.resolve("a/b.js"))).to.be.true;
        expect(filter(path.resolve("a/b.jsx"))).to.be.false;
    });

    it("excludes with regexp", () => {
        const filter = createFilter(["a/!(b)/c", /\.js$/], /\.js$/);
        expect(filter(path.resolve("a/d/c"))).to.be.true;
        expect(filter(path.resolve("a/b/c"))).to.be.false;
        expect(filter(path.resolve("a.js"))).to.be.false;
        expect(filter(path.resolve("a/b.js"))).to.be.false;
        expect(filter(path.resolve("a/b.jsx"))).to.be.false;
    });

    it("allows setting an absolute base dir", () => {
        const baseDir = path.resolve("C");
        const filter = createFilter(["y*"], ["yx"], { resolve: baseDir });
        expect(filter(`${baseDir }/x`)).to.be.false;
        expect(filter(`${baseDir }/ys`)).to.be.true;
        expect(filter(`${baseDir}/yx`)).to.be.false;
        expect(filter(path.resolve("C/d/ys"))).to.be.false;
        expect(filter(path.resolve("ys"))).to.be.false;
        expect(filter("ys")).to.be.false;
    });

    it("allows setting a relative base dir", () => {
        const filter = createFilter(["y*"], ["yx"], { resolve: "C/d" });
        expect(filter(path.resolve("C/d/x"))).to.be.false;
        expect(filter(path.resolve("C/d/ys"))).to.be.true;
        expect(filter(path.resolve("C/d/yx"))).to.be.false;
        expect(filter(`${path.resolve("C")}/ys`)).to.be.false;
        expect(filter(path.resolve("ys"))).to.be.false;
        expect(filter("ys")).to.be.false;
    });

    it("ignores a falsy resolve value", () => {
        const filter = createFilter(["y*"], ["yx"], { resolve: null });
        expect(filter(path.resolve("x"))).to.be.false;
        expect(filter(path.resolve("ys"))).to.be.true;
        expect(filter(path.resolve("yx"))).to.be.false;
        expect(filter(`${path.resolve("C")}/ys`)).to.be.false;
        expect(filter(path.resolve("C/d/ys"))).to.be.false;
        expect(filter("ys")).to.be.false;
    });

    it("allows preventing resolution against process.cwd()", () => {
        const filter = createFilter(["y*"], ["yx"], { resolve: false });
        expect(filter("x")).to.be.false;
        expect(filter("ys")).to.be.true;
        expect(filter("yx")).to.be.false;
        expect(filter(`${path.resolve("C") }/ys`)).to.be.false;
        expect(filter(path.resolve("C/d/ys"))).to.be.false;
        expect(filter(path.resolve("ys"))).to.be.false;
    });

    it('includes names starting with a "."', () => {
        const filter = createFilter(["**/*a"]);
        expect(filter(path.resolve(".a"))).to.be.true;
        expect(filter(path.resolve(".x/a"))).to.be.true;
    });
});
