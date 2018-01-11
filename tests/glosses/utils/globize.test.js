const { util: { globize } } = adone;

describe("util", "globize", () => {
    it("default globize", () => {
        assert.equal(globize(), "*");
    });

    it("default globize with specified path", () => {
        assert.equal(globize("/src"), "/src/*");
    });

    it("invalid path", () => {
        assert.throws(() => globize({}), adone.x.InvalidArgument);
    });

    it("empty or nil path", () => {
        const variants = [
            ["*", null],
            ["**/*", undefined, { recursive: true }],
            ["*.js", "", { ext: "js" }]
        ];

        for (const v of variants) {
            assert.equal(globize.apply(globize, v.slice(1)), v[0]);
        }
    });

    it("globize with 'ext' option as string", () => {
        const exts = ["js", ".js"];

        for (const ext of exts) {
            assert.equal(globize("/src", { ext }), "/src/*.js");
        }
    });

    it("globize with 'ext' option as array", () => {
        const ext = ["js", ".json", ".node"];
        assert.equal(globize("/src", { ext }), "/src/*.+(js|json|node)");
    });

    it("globize with 'recursive' option", () => {
        assert.equal(globize("/src", {
            recursive: true
        }), "/src/**/*");
    });

    it("globize with 'recursive' and 'ext' options", () => {
        assert.equal(globize("/src", {
            recursive: true,
            ext: ".js"
        }), "/src/**/*.js");
    });

    it("globize already glob string should do nothing", () => {
        const paths = [
            "/src/*",
            "/src/**/*",
            "/src/*.js",
            "/src/**/.+(js,json)"
        ];

        for (const path of paths) {
            assert.equal(globize(path), path);
        }
    });

    it("list of paths", () => {
        assert.sameDeepMembers(globize([
            "",
            "/src",
            null,
            "/**/*.node"
        ], { recursive: true }), [
            "**/*",
            "/src/**/*",
            "**/*",
            "/**/*.node"
        ]);
    });
});
