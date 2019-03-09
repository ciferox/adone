const {
    is,
    util: { globParent }
} = adone;

describe("uitl", "globParent", () => {
    it("should strip glob magic to return parent path", () => {
        assert.equal(globParent("."), ".");
        assert.equal(globParent(".*"), ".");
        assert.equal(globParent("/.*"), "/");
        assert.equal(globParent("/.*/"), "/");
        assert.equal(globParent("a/.*/b"), "a");
        assert.equal(globParent("a*/.*/b"), ".");
        assert.equal(globParent("*/a/b/c"), ".");
        assert.equal(globParent("*"), ".");
        assert.equal(globParent("*/"), ".");
        assert.equal(globParent("*/*"), ".");
        assert.equal(globParent("*/*/"), ".");
        assert.equal(globParent("**"), ".");
        assert.equal(globParent("**/"), ".");
        assert.equal(globParent("**/*"), ".");
        assert.equal(globParent("**/*/"), ".");
        assert.equal(globParent("/*.js"), "/");
        assert.equal(globParent("*.js"), ".");
        assert.equal(globParent("**/*.js"), ".");
        assert.equal(globParent("{a,b}"), ".");
        assert.equal(globParent("/{a,b}"), "/");
        assert.equal(globParent("/{a,b}/"), "/");
        assert.equal(globParent("(a|b)"), ".");
        assert.equal(globParent("/(a|b)"), "/");
        assert.equal(globParent("./(a|b)"), ".");
        assert.equal(globParent("a/(b c)"), "a", "not an extglob");
        assert.equal(globParent("a/(b c)/"), "a/(b c)", "not an extglob");
        assert.equal(globParent("a/(b c)/d"), "a/(b c)", "not an extglob");
        assert.equal(globParent("path/to/*.js"), "path/to");
        assert.equal(globParent("/root/path/to/*.js"), "/root/path/to");
        assert.equal(globParent("chapter/foo [bar]/"), "chapter");
        assert.equal(globParent("path/[a-z]"), "path");
        assert.equal(globParent("[a-z]"), ".");
        assert.equal(globParent("path/{to,from}"), "path");
        assert.equal(globParent("path/(to|from)"), "path");
        assert.equal(globParent("path/(foo bar)/subdir/foo.*"), "path/(foo bar)/subdir");
        assert.equal(globParent("path/!(to|from)"), "path");
        assert.equal(globParent("path/?(to|from)"), "path");
        assert.equal(globParent("path/+(to|from)"), "path");
        assert.equal(globParent("path/*(to|from)"), "path");
        assert.equal(globParent("path/@(to|from)"), "path");
        assert.equal(globParent("path/!/foo"), "path/!");
        // assert.equal(globParent("path/?/foo"), "path", "qmarks must be escaped"); // ??
        assert.equal(globParent("path/+/foo"), "path/+");
        assert.equal(globParent("path/*/foo"), "path");
        assert.equal(globParent("path/@/foo"), "path/@");
        assert.equal(globParent("path/!/foo/"), "path/!/foo");
        // assert.equal(globParent("path/?/foo/"), "path", "qmarks must be escaped"); // ??
        assert.equal(globParent("path/+/foo/"), "path/+/foo");
        assert.equal(globParent("path/*/foo/"), "path");
        assert.equal(globParent("path/@/foo/"), "path/@/foo");
        assert.equal(globParent("path/**/*"), "path");
        assert.equal(globParent("path/**/subdir/foo.*"), "path");
        assert.equal(globParent("path/subdir/**/foo.js"), "path/subdir");
        assert.equal(globParent("path/!subdir/foo.js"), "path/!subdir");
        assert.equal(globParent("path/{foo,bar}/"), "path");
    });

    it("should respect escaped characters", () => {
        assert.equal(globParent("path/\\*\\*/subdir/foo.*"), "path/**/subdir");
        assert.equal(globParent("path/\\[\\*\\]/subdir/foo.*"), "path/[*]/subdir");
        assert.equal(globParent("path/\\*(a|b)/subdir/foo.*"), "path");
        assert.equal(globParent("path/\\*/(a|b)/subdir/foo.*"), "path/*");
        assert.equal(globParent("path/\\*\\(a\\|b\\)/subdir/foo.*"), "path/*(a|b)/subdir");
        assert.equal(globParent("path/\\[foo bar\\]/subdir/foo.*"), "path/[foo bar]/subdir");
        assert.equal(globParent("path/\\[bar]/"), "path/[bar]");
        assert.equal(globParent("path/\\[bar]"), "path/[bar]");
        assert.equal(globParent("[bar]"), ".");
        assert.equal(globParent("[bar]/"), ".");
        assert.equal(globParent("./\\[bar]"), "./[bar]");
        assert.equal(globParent("\\[bar]/"), "[bar]");
        assert.equal(globParent("[bar\\]/"), ".");
        assert.equal(globParent("path/foo \\[bar]/"), "path/foo [bar]");
        assert.equal(globParent("path/\\{foo,bar}/"), "path/{foo,bar}");
        assert.equal(globParent("\\{foo,bar}/"), "{foo,bar}");
        assert.equal(globParent("\\{foo,bar\\}/"), "{foo,bar}");
        assert.equal(globParent("{foo,bar\\}/"), ".");
        if (!is.windows) {
            assert.equal(globParent("\\[bar]"), "[bar]");
            assert.equal(globParent("[bar\\]"), ".");
            assert.equal(globParent("\\{foo,bar\\}"), "{foo,bar}");
            assert.equal(globParent("{foo,bar\\}"), ".");
        }
    });

    it("should respect glob enclosures with embedded separators", () => {
        assert.equal(globParent("path/{,/,bar/baz,qux}/"), "path");
        assert.equal(globParent("path/\\{,/,bar/baz,qux}/"), "path/{,/,bar/baz,qux}");
        assert.equal(globParent("path/\\{,/,bar/baz,qux\\}/"), "path/{,/,bar/baz,qux}");
        assert.equal(globParent("/{,/,bar/baz,qux}/"), "/");
        assert.equal(globParent("/\\{,/,bar/baz,qux}/"), "/{,/,bar/baz,qux}");
        assert.equal(globParent("{,/,bar/baz,qux}"), ".");
        assert.equal(globParent("\\{,/,bar/baz,qux\\}"), "{,/,bar/baz,qux}");
        assert.equal(globParent("\\{,/,bar/baz,qux}/"), "{,/,bar/baz,qux}");
        assert.equal(globParent("path/foo[a\\\/]/"), "path");
        assert.equal(globParent("path/foo\\[a\\\/]/"), "path/foo[a\\\/]");
        assert.equal(globParent("foo[a\\\/]"), ".");
        assert.equal(globParent("foo\\[a\\\/]"), "foo[a\\\/]");
        assert.equal(globParent("path/(foo/bar|baz)"), "path");
        assert.equal(globParent("path/(foo/bar|baz)/"), "path");
        assert.equal(globParent("path/\\(foo/bar|baz)/"), "path/(foo/bar|baz)");
    });

    it("should handle nested braces", () => {
        assert.equal(globParent("path/{../,./,{bar,/baz\\},qux\\}/"), "path");
        assert.equal(globParent("path/{../,./,\\{bar,/baz},qux}/"), "path");
        assert.equal(globParent("path/\\{../,./,\\{bar,/baz\\},qux\\}/"), "path/{../,./,{bar,/baz},qux}");
        assert.equal(globParent("{../,./,{bar,/baz\\},qux\\}/"), ".");
        assert.equal(globParent("{../,./,{bar,/baz\\},qux\\}"), ".");
        assert.equal(globParent("path/{,/,bar/{baz,qux\\}}/"), "path");
        assert.equal(globParent("path/{,/,bar/{baz,qux}\\}/"), "path");
        //assert.equal(gp('path/\\{../,./,{bar,/baz},qux}/'), 'path');
    });

    it("should return parent dirname from non-glob paths", () => {
        assert.equal(globParent("path"), ".");
        assert.equal(globParent("path/foo"), "path");
        assert.equal(globParent("path/foo/"), "path/foo");
        assert.equal(globParent("path/foo/bar.js"), "path/foo");
    });

    describe("glob2base test patterns", () => {
        it("should get a base name", () => {
            assert.equal(globParent("js/*.js"), "js");
        });

        it("should get a base name from a nested glob", () => {
            assert.equal(globParent("js/**/test/*.js"), "js");
        });

        it("should get a base name from a flat file", () => {
            assert.equal(globParent("js/test/wow.js"), "js/test");
            assert.equal(globParent("js/test/wow.js"), "js/test");
        });

        it("should get a base name from character class pattern", () => {
            assert.equal(globParent("js/t[a-z]st}/*.js"), "js");
        });

        it("should get a base name from brace , expansion", () => {
            assert.equal(globParent("js/{src,test}/*.js"), "js");
        });

        it("should get a base name from brace .. expansion", () => {
            assert.equal(globParent("js/test{0..9}/*.js"), "js");
        });

        it("should get a base name from extglob", () => {
            assert.equal(globParent("js/t+(wo|est)/*.js"), "js");
        });

        it("should get a base name from a path with non-exglob parens", () => {
            assert.equal(globParent("js/t(wo|est)/*.js"), "js");
            assert.equal(globParent("js/t/(wo|est)/*.js"), "js/t");
        });

        it("should get a base name from a complex brace glob", () => {
            assert.equal(globParent("lib/{components,pages}/**/{test,another}/*.txt"), "lib");

            assert.equal(globParent("js/test/**/{images,components}/*.js"), "js/test");

            assert.equal(globParent("ooga/{booga,sooga}/**/dooga/{eooga,fooga}"), "ooga");
        });
    });

    if (is.windows) {
        describe("technically invalid windows globs", () => {
            it("should manage simple globs with backslash path separator", () => {
                assert.equal(globParent("C:\\path\\*.js"), "C:/path");
            });
        });
    }
});
