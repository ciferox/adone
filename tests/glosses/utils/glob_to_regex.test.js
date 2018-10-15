const {
    is,
    util: { globToRegex }
} = adone;

const match = function (glob, strUnix, strWin, opts = {}) {
    if (typeof strWin === "object") {
        opts = strWin;
        strWin = false;
    }
    const res = globToRegex(glob, opts);
    return res.regex.test(is.windows && strWin ? strWin : strUnix);
};

const matchRegex = function (pattern, ifUnix, ifWin, opts) {
    const res = globToRegex(pattern, opts);
    const { regex } = (opts.filepath ? res.path : res);
    assert.strictEqual(regex.toString(), is.windows ? ifWin : ifUnix, "~> regex matches expectant");
    return res;
};

const matchSegments = function (pattern, ifUnix, ifWin, opts) {
    const res = globToRegex(pattern, { filepath: true, ...opts });
    const str = res.path.segments.join(" ");
    const exp = (is.windows ? ifWin : ifUnix).join(" ");
    assert.strictEqual(str, exp);
    return res;
};


describe("util", () => {
    it("standard", () => {
        const res = globToRegex("*.js");
        assert.equal(typeof globToRegex, "function", "consturctor is a typeof function");
        assert.equal(res instanceof Object, true, "returns object");
        assert.equal(res.regex.toString(), "/^.*\\.js$/", "returns regex object");
    });

    it("Standard * matching", () => {
        assert.equal(match("*", "foo"), true, "match everything");
        assert.equal(match("*", "foo", { flags: "g" }), true, "match everything");
        assert.equal(match("f*", "foo"), true, "match the end");
        assert.equal(match("f*", "foo", { flags: "g" }), true, "match the end");
        assert.equal(match("*o", "foo"), true, "match the start");
        assert.equal(match("*o", "foo", { flags: "g" }), true, "match the start");
        assert.equal(match("f*uck", "firetruck"), true, "match the middle");
        assert.equal(match("f*uck", "firetruck", { flags: "g" }), true, "match the middle");
        assert.equal(match("uc", "firetruck"), false, "do not match without g");
        assert.equal(match("uc", "firetruck", { flags: "g" }), true, 'match anywhere with RegExp "g"');
        assert.equal(match("f*uck", "fuck"), true, "match zero characters");
        assert.equal(match("f*uck", "fuck", { flags: "g" }), true, "match zero characters");
    });

    it("advance * matching", () => {
        assert.equal(match("*.min.js", "http://example.com/jquery.min.js", { globstar: false }), true, "complex match");
        assert.equal(match("*.min.*", "http://example.com/jquery.min.js", { globstar: false }), true, "complex match");
        assert.equal(match("*/js/*.js", "http://example.com/js/jquery.min.js", { globstar: false }), true, "complex match");
        assert.equal(match("*.min.*", "http://example.com/jquery.min.js", { flags: "g" }), true, "complex match global");
        assert.equal(match("*.min.js", "http://example.com/jquery.min.js", { flags: "g" }), true, "complex match global");
        assert.equal(match("*/js/*.js", "http://example.com/js/jquery.min.js", { flags: "g" }), true, "complex match global");

        const str = "\\/$^+?.()=!|{},[].*";
        assert.equal(match(str, str), true, "battle test complex string - strict");
        assert.equal(match(str, str, { flags: "g" }), true, "battle test complex string - strict");

        assert.equal(match(".min.", "http://example.com/jquery.min.js"), false, 'matches without/with using RegExp "g"');
        assert.equal(match("*.min.*", "http://example.com/jquery.min.js"), true, 'matches without/with using RegExp "g"');
        assert.equal(match(".min.", "http://example.com/jquery.min.js", { flags: "g" }), true, 'matches without/with using RegExp "g"');
        assert.equal(match("http:", "http://example.com/jquery.min.js"), false, 'matches without/with using RegExp "g"');
        assert.equal(match("http:*", "http://example.com/jquery.min.js"), true, 'matches without/with using RegExp "g"');
        assert.equal(match("http:", "http://example.com/jquery.min.js", { flags: "g" }), true, 'matches without/with using RegExp "g"');
        assert.equal(match("min.js", "http://example.com/jquery.min.js"), false, 'matches without/with using RegExp "g"');
        assert.equal(match("*.min.js", "http://example.com/jquery.min.js"), true, 'matches without/with using RegExp "g"');
        assert.equal(match("min.js", "http://example.com/jquery.min.js", { flags: "g" }), true, 'matches without/with using RegExp "g"');
        assert.equal(match("min", "http://example.com/jquery.min.js", { flags: "g" }), true, 'match anywhere (globally) using RegExp "g"');
        assert.equal(match("/js/", "http://example.com/js/jquery.min.js", { flags: "g" }), true, 'match anywhere (globally) using RegExp "g"');
        assert.equal(match("/js*jq*.js", "http://example.com/js/jquery.min.js"), false);
        assert.equal(match("/js*jq*.js", "http://example.com/js/jquery.min.js", { flags: "g" }), true);
    });

    it("? match one character, no more and no less", () => {
        assert.equal(match("f?o", "foo", { extended: true }), true);
        assert.equal(match("f?o", "fooo", { extended: true }), false);
        assert.equal(match("f?oo", "foo", { extended: true }), false);

        const tester = (globstar) => {
            assert.equal(match("f?o", "foo", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("f?o", "fooo", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("f?o?", "fooo", { extended: true, globstar, flags: "g" }), true);

            assert.equal(match("?fo", "fooo", { extended: true, globstar, flags: "g" }), false);
            assert.equal(match("f?oo", "foo", { extended: true, globstar, flags: "g" }), false);
            assert.equal(match("foo?", "foo", { extended: true, globstar, flags: "g" }), false);
        };

        tester(true);
        tester(false);
    });

    it("[] match a character range", () => {
        assert.equal(match("fo[oz]", "foo", { extended: true }), true);
        assert.equal(match("fo[oz]", "foz", { extended: true }), true);
        assert.equal(match("fo[oz]", "fog", { extended: true }), false);
        assert.equal(match("fo[a-z]", "fob", { extended: true }), true);
        assert.equal(match("fo[a-d]", "fot", { extended: true }), false);
        assert.equal(match("fo[!tz]", "fot", { extended: true }), false);
        assert.equal(match("fo[!tz]", "fob", { extended: true }), true);

        const tester = (globstar) => {
            assert.equal(match("fo[oz]", "foo", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("fo[oz]", "foz", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("fo[oz]", "fog", { extended: true, globstar, flags: "g" }), false);
        };

        tester(true);
        tester(false);
    });

    it("[] extended character ranges", () => {
        assert.equal(match("[[:alnum:]]/bar.txt", "a/bar.txt", { extended: true }), true);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "11/bar.txt", { extended: true }), true);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "a/bar.txt", { extended: true }), true);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "b/bar.txt", { extended: true }), true);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "c/bar.txt", { extended: true }), true);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "abc/bar.txt", { extended: true }), false);
        assert.equal(match("@([[:alnum:]abc]|11)/bar.txt", "3/bar.txt", { extended: true }), true);
        assert.equal(match("[[:digit:]]/bar.txt", "1/bar.txt", { extended: true }), true);
        assert.equal(match("[[:digit:]b]/bar.txt", "b/bar.txt", { extended: true }), true);
        assert.equal(match("[![:digit:]b]/bar.txt", "a/bar.txt", { extended: true }), true);
        assert.equal(match("[[:alnum:]]/bar.txt", "!/bar.txt", { extended: true }), false);
        assert.equal(match("[[:digit:]]/bar.txt", "a/bar.txt", { extended: true }), false);
        assert.equal(match("[[:digit:]b]/bar.txt", "a/bar.txt", { extended: true }), false);
    });

    it("{} match a choice of different substrings", () => {
        assert.equal(match("foo{bar,baaz}", "foobaaz", { extended: true }), true);
        assert.equal(match("foo{bar,baaz}", "foobar", { extended: true }), true);
        assert.equal(match("foo{bar,baaz}", "foobuzz", { extended: true }), false);
        assert.equal(match("foo{bar,b*z}", "foobuzz", { extended: true }), true);

        const tester = (globstar) => {
            assert.equal(match("foo{bar,baaz}", "foobaaz", { extended: true, globstar, flag: "g" }), true);
            assert.equal(match("foo{bar,baaz}", "foobar", { extended: true, globstar, flag: "g" }), true);
            assert.equal(match("foo{bar,baaz}", "foobuzz", { extended: true, globstar, flag: "g" }), false);
            assert.equal(match("foo{bar,b*z}", "foobuzz", { extended: true, globstar, flag: "g" }), true);
        };

        tester(true);
        tester(false);
    });

    it("complex extended matches", () => {
        assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://foo.baaz.com/jquery.min.js", { extended: true }), true);
        assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.html", { extended: true }), true);
        assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.htm", { extended: true }), false);
        assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.bar.com/index.html", { extended: true }), false);
        assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://flozz.buzz.com/index.html", { extended: true }), false);

        const tester = (globstar) => {
            assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://foo.baaz.com/jquery.min.js", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.html", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.buzz.com/index.htm", { extended: true, globstar, flags: "g" }), false);
            assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://moz.bar.com/index.html", { extended: true, globstar, flags: "g" }), false);
            assert.equal(match("http://?o[oz].b*z.com/{*.js,*.html}", "http://flozz.buzz.com/index.html", { extended: true, globstar, flags: "g" }), false);
        };

        tester(true);
        tester(false);
    });

    it("standard globstar", () => {
        const tester = (globstar) => {
            assert.equal(match("http://foo.com/**/{*.js,*.html}", "http://foo.com/bar/jquery.min.js", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("http://foo.com/**/{*.js,*.html}", "http://foo.com/bar/baz/jquery.min.js", { extended: true, globstar, flags: "g" }), true);
            assert.equal(match("http://foo.com/**", "http://foo.com/bar/baz/jquery.min.js", { extended: true, globstar, flags: "g" }), true);
        };

        tester(true);
        tester(false);
    });

    it("remaining chars should match themself", () => {
        const tester = (globstar) => {
            const testExtStr = "\\/$^+.()=!|,.*";
            assert.equal(match(testExtStr, testExtStr, { extended: true }), true);
            assert.equal(match(testExtStr, testExtStr, { extended: true, globstar, flags: "g" }), true);
        };

        tester(true);
        tester(false);
    });

    it("globstar advance testing", () => {
        assert.equal(match("/foo/*", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("/foo/**", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("/foo/*/*.txt", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/*.txt", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/*.txt", "/foo/bar/baz/qux.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/bar.txt", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/**/bar.txt", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/*/baz.txt", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/*.txt", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/**/*.txt", "/foo/bar.txt", { globstar: true }), true);
        assert.equal(match("/foo/**/*/*.txt", "/foo/bar/baz.txt", { globstar: true }), true);
        assert.equal(match("**/*.txt", "/foo/bar/baz/qux.txt", { globstar: true }), true);
        assert.equal(match("**/foo.txt", "foo.txt", { globstar: true }), true);
        assert.equal(match("**/*.txt", "foo.txt", { globstar: true }), true);
        assert.equal(match("/foo/*", "/foo/bar/baz.txt", { globstar: true }), false);
        assert.equal(match("/foo/*.txt", "/foo/bar/baz.txt", { globstar: true }), false);
        assert.equal(match("/foo/*/*.txt", "/foo/bar/baz/qux.txt", { globstar: true }), false);
        assert.equal(match("/foo/*/bar.txt", "/foo/bar.txt", { globstar: true }), false);
        assert.equal(match("/foo/*/*/baz.txt", "/foo/bar/baz.txt", { globstar: true }), false);
        assert.equal(match("/foo/**.txt", "/foo/bar/baz/qux.txt", { globstar: true }), false);
        assert.equal(match("/foo/bar**/*.txt", "/foo/bar/baz/qux.txt", { globstar: true }), false);
        assert.equal(match("/foo/bar**", "/foo/bar/baz.txt", { globstar: true }), false);
        assert.equal(match("**/.txt", "/foo/bar/baz/qux.txt", { globstar: true }), false);
        assert.equal(match("*/*.txt", "/foo/bar/baz/qux.txt", { globstar: true }), false);
        assert.equal(match("*/*.txt", "foo.txt", { globstar: true }), false);
        assert.equal(match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", { extended: true, globstar: true }), false);
        assert.equal(match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", { globstar: true }), false);
        assert.equal(match("http://foo.com/*", "http://foo.com/bar/baz/jquery.min.js", { globstar: false }), true);
        assert.equal(match("http://foo.com/**", "http://foo.com/bar/baz/jquery.min.js", { globstar: true }), true);
        assert.equal(match("http://foo.com/*/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", { globstar: true }), true);
        assert.equal(match("http://foo.com/**/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", { globstar: true }), true);
        assert.equal(match("http://foo.com/*/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", { globstar: false }), true);
        assert.equal(match("http://foo.com/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", { globstar: false }), true);
        assert.equal(match("http://foo.com/*/jquery.min.js", "http://foo.com/bar/baz/jquery.min.js", { globstar: true }), false);
    });

    it("extended extglob ?", () => {
        assert.equal(match("(foo).txt", "(foo).txt", { extended: true }), true);
        assert.equal(match("?(foo).txt", "foo.txt", { extended: true }), true);
        assert.equal(match("?(foo).txt", ".txt", { extended: true }), true);
        assert.equal(match("?(foo|bar)baz.txt", "foobaz.txt", { extended: true }), true);
        assert.equal(match("?(ba[zr]|qux)baz.txt", "bazbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba[zr]|qux)baz.txt", "barbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba[zr]|qux)baz.txt", "quxbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba[!zr]|qux)baz.txt", "batbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba*|qux)baz.txt", "batbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba*|qux)baz.txt", "batttbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba*|qux)baz.txt", "quxbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba?(z|r)|qux)baz.txt", "bazbaz.txt", { extended: true }), true);
        assert.equal(match("?(ba?(z|?(r))|qux)baz.txt", "bazbaz.txt", { extended: true }), true);
        assert.equal(match("?(foo).txt", "foo.txt", { extended: false }), false);
        assert.equal(match("?(foo|bar)baz.txt", "foobarbaz.txt", { extended: true }), false);
        assert.equal(match("?(ba[zr]|qux)baz.txt", "bazquxbaz.txt", { extended: true }), false);
        assert.equal(match("?(ba[!zr]|qux)baz.txt", "bazbaz.txt", { extended: true }), false);
    });

    it("extended extglob *", () => {
        assert.equal(match("*(foo).txt", "foo.txt", { extended: true }), true);
        assert.equal(match("*foo.txt", "bofoo.txt", { extended: true }), true);
        assert.equal(match("*(foo).txt", "foofoo.txt", { extended: true }), true);
        assert.equal(match("*(foo).txt", ".txt", { extended: true }), true);
        assert.equal(match("*(fooo).txt", ".txt", { extended: true }), true);
        assert.equal(match("*(fooo).txt", "foo.txt", { extended: true }), false);
        assert.equal(match("*(foo|bar).txt", "foobar.txt", { extended: true }), true);
        assert.equal(match("*(foo|bar).txt", "barbar.txt", { extended: true }), true);
        assert.equal(match("*(foo|bar).txt", "barfoobar.txt", { extended: true }), true);
        assert.equal(match("*(foo|bar).txt", ".txt", { extended: true }), true);
        assert.equal(match("*(foo|ba[rt]).txt", "bat.txt", { extended: true }), true);
        assert.equal(match("*(foo|b*[rt]).txt", "blat.txt", { extended: true }), true);
        assert.equal(match("*(foo|b*[rt]).txt", "tlat.txt", { extended: true }), false);
        assert.equal(match("*(*).txt", "whatever.txt", { extended: true, globstar: true }), true);
        assert.equal(match("*(foo|bar)/**/*.txt", "foo/hello/world/bar.txt", { extended: true, globstar: true }), true);
        assert.equal(match("*(foo|bar)/**/*.txt", "foo/world/bar.txt", { extended: true, globstar: true }), true);
    });

    it("extended extglob +", () => {
        assert.equal(match("+(foo).txt", "foo.txt", { extended: true }), true);
        assert.equal(match("+foo.txt", "+foo.txt", { extended: true }), true);
        assert.equal(match("+(foo).txt", ".txt", { extended: true }), false);
        assert.equal(match("+(foo|bar).txt", "foobar.txt", { extended: true }), true);
    });

    it("extended extglob @", () => {
        assert.equal(match("@(foo).txt", "foo.txt", { extended: true }), true);
        assert.equal(match("@foo.txt", "@foo.txt", { extended: true }), true);
        assert.equal(match("@(foo|baz)bar.txt", "foobar.txt", { extended: true }), true);
        assert.equal(match("@(foo|baz)bar.txt", "foobazbar.txt", { extended: true }), false);
        assert.equal(match("@(foo|baz)bar.txt", "foofoobar.txt", { extended: true }), false);
        assert.equal(match("@(foo|baz)bar.txt", "toofoobar.txt", { extended: true }), false);
    });

    it("extended extglob !", () => {
        assert.equal(match("!(boo).txt", "foo.txt", { extended: true }), true);
        assert.equal(match("!(foo|baz)bar.txt", "buzbar.txt", { extended: true }), true);
        assert.equal(match("!bar.txt", "!bar.txt", { extended: true }), true);
        assert.equal(match("!({foo,bar})baz.txt", "notbaz.txt", { extended: true }), true);
        assert.equal(match("!({foo,bar})baz.txt", "foobaz.txt", { extended: true }), false);
    });


    it("strict", () => {
        assert.equal(match("foo//bar.txt", "foo/bar.txt"), true);
        assert.equal(match("foo///bar.txt", "foo/bar.txt"), true);
        assert.equal(match("foo///bar.txt", "foo/bar.txt", { strict: true }), false);
    });


    it("filepath path-regex", () => {
        const opts = { extended: true, filepath: true };

        let res = globToRegex("", opts);
        assert.strictEqual(res.hasOwnProperty("path"), true);
        assert.strictEqual(res.path.hasOwnProperty("regex"), true);
        assert.strictEqual(res.path.hasOwnProperty("segments"), true);
        assert.strictEqual(is.array(res.path.segments), true);

        const pattern = "foo/bar/baz.js";
        res = matchRegex(pattern, "/^foo\\/bar\\/baz\\.js$/", "/^foo\\\\+bar\\\\+baz\\.js$/", opts);
        assert.strictEqual(res.path.segments.length, 3);

        res = matchRegex("../foo/bar.js", "/^\\.\\.\\/foo\\/bar\\.js$/", "/^\\.\\.\\\\+foo\\\\+bar\\.js$/", opts);
        assert.strictEqual(res.path.segments.length, 3);

        res = matchRegex("*/bar.js", "/^.*\\/bar\\.js$/", "/^.*\\\\+bar\\.js$/", opts);
        assert.strictEqual(res.path.segments.length, 2);

        opts.globstar = true;
        res = matchRegex("**/bar.js", "/^((?:[^\\/]*(?:\\/|$))*)bar\\.js$/", "/^((?:[^\\\\]*(?:\\\\|$))*)bar\\.js$/", opts);
        assert.strictEqual(res.path.segments.length, 2);
    });

    it("filepath path segments", () => {
        const opts = { extended: true };

        let unix = [/^foo$/, /^bar$/, /^([^\/]*)$/, /^baz\.(md|js|txt)$/];
        let win = [/^foo$/, /^bar$/, /^([^\\]*)$/, /^baz\.(md|js|txt)$/];
        matchSegments("foo/bar/*/baz.{md,js,txt}", unix, win, { ...opts, globstar: true });

        unix = [/^foo$/, /^.*$/, /^baz\.md$/];
        win = [/^foo$/, /^.*$/, /^baz\.md$/];
        matchSegments("foo/*/baz.md", unix, win, opts);

        unix = [/^foo$/, /^.*$/, /^baz\.md$/];
        win = [/^foo$/, /^.*$/, /^baz\.md$/];
        matchSegments("foo/**/baz.md", unix, win, opts);

        unix = [/^foo$/, /^((?:[^\/]*(?:\/|$))*)$/, /^baz\.md$/];
        win = [/^foo$/, /^((?:[^\\]*(?:\\|$))*)$/, /^baz\.md$/];
        matchSegments("foo/**/baz.md", unix, win, { ...opts, globstar: true });

        unix = [/^foo$/, /^.*$/, /^.*\.md$/];
        win = [/^foo$/, /^.*$/, /^.*\.md$/];
        matchSegments("foo/**/*.md", unix, win, opts);

        unix = [/^foo$/, /^((?:[^\/]*(?:\/|$))*)$/, /^([^\/]*)\.md$/];
        win = [/^foo$/, /^((?:[^\\]*(?:\\|$))*)$/, /^([^\\]*)\.md$/];
        matchSegments("foo/**/*.md", unix, win, { ...opts, globstar: true });

        unix = [/^foo$/, /^:$/, /^b:az$/];
        win = [/^foo$/, /^:$/, /^b:az$/];
        matchSegments("foo/:/b:az", unix, win, opts);

        unix = [/^foo$/, /^baz\.md$/];
        win = [/^foo$/, /^baz\.md$/];
        matchSegments("foo///baz.md", unix, win, { ...opts, strict: true });

        unix = [/^foo$/, /^baz\.md$/];
        win = [/^foo$/, /^baz\.md$/];
        matchSegments("foo///baz.md", unix, win, { ...opts, strict: false });
    });

    it("stress testing", () => {
        assert.equal(match("**/*/?yfile.{md,js,txt}", "foo/bar/baz/myfile.md", { extended: true }), true);
        assert.equal(match("**/*/?yfile.{md,js,txt}", "foo/baz/myfile.md", { extended: true }), true);
        assert.equal(match("**/*/?yfile.{md,js,txt}", "foo/baz/tyfile.js", { extended: true }), true);
        assert.equal(match("[[:digit:]_.]/file.js", "1/file.js", { extended: true }), true);
        assert.equal(match("[[:digit:]_.]/file.js", "2/file.js", { extended: true }), true);
        assert.equal(match("[[:digit:]_.]/file.js", "_/file.js", { extended: true }), true);
        assert.equal(match("[[:digit:]_.]/file.js", "./file.js", { extended: true }), true);
        assert.equal(match("[[:digit:]_.]/file.js", "z/file.js", { extended: true }), false);
    });
});
