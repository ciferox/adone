const {
    is,
    glob: { parent }
} = adone;

describe("glob", "parent", () => {
    it("should strip glob magic to return parent path", () => {
        assert.equal(parent("."), ".");
        assert.equal(parent(".*"), ".");
        assert.equal(parent("/.*"), "/");
        assert.equal(parent("/.*/"), "/");
        assert.equal(parent("a/.*/b"), "a");
        assert.equal(parent("a*/.*/b"), ".");
        assert.equal(parent("*/a/b/c"), ".");
        assert.equal(parent("*"), ".");
        assert.equal(parent("*/"), ".");
        assert.equal(parent("*/*"), ".");
        assert.equal(parent("*/*/"), ".");
        assert.equal(parent("**"), ".");
        assert.equal(parent("**/"), ".");
        assert.equal(parent("**/*"), ".");
        assert.equal(parent("**/*/"), ".");
        assert.equal(parent("/*.js"), "/");
        assert.equal(parent("*.js"), ".");
        assert.equal(parent("**/*.js"), ".");
        assert.equal(parent("{a,b}"), ".");
        assert.equal(parent("/{a,b}"), "/");
        assert.equal(parent("/{a,b}/"), "/");
        assert.equal(parent("(a|b)"), ".");
        assert.equal(parent("/(a|b)"), "/");
        assert.equal(parent("./(a|b)"), ".");
        assert.equal(parent("a/(b c)"), "a", "not an extglob");
        assert.equal(parent("a/(b c)/"), "a/(b c)", "not an extglob");
        assert.equal(parent("a/(b c)/d"), "a/(b c)", "not an extglob");
        assert.equal(parent("path/to/*.js"), "path/to");
        assert.equal(parent("/root/path/to/*.js"), "/root/path/to");
        assert.equal(parent("chapter/foo [bar]/"), "chapter");
        assert.equal(parent("path/[a-z]"), "path");
        assert.equal(parent("[a-z]"), ".");
        assert.equal(parent("path/{to,from}"), "path");
        assert.equal(parent("path/(to|from)"), "path");
        assert.equal(parent("path/(foo bar)/subdir/foo.*"), "path/(foo bar)/subdir");
        assert.equal(parent("path/!(to|from)"), "path");
        assert.equal(parent("path/?(to|from)"), "path");
        assert.equal(parent("path/+(to|from)"), "path");
        assert.equal(parent("path/*(to|from)"), "path");
        assert.equal(parent("path/@(to|from)"), "path");
        assert.equal(parent("path/!/foo"), "path/!");
        // assert.equal(globParent("path/?/foo"), "path", "qmarks must be escaped"); // ??
        assert.equal(parent("path/+/foo"), "path/+");
        assert.equal(parent("path/*/foo"), "path");
        assert.equal(parent("path/@/foo"), "path/@");
        assert.equal(parent("path/!/foo/"), "path/!/foo");
        // assert.equal(globParent("path/?/foo/"), "path", "qmarks must be escaped"); // ??
        assert.equal(parent("path/+/foo/"), "path/+/foo");
        assert.equal(parent("path/*/foo/"), "path");
        assert.equal(parent("path/@/foo/"), "path/@/foo");
        assert.equal(parent("path/**/*"), "path");
        assert.equal(parent("path/**/subdir/foo.*"), "path");
        assert.equal(parent("path/subdir/**/foo.js"), "path/subdir");
        assert.equal(parent("path/!subdir/foo.js"), "path/!subdir");
        assert.equal(parent("path/{foo,bar}/"), "path");
    });

    it("should respect escaped characters", () => {
        assert.equal(parent("path/\\*\\*/subdir/foo.*"), "path/**/subdir");
        assert.equal(parent("path/\\[\\*\\]/subdir/foo.*"), "path/[*]/subdir");
        assert.equal(parent("path/\\*(a|b)/subdir/foo.*"), "path");
        assert.equal(parent("path/\\*/(a|b)/subdir/foo.*"), "path/*");
        assert.equal(parent("path/\\*\\(a\\|b\\)/subdir/foo.*"), "path/*(a|b)/subdir");
        assert.equal(parent("path/\\[foo bar\\]/subdir/foo.*"), "path/[foo bar]/subdir");
        assert.equal(parent("path/\\[bar]/"), "path/[bar]");
        assert.equal(parent("path/\\[bar]"), "path/[bar]");
        assert.equal(parent("[bar]"), ".");
        assert.equal(parent("[bar]/"), ".");
        assert.equal(parent("./\\[bar]"), "./[bar]");
        assert.equal(parent("\\[bar]/"), "[bar]");
        assert.equal(parent("[bar\\]/"), ".");
        assert.equal(parent("path/foo \\[bar]/"), "path/foo [bar]");
        assert.equal(parent("path/\\{foo,bar}/"), "path/{foo,bar}");
        assert.equal(parent("\\{foo,bar}/"), "{foo,bar}");
        assert.equal(parent("\\{foo,bar\\}/"), "{foo,bar}");
        assert.equal(parent("{foo,bar\\}/"), ".");
        if (!is.windows) {
            assert.equal(parent("\\[bar]"), "[bar]");
            assert.equal(parent("[bar\\]"), ".");
            assert.equal(parent("\\{foo,bar\\}"), "{foo,bar}");
            assert.equal(parent("{foo,bar\\}"), ".");
        }
    });

    it("should respect glob enclosures with embedded separators", () => {
        assert.equal(parent("path/{,/,bar/baz,qux}/"), "path");
        assert.equal(parent("path/\\{,/,bar/baz,qux}/"), "path/{,/,bar/baz,qux}");
        assert.equal(parent("path/\\{,/,bar/baz,qux\\}/"), "path/{,/,bar/baz,qux}");
        assert.equal(parent("/{,/,bar/baz,qux}/"), "/");
        assert.equal(parent("/\\{,/,bar/baz,qux}/"), "/{,/,bar/baz,qux}");
        assert.equal(parent("{,/,bar/baz,qux}"), ".");
        assert.equal(parent("\\{,/,bar/baz,qux\\}"), "{,/,bar/baz,qux}");
        assert.equal(parent("\\{,/,bar/baz,qux}/"), "{,/,bar/baz,qux}");
        assert.equal(parent("path/foo[a\\\/]/"), "path");
        assert.equal(parent("path/foo\\[a\\\/]/"), "path/foo[a\\\/]");
        assert.equal(parent("foo[a\\\/]"), ".");
        assert.equal(parent("foo\\[a\\\/]"), "foo[a\\\/]");
        assert.equal(parent("path/(foo/bar|baz)"), "path");
        assert.equal(parent("path/(foo/bar|baz)/"), "path");
        assert.equal(parent("path/\\(foo/bar|baz)/"), "path/(foo/bar|baz)");
    });

    it("should handle nested braces", () => {
        assert.equal(parent("path/{../,./,{bar,/baz\\},qux\\}/"), "path");
        assert.equal(parent("path/{../,./,\\{bar,/baz},qux}/"), "path");
        assert.equal(parent("path/\\{../,./,\\{bar,/baz\\},qux\\}/"), "path/{../,./,{bar,/baz},qux}");
        assert.equal(parent("{../,./,{bar,/baz\\},qux\\}/"), ".");
        assert.equal(parent("{../,./,{bar,/baz\\},qux\\}"), ".");
        assert.equal(parent("path/{,/,bar/{baz,qux\\}}/"), "path");
        assert.equal(parent("path/{,/,bar/{baz,qux}\\}/"), "path");
        //assert.equal(gp('path/\\{../,./,{bar,/baz},qux}/'), 'path');
    });

    it("should return parent dirname from non-glob paths", () => {
        assert.equal(parent("path"), ".");
        assert.equal(parent("path/foo"), "path");
        assert.equal(parent("path/foo/"), "path/foo");
        assert.equal(parent("path/foo/bar.js"), "path/foo");
    });

    describe("glob2base test patterns", () => {
        it("should get a base name", () => {
            assert.equal(parent("js/*.js"), "js");
        });

        it("should get a base name from a nested glob", () => {
            assert.equal(parent("js/**/test/*.js"), "js");
        });

        it("should get a base name from a flat file", () => {
            assert.equal(parent("js/test/wow.js"), "js/test");
            assert.equal(parent("js/test/wow.js"), "js/test");
        });

        it("should get a base name from character class pattern", () => {
            assert.equal(parent("js/t[a-z]st}/*.js"), "js");
        });

        it("should get a base name from brace , expansion", () => {
            assert.equal(parent("js/{src,test}/*.js"), "js");
        });

        it("should get a base name from brace .. expansion", () => {
            assert.equal(parent("js/test{0..9}/*.js"), "js");
        });

        it("should get a base name from extglob", () => {
            assert.equal(parent("js/t+(wo|est)/*.js"), "js");
        });

        it("should get a base name from a path with non-exglob parens", () => {
            assert.equal(parent("js/t(wo|est)/*.js"), "js");
            assert.equal(parent("js/t/(wo|est)/*.js"), "js/t");
        });

        it("should get a base name from a complex brace glob", () => {
            assert.equal(parent("lib/{components,pages}/**/{test,another}/*.txt"), "lib");

            assert.equal(parent("js/test/**/{images,components}/*.js"), "js/test");

            assert.equal(parent("ooga/{booga,sooga}/**/dooga/{eooga,fooga}"), "ooga");
        });
    });

    if (is.windows) {
        describe("technically invalid windows globs", () => {
            it("should manage simple globs with backslash path separator", () => {
                assert.equal(parent("C:\\path\\*.js"), "C:/path");
            });
        });
    }
});
