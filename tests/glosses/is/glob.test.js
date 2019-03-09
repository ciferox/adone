const {
    is
} = adone;

describe("is", "glob", () => {
    describe("glob patterns", () => {
        it("should be true if it is a glob pattern:", () => {
            assert.isTrue(!is.glob("@.(?abc)"), "invalid pattern");
            assert.isTrue(is.glob("*.js"));
            assert.isTrue(is.glob("!*.js"));
            assert.isTrue(is.glob("!foo"));
            assert.isTrue(is.glob("!foo.js"));
            assert.isTrue(is.glob("**/abc.js"));
            assert.isTrue(is.glob("abc/*.js"));
            assert.isTrue(is.glob("@.(?:abc)"));
            assert.isTrue(is.glob("@.(?!abc)"));
        });

        it("should not match escaped globs", () => {
            assert.isTrue(!is.glob("\\!\\*.js"));
            assert.isTrue(!is.glob("\\!foo"));
            assert.isTrue(!is.glob("\\!foo.js"));
            assert.isTrue(!is.glob("\\*(foo).js"));
            assert.isTrue(!is.glob("\\*.js"));
            assert.isTrue(!is.glob("\\*\\*/abc.js"));
            assert.isTrue(!is.glob("abc/\\*.js"));
        });

        it("should be false if the value is not a string:", () => {
            assert.isTrue(!is.glob());
            assert.isTrue(!is.glob(null));
            assert.isTrue(!is.glob(["**/*.js"]));
            assert.isTrue(!is.glob(["foo.js"]));
        });

        it("should be false if it is not a glob pattern:", () => {
            assert.isTrue(!is.glob(""));
            assert.isTrue(!is.glob("~/abc"));
            assert.isTrue(!is.glob("~/abc"));
            assert.isTrue(!is.glob("~/(abc)"));
            assert.isTrue(!is.glob("+~(abc)"));
            assert.isTrue(!is.glob("."));
            assert.isTrue(!is.glob("@.(abc)"));
            assert.isTrue(!is.glob("aa"));
            assert.isTrue(!is.glob("who?"));
            assert.isTrue(!is.glob("why!?"));
            assert.isTrue(!is.glob("where???"));
            assert.isTrue(!is.glob("abc!/def/!ghi.js"));
            assert.isTrue(!is.glob("abc.js"));
            assert.isTrue(!is.glob("abc/def/!ghi.js"));
            assert.isTrue(!is.glob("abc/def/ghi.js"));
        });
    });

    describe("regex capture groups", () => {
        it("should be true if the path has a regex capture group:", () => {
            assert.isTrue(is.glob("abc/(?!foo).js"));
            assert.isTrue(is.glob("abc/(?:foo).js"));
            assert.isTrue(is.glob("abc/(?=foo).js"));
            assert.isTrue(is.glob("abc/(a|b).js"));
            assert.isTrue(is.glob("abc/(a|b|c).js"));
            assert.isTrue(is.glob("abc/(foo bar)/*.js"), "not a capture group but has a glob");
        });

        it("should be true if the path has parens but is not a valid capture group", () => {
            assert.isTrue(!is.glob("abc/(?foo).js"), "invalid capture group");
            assert.isTrue(!is.glob("abc/(a b c).js"), "unlikely to be a capture group");
            assert.isTrue(!is.glob("abc/(ab).js"), "unlikely to be a capture group");
            assert.isTrue(!is.glob("abc/(abc).js"), "unlikely to be a capture group");
            assert.isTrue(!is.glob("abc/(foo bar).js"), "unlikely to be a capture group");
        });

        it("should be false if the capture group is imbalanced:", () => {
            assert.isTrue(!is.glob("abc/(?ab.js"));
            assert.isTrue(!is.glob("abc/(ab.js"));
            assert.isTrue(!is.glob("abc/(a|b.js"));
            assert.isTrue(!is.glob("abc/(a|b|c.js"));
        });

        it("should be false if the group is escaped:", () => {
            assert.isTrue(!is.glob("abc/\\(a|b).js"));
            assert.isTrue(!is.glob("abc/\\(a|b|c).js"));
        });

        it("should be true if glob chars exist and strict is false", () => {
            assert.isTrue(is.glob("$(abc)", false));
            assert.isTrue(is.glob("&(abc)", false));
            assert.isTrue(is.glob("? (abc)", false));
            assert.isTrue(is.glob("?.js", false));
            assert.isTrue(is.glob("abc/(?ab.js", false));
            assert.isTrue(is.glob("abc/(ab.js", false));
            assert.isTrue(is.glob("abc/(a|b.js", false));
            assert.isTrue(is.glob("abc/(a|b|c.js", false));
            assert.isTrue(is.glob("abc/(foo).js", false));
            assert.isTrue(is.glob("abc/?.js", false));
            assert.isTrue(is.glob("abc/[1-3.js", false));
            assert.isTrue(is.glob("abc/[^abc.js", false));
            assert.isTrue(is.glob("abc/[abc.js", false));
            assert.isTrue(is.glob("abc/foo?.js", false));
            assert.isTrue(is.glob("abc/{abc.js", false));
            assert.isTrue(is.glob("Who?.js", false));
        });

        it("should be false if the first delim is escaped and options.strict is false:", () => {
            assert.isTrue(!is.glob("abc/\\(a|b).js", false));
            assert.isTrue(!is.glob("abc/(a|b\\).js"));
            assert.isTrue(!is.glob("abc/\\(a|b|c).js", false));
            assert.isTrue(!is.glob("abc/\\(a|b|c.js", false));
            assert.isTrue(!is.glob("abc/\\[abc].js", false));
            assert.isTrue(!is.glob("abc/\\[abc.js", false));

            assert.isTrue(is.glob("abc/(a|b\\).js", false));
        });
    });

    describe("regex character classes", () => {
        it("should be true if the path has a regex character class:", () => {
            assert.isTrue(is.glob("abc/[abc].js"));
            assert.isTrue(is.glob("abc/[^abc].js"));
            assert.isTrue(is.glob("abc/[1-3].js"));
        });

        it("should be false if the character class is not balanced:", () => {
            assert.isTrue(!is.glob("abc/[abc.js"));
            assert.isTrue(!is.glob("abc/[^abc.js"));
            assert.isTrue(!is.glob("abc/[1-3.js"));
        });

        it("should be false if the character class is escaped:", () => {
            assert.isTrue(!is.glob("abc/\\[abc].js"));
            assert.isTrue(!is.glob("abc/\\[^abc].js"));
            assert.isTrue(!is.glob("abc/\\[1-3].js"));
        });
    });

    describe("brace patterns", () => {
        it("should be true if the path has brace characters:", () => {
            assert.isTrue(is.glob("abc/{a,b}.js"));
            assert.isTrue(is.glob("abc/{a..z}.js"));
            assert.isTrue(is.glob("abc/{a..z..2}.js"));
        });

        it("should be false if (basic) braces are not balanced:", () => {
            assert.isTrue(!is.glob("abc/\\{a,b}.js"));
            assert.isTrue(!is.glob("abc/\\{a..z}.js"));
            assert.isTrue(!is.glob("abc/\\{a..z..2}.js"));
        });
    });

    describe("regex patterns", () => {
        it("should be true if the path has regex characters:", () => {
            assert.isTrue(!is.glob("$(abc)"));
            assert.isTrue(!is.glob("&(abc)"));
            assert.isTrue(!is.glob("Who?.js"));
            assert.isTrue(!is.glob("? (abc)"));
            assert.isTrue(!is.glob("?.js"));
            assert.isTrue(!is.glob("abc/?.js"));

            assert.isTrue(is.glob("!&(abc)"));
            assert.isTrue(is.glob("!*.js"));
            assert.isTrue(is.glob("!foo"));
            assert.isTrue(is.glob("!foo.js"));
            assert.isTrue(is.glob("**/abc.js"));
            assert.isTrue(is.glob("*.js"));
            assert.isTrue(is.glob("*z(abc)"));
            assert.isTrue(is.glob("[1-10].js"));
            assert.isTrue(is.glob("[^abc].js"));
            assert.isTrue(is.glob("[a-j]*[^c]b/c"));
            assert.isTrue(is.glob("[abc].js"));
            assert.isTrue(is.glob("a/b/c/[a-z].js"));
            assert.isTrue(is.glob("abc/(aaa|bbb).js"));
            assert.isTrue(is.glob("abc/*.js"));
            assert.isTrue(is.glob("abc/{a,b}.js"));
            assert.isTrue(is.glob("abc/{a..z..2}.js"));
            assert.isTrue(is.glob("abc/{a..z}.js"));
        });

        it("should be false if regex characters are escaped", () => {
            assert.isTrue(!is.glob("\\?.js"));
            assert.isTrue(!is.glob("\\[1-10\\].js"));
            assert.isTrue(!is.glob("\\[^abc\\].js"));
            assert.isTrue(!is.glob("\\[a-j\\]\\*\\[^c\\]b/c"));
            assert.isTrue(!is.glob("\\[abc\\].js"));
            assert.isTrue(!is.glob("\\a/b/c/\\[a-z\\].js"));
            assert.isTrue(!is.glob("abc/\\(aaa|bbb).js"));
            assert.isTrue(!is.glob("abc/\\?.js"));
        });
    });

    describe("extglob patterns", () => {
        it("should be true if it has an extglob:", () => {
            assert.isTrue(is.glob("abc/!(a).js"));
            assert.isTrue(is.glob("abc/!(a|b).js"));
            assert.isTrue(is.glob("abc/(ab)*.js"));
            assert.isTrue(is.glob("abc/(a|b).js"));
            assert.isTrue(is.glob("abc/*(a).js"));
            assert.isTrue(is.glob("abc/*(a|b).js"));
            assert.isTrue(is.glob("abc/+(a).js"));
            assert.isTrue(is.glob("abc/+(a|b).js"));
            assert.isTrue(is.glob("abc/?(a).js"));
            assert.isTrue(is.glob("abc/?(a|b).js"));
            assert.isTrue(is.glob("abc/@(a).js"));
            assert.isTrue(is.glob("abc/@(a|b).js"));
        });

        it("should be false if extglob characters are escaped:", () => {
            assert.isTrue(!is.glob("abc/\\*.js"));
            assert.isTrue(!is.glob("abc/\\*\\*.js"));
            assert.isTrue(!is.glob("abc/\\@(a).js"));
            assert.isTrue(!is.glob("abc/\\!(a).js"));
            assert.isTrue(!is.glob("abc/\\+(a).js"));
            assert.isTrue(!is.glob("abc/\\*(a).js"));
            assert.isTrue(!is.glob("abc/\\?(a).js"));
            assert.isTrue(is.glob("abc/\\@(a|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\!(a|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\+(a|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\*(a|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\?(a|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\@(a\\|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\!(a\\|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\+(a\\|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\*(a\\|b).js"), "matches since extglob is not escaped");
            assert.isTrue(is.glob("abc/\\?(a\\|b).js"), "matches since extglob is not escaped");
        });

        it("should not return true for non-extglob parens", () => {
            assert.isTrue(!is.glob("C:/Program Files (x86)/"));
        });

        it("should be true if it has glob characters and is not a valid path:", () => {
            assert.isTrue(is.glob("abc/[*].js"));
            assert.isTrue(is.glob("abc/*.js"));
        });

        it("should be false if it is a valid non-glob path:", () => {
            assert.isTrue(!is.glob("abc/?.js"));
            assert.isTrue(!is.glob("abc/!.js"));
            assert.isTrue(!is.glob("abc/@.js"));
            assert.isTrue(!is.glob("abc/+.js"));
        });
    });

    describe("isGlob", () => {
        it("should return true when the string has an extglob:", () => {
            assert.isTrue(is.glob("?(abc)"));
            assert.isTrue(is.glob("@(abc)"));
            assert.isTrue(is.glob("!(abc)"));
            assert.isTrue(is.glob("*(abc)"));
            assert.isTrue(is.glob("+(abc)"));
            assert.isTrue(is.glob("xyz/?(abc)/xyz"));
            assert.isTrue(is.glob("xyz/@(abc)/xyz"));
            assert.isTrue(is.glob("xyz/!(abc)/xyz"));
            assert.isTrue(is.glob("xyz/*(abc)/xyz"));
            assert.isTrue(is.glob("xyz/+(abc)/xyz"));
            assert.isTrue(is.glob("?(abc|xyz)/xyz"));
            assert.isTrue(is.glob("@(abc|xyz)"));
            assert.isTrue(is.glob("!(abc|xyz)"));
            assert.isTrue(is.glob("*(abc|xyz)"));
            assert.isTrue(is.glob("+(abc|xyz)"));
        });

        it("should not match escaped extglobs", () => {
            assert.isTrue(!is.glob("\\?(abc)"));
            assert.isTrue(!is.glob("\\@(abc)"));
            assert.isTrue(!is.glob("\\!(abc)"));
            assert.isTrue(!is.glob("\\*(abc)"));
            assert.isTrue(!is.glob("\\+(abc)"));
            assert.isTrue(!is.glob("xyz/\\?(abc)/xyz"));
            assert.isTrue(!is.glob("xyz/\\@(abc)/xyz"));
            assert.isTrue(!is.glob("xyz/\\!(abc)/xyz"));
            assert.isTrue(!is.glob("xyz/\\*(abc)/xyz"));
            assert.isTrue(!is.glob("xyz/\\+(abc)/xyz"));
        });

        it("should detect when an glob is in the same pattern as an escaped glob", () => {
            assert.isTrue(is.glob("\\?(abc|xyz)/xyz"));
            assert.isTrue(is.glob("\\@(abc|xyz)"));
            assert.isTrue(is.glob("\\!(abc|xyz)"));
            assert.isTrue(is.glob("\\*(abc|xyz)"));
            assert.isTrue(is.glob("\\+(abc|xyz)"));
            assert.isTrue(is.glob("\\?(abc)/?(abc)"));
            assert.isTrue(is.glob("\\@(abc)/@(abc)"));
            assert.isTrue(is.glob("\\!(abc)/!(abc)"));
            assert.isTrue(is.glob("\\*(abc)/*(abc)"));
            assert.isTrue(is.glob("\\+(abc)/+(abc)"));
            assert.isTrue(is.glob("xyz/\\?(abc)/xyz/def/?(abc)/xyz"));
            assert.isTrue(is.glob("xyz/\\@(abc)/xyz/def/@(abc)/xyz"));
            assert.isTrue(is.glob("xyz/\\!(abc)/xyz/def/!(abc)/xyz"));
            assert.isTrue(is.glob("xyz/\\*(abc)/xyz/def/*(abc)/xyz"));
            assert.isTrue(is.glob("xyz/\\+(abc)/xyz/def/+(abc)/xyz"));
            assert.isTrue(is.glob("\\?(abc|xyz)/xyz/?(abc|xyz)/xyz"));
            assert.isTrue(is.glob("\\@(abc|xyz)/@(abc|xyz)"));
            assert.isTrue(is.glob("\\!(abc|xyz)/!(abc|xyz)"));
            assert.isTrue(is.glob("\\*(abc|xyz)/*(abc|xyz)"));
            assert.isTrue(is.glob("\\+(abc|xyz)/+(abc|xyz)"));
        });
    });
});
