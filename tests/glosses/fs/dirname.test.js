const {
    is,
    fs: { dirname }
} = adone;

const path = {
    posix: {
        dirname: dirname.posix
    },
    windows: {
        dirname: dirname.windows
    }
};

const f = __filename;

describe("fs", "dirname", () => {
    it("all", () => {
        // path.dirname tests
        assert.strictEqual(dirname(f).substr(-11), is.windows ? "\\glosses\\fs" : "/glosses/fs");

        assert.strictEqual(path.posix.dirname("/a/b/"), "/a");
        assert.strictEqual(path.posix.dirname("/a/b"), "/a");
        assert.strictEqual(path.posix.dirname("/a"), "/");
        assert.strictEqual(path.posix.dirname(""), ".");
        assert.strictEqual(path.posix.dirname("/"), "/");
        assert.strictEqual(path.posix.dirname("////"), "/");
        assert.strictEqual(path.posix.dirname("foo"), ".");

        assert.strictEqual(path.windows.dirname("c:\\"), "c:\\");
        assert.strictEqual(path.windows.dirname("c:\\foo"), "c:\\");
        assert.strictEqual(path.windows.dirname("c:\\foo\\"), "c:\\");
        assert.strictEqual(path.windows.dirname("c:\\foo\\bar"), "c:\\foo");
        assert.strictEqual(path.windows.dirname("c:\\foo\\bar\\"), "c:\\foo");
        assert.strictEqual(path.windows.dirname("c:\\foo\\bar\\baz"), "c:\\foo\\bar");
        assert.strictEqual(path.windows.dirname("\\"), "\\");
        assert.strictEqual(path.windows.dirname("\\foo"), "\\");
        assert.strictEqual(path.windows.dirname("\\foo\\"), "\\");
        assert.strictEqual(path.windows.dirname("\\foo\\bar"), "\\foo");
        assert.strictEqual(path.windows.dirname("\\foo\\bar\\"), "\\foo");
        assert.strictEqual(path.windows.dirname("\\foo\\bar\\baz"), "\\foo\\bar");
        assert.strictEqual(path.windows.dirname("c:"), "c:");
        assert.strictEqual(path.windows.dirname("c:foo"), "c:");
        assert.strictEqual(path.windows.dirname("c:foo\\"), "c:");
        assert.strictEqual(path.windows.dirname("c:foo\\bar"), "c:foo");
        assert.strictEqual(path.windows.dirname("c:foo\\bar\\"), "c:foo");
        assert.strictEqual(path.windows.dirname("c:foo\\bar\\baz"), "c:foo\\bar");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share"),
            "\\\\unc\\share");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share\\foo"),
            "\\\\unc\\share\\");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share\\foo\\"),
            "\\\\unc\\share\\");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share\\foo\\bar"),
            "\\\\unc\\share\\foo");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share\\foo\\bar\\"),
            "\\\\unc\\share\\foo");
        assert.strictEqual(path.windows.dirname("\\\\unc\\share\\foo\\bar\\baz"),
            "\\\\unc\\share\\foo\\bar");
        assert.strictEqual(path.windows.dirname("/a/b/"), "/a");
        assert.strictEqual(path.windows.dirname("/a/b"), "/a");
        assert.strictEqual(path.windows.dirname("/a"), "/");
        assert.strictEqual(path.windows.dirname(""), ".");
        assert.strictEqual(path.windows.dirname("/"), "/");
        assert.strictEqual(path.windows.dirname("////"), "/");
        assert.strictEqual(path.windows.dirname("foo"), ".");
    });
});

