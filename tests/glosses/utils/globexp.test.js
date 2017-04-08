const GlobExp = adone.util.GlobExp;
let re = 0;

const alpha = (a, b) => {
    return a > b ? 1 : -1;
};

describe("glosses", "utils", "GlobExp", () => {
    it("basic tests", () => {
        let files = [
            "a", "b", "c", "d", "abc",
            "abd", "abe", "bb", "bcd",
            "ca", "cb", "dd", "de",
            "bdir/", "bdir/cfile"
        ];

        const regexps = [
            "/^(?:(?=.)a[^/]*?)$/",
            "/^(?:(?=.)X[^/]*?)$/",
            "/^(?:\\*)$/",
            "/^(?:(?=.)\\*[^/]*?)$/",
            "/^(?:\\*\\*)$/",
            "/^(?:(?=.)b[^/]*?\\/)$/",
            "/^(?:(?=.)c[^/]*?)$/",
            "/^(?:(?:(?!(?:\\/|^)\\.).)*?)$/",
            "/^(?:\\.\\.\\/(?!\\.)(?=.)[^/]*?\\/)$/",
            "/^(?:s\\/(?=.)\\.\\.[^/]*?\\/)$/",
            "/^(?:\\/\\^root:\\/\\{s\\/(?=.)\\^[^:][^/]*?:[^:][^/]*?:\\([^:]\\)[^/]*?\\.[^/]*?\\$\\/1\\/)$/",
            "/^(?:\\/\\^root:\\/\\{s\\/(?=.)\\^[^:][^/]*?:[^:][^/]*?:\\([^:]\\)[^/]*?\\.[^/]*?\\$\\/\u0001\\/)$/",
            "/^(?:(?!\\.)(?=.)[a-c]b[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[a-y][^/]*?[^c])$/",
            "/^(?:(?=.)a[^/]*?[^c])$/",
            "/^(?:(?=.)a[X-]b)$/",
            "/^(?:(?!\\.)(?=.)[^a-c][^/]*?)$/",
            "/^(?:a\\*b\\/(?!\\.)(?=.)[^/]*?)$/",
            "/^(?:(?=.)a\\*[^/]\\/(?!\\.)(?=.)[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?\\\\\\![^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?\\![^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?\\.\\*)$/",
            "/^(?:(?=.)a[b]c)$/",
            "/^(?:(?=.)a[b]c)$/",
            "/^(?:(?=.)a[^/]c)$/",
            "/^(?:a\\*c)$/",
            "false",
            "/^(?:(?!\\.)(?=.)[^/]*?\\/(?=.)man[^/]*?\\/(?=.)bash\\.[^/]*?)$/",
            "/^(?:man\\/man1\\/bash\\.1)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/]*?c)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]c)$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/])$/",
            "/^(?:(?!\\.)(?=.)[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/])$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]c)$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?c)$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?[^/])$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?c)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/])$/",
            "/^(?:(?=.)a[^/]*?cd[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/]k)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/][^/]*?[^/]*?cd[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/]k)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/][^/]*?[^/]*?cd[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/]k[^/]*?[^/]*?[^/]*?)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/][^/]*?[^/]*?cd[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/][^/]*?[^/]*?[^/]*?k)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/][^/]*?[^/]*?cd[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/][^/]*?[^/]*?[^/]*?k[^/]*?[^/]*?)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/]*?[^/]*?c[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/][^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[-abc])$/",
            "/^(?:(?!\\.)(?=.)[abc-])$/",
            "/^(?:\\\\)$/",
            "/^(?:(?!\\.)(?=.)[\\\\])$/",
            "/^(?:(?!\\.)(?=.)[\\[])$/",
            "/^(?:\\[)$/",
            "/^(?:(?=.)\\[(?!\\.)(?=.)[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[\\]])$/",
            "/^(?:(?!\\.)(?=.)[\\]-])$/",
            "/^(?:(?!\\.)(?=.)[a-z])$/",
            "/^(?:(?!\\.)(?=.)[^/][^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?[^/])$/",
            "/^(?:(?!\\.)(?=.)[^/][^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?c)$/",
            "/^(?:(?!\\.)(?=.)[^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?c[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/]*?[^/]*?[^/]*?[^/]*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?c[^/]*?[^/][^/]*?[^/]*?)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?c[^/]*?[^/][^/]*?[^/]*?)$/",
            "/^(?:(?=.)a[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/][^/][^/][^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?[^/]*?)$/",
            "/^(?:\\[\\])$/",
            "/^(?:\\[abc)$/",
            "/^(?:(?=.)XYZ)$/i",
            "/^(?:(?=.)ab[^/]*?)$/i",
            "/^(?:(?!\\.)(?=.)[ia][^/][ck])$/i",
            "/^(?:\\/(?!\\.)(?=.)[^/]*?|(?!\\.)(?=.)[^/]*?)$/",
            "/^(?:\\/(?!\\.)(?=.)[^/]|(?!\\.)(?=.)[^/]*?)$/",
            "/^(?:(?:(?!(?:\\/|^)\\.).)*?)$/",
            "/^(?:a\\/(?!(?:^|\\/)\\.{1,2}(?:$|\\/))(?=.)[^/]*?\\/b)$/",
            "/^(?:a\\/(?=.)\\.[^/]*?\\/b)$/",
            "/^(?:a\\/(?!\\.)(?=.)[^/]*?\\/b)$/",
            "/^(?:a\\/(?=.)\\.[^/]*?\\/b)$/",
            "/^(?:(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?\\(a\\/b\\))$/",
            "/^(?:(?!\\.)(?=.)(?:a|b)*|(?!\\.)(?=.)(?:a|c)*)$/",
            "/^(?:(?=.)\\[(?=.)\\!a[^/]*?)$/",
            "/^(?:(?=.)\\[(?=.)#a[^/]*?)$/",
            "/^(?:(?=.)\\+\\(a\\|[^/]*?\\|c\\\\\\\\\\|d\\\\\\\\\\|e\\\\\\\\\\\\\\\\\\|f\\\\\\\\\\\\\\\\\\|g)$/",
            "/^(?:(?!\\.)(?=.)(?:a|b)*|(?!\\.)(?=.)(?:a|c)*)$/",
            "/^(?:a|(?!\\.)(?=.)[^/]*?\\(b\\|c|d\\))$/",
            "/^(?:a|(?!\\.)(?=.)(?:b|c)*|(?!\\.)(?=.)(?:b|d)*)$/",
            "/^(?:(?!\\.)(?=.)(?:a|b|c)*|(?!\\.)(?=.)(?:a|c)*)$/",
            "/^(?:(?!\\.)(?=.)[^/]*?\\(a\\|b\\|c\\)|(?!\\.)(?=.)[^/]*?\\(a\\|c\\))$/",
            "/^(?:(?=.)a[^/]b)$/",
            "/^(?:(?=.)#[^/]*?)$/",
            "/^(?!^(?:(?=.)a[^/]*?)$).*$/",
            "/^(?:(?=.)\\!a[^/]*?)$/",
            "/^(?:(?=.)a[^/]*?)$/",
            "/^(?!^(?:(?=.)\\!a[^/]*?)$).*$/",
            "/^(?:(?!\\.)(?=.)[^\\/]*?\\.(?:(?!(?:js)$)[^\\/]*?))$/",
            "/^(?:(?:(?!(?:\\/|^)\\.).)*?\\/\\.x\\/(?:(?!(?:\\/|^)\\.).)*?)$/",
            "/^(?:\\[z\\-a\\])$/",
            "/^(?:a\\/\\[2015\\-03\\-10T00:23:08\\.647Z\\]\\/z)$/",
            "/^(?:(?=.)\\[a-0\\][a-Ā])$/"
        ];

        const testCases = [
            "http://www.bashcookbook.com/bashinfo/source/bash-1.14.7/tests/glob-test",
            ["a*", ["a", "abc", "abd", "abe"]],
            ["X*", []],

            ["\\*", []],
            ["\\**", []],
            ["\\*\\*", []],

            ["b*/", ["bdir/"]],
            ["c*", ["c", "ca", "cb"]],
            ["**", files],

            ["\\.\\./*/", []],
            ["s/\\..*//", []],

            "legendary larry crashes bashes",
            ["/^root:/{s/^[^:]*:[^:]*:\([^:]*\).*$/\\1/", []],
            ["/^root:/{s/^[^:]*:[^:]*:\([^:]*\).*$/\u0001/", []],

            "character classes", ["[a-c]b*",
            ["abc", "abd", "abe", "bb", "cb"]],
            ["[a-y]*[^c]", ["abd", "abe", "bb", "bcd",
                "bdir/", "ca", "cb", "dd", "de"
            ]],
            ["a*[^c]", ["abd", "abe"]],
            function () {
                files.push("a-b", "aXb");
            },
            ["a[X-]b", ["a-b", "aXb"]],
            function () {
                files.push(".x", ".y");
            },
            ["[^a-c]*", ["d", "dd", "de"]],
            function () {
                files.push("a*b/", "a*b/ooo");
            },
            ["a\\*b/*", ["a*b/ooo"]],
            ["a\\*?/*", ["a*b/ooo"]],
            ["*\\\\!*", [], { null: true },
                ["echo !7"]
            ],
            ["*\\!*", ["echo !7"], null, ["echo !7"]],
            ["*.\\*", ["r.*"], null, ["r.*"]],
            ["a[b]c", ["abc"]],
            ["a[\\b]c", ["abc"]],
            ["a?c", ["abc"]],
            ["a\\*c", [], { null: true },
                ["abc"]
            ],
            ["", [""], { null: true },
                [""]
            ],

            "http://www.opensource.apple.com/source/bash/bash-23/" +
            "bash/tests/glob-test",
            function () {
                files.push("man/", "man/man1/", "man/man1/bash.1");
            },
            ["*/man*/bash.*", ["man/man1/bash.1"]],
            ["man/man1/bash.1", ["man/man1/bash.1"]],
            ["a***c", ["abc"], null, ["abc"]],
            ["a*****?c", ["abc"], null, ["abc"]],
            ["?*****??", ["abc"], null, ["abc"]],
            ["*****??", ["abc"], null, ["abc"]],
            ["?*****?c", ["abc"], null, ["abc"]],
            ["?***?****c", ["abc"], null, ["abc"]],
            ["?***?****?", ["abc"], null, ["abc"]],
            ["?***?****", ["abc"], null, ["abc"]],
            ["*******c", ["abc"], null, ["abc"]],
            ["*******?", ["abc"], null, ["abc"]],
            ["a*cd**?**??k", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["a**?**cd**?**??k", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["a**?**cd**?**??k***", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["a**?**cd**?**??***k", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["a**?**cd**?**??***k**", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["a****c**?**??*****", ["abcdecdhjk"], null, ["abcdecdhjk"]],
            ["[-abc]", ["-"], null, ["-"]],
            ["[abc-]", ["-"], null, ["-"]],
            ["\\", ["\\"], null, ["\\"]],
            ["[\\\\]", ["\\"], null, ["\\"]],
            ["[[]", ["["], null, ["["]],
            ["[", ["["], null, ["["]],
            ["[*", ["[abc"], null, ["[abc"]],

            "a right bracket shall lose its special meaning and\nrepresent itself in a bracket expression if it occurs\nfirst in the list.  -- POSIX.2 2.8.3.2",
            ["[]]", ["]"], null, ["]"]],
            ["[]-]", ["]"], null, ["]"]],
            ["[a-\z]", ["p"], null, ["p"]],
            ["??**********?****?", [], { null: true },
                ["abc"]
            ],
            ["??**********?****c", [], { null: true },
                ["abc"]
            ],
            ["?************c****?****", [], { null: true },
                ["abc"]
            ],
            ["*c*?**", [], { null: true },
                ["abc"]
            ],
            ["a*****c*?**", [], { null: true },
                ["abc"]
            ],
            ["a********???*******", [], { null: true },
                ["abc"]
            ],
            ["[]", [], { null: true },
                ["a"]
            ],
            ["[abc", [], { null: true },
                ["["]
            ],

            "nocase tests",
            [
                "XYZ", ["xYz"], { nocase: true, null: true },
                ["xYz", "ABC", "IjK"]
            ],
            [
                "ab*", ["ABC"],
                { nocase: true, null: true },
                ["xYz", "ABC", "IjK"]
            ],
            [
                "[ia]?[ck]", ["ABC", "IjK"],
                { nocase: true, null: true },
                ["xYz", "ABC", "IjK"]
            ],

            // [ pattern, [matches], MM opts, files, TAP opts]
            "onestar/twostar",
            [
                "{/*,*}", [], { null: true },
                ["/asdf/asdf/asdf"]
            ],
            ["{/?,*}", ["/a", "bb"], { null: true },
                ["/a", "/b/b", "/a/b/c", "bb"]
            ],

            "dots should not match unless requested",
            [
                "**", ["a/b"], {},
                ["a/b", "a/.d", ".a/.d"]
            ],

            // .. and . can only match patterns starting with .,
            // even when options.dot is set.
            function () {
                files = ["a/./b", "a/../b", "a/c/b", "a/.d/b"];
            },
            ["a/*/b", ["a/c/b", "a/.d/b"], { dot: true }],
            ["a/.*/b", ["a/./b", "a/../b", "a/.d/b"], { dot: true }],
            ["a/*/b", ["a/c/b"], { dot: false }],
            ["a/.*/b", ["a/./b", "a/../b", "a/.d/b"], { dot: false }],

            // this also tests that changing the options needs
            // to change the cache key, even if the pattern is
            // the same!
            [
                "**", ["a/b", "a/.d", ".a/.d"],
                { dot: true },
                [".a/.d", "a/.d", "a/b"]
            ],

            "paren sets cannot contain slashes",
            [
                "*(a/b)", [],
                ["a/b"]
            ],

            // brace sets trump all else.
            //
            // invalid glob pattern.  fails on bash4 and bsdglob.
            // however, in this implementation, it's easier just
            // to do the intuitive thing, and let brace-expansion
            // actually come before parsing any extglob patterns,
            // like the documentation seems to say.
            //
            // bash/bsdglob says this:
            // , ["*(a|{b),c)}", ["*(a|{b),c)}"], {}, ["a", "ab", "ac", "ad"]]
            // but we do this instead:
            ["*(a|{b),c)}", ["a", "ab", "ac"], {},
                ["a", "ab", "ac", "ad"]
            ],

            // test partial parsing in the presence of comment/negation chars
            ["[!a*", ["[!ab"], {},
                ["[!ab", "[ab"]
            ],
            ["[#a*", ["[#ab"], {},
                ["[#ab", "[ab"]
            ],

            // like: {a,b|c\\,d\\\|e} except it's unclosed, so it has to be escaped.
            [
                "+(a|*\\|c\\\\|d\\\\\\|e\\\\\\\\|f\\\\\\\\\\|g", ["+(a|b\\|c\\\\|d\\\\|e\\\\\\\\|f\\\\\\\\|g"],
                {},
                ["+(a|b\\|c\\\\|d\\\\|e\\\\\\\\|f\\\\\\\\|g", "a", "b\\c"]
            ],

            // crazy nested {,,} and *(||) tests.
            function () {
                files = [
                    "a", "b", "c", "d", "ab", "ac", "ad", "bc", "cb", "bc,d",
                    "c,db", "c,d", "d)", "(b|c", "*(b|c", "b|c", "b|cc", "cb|c",
                    "x(a|b|c)", "x(a|c)", "(a|b|c)", "(a|c)"
                ];
            },
            ["*(a|{b,c})", ["a", "b", "c", "ab", "ac"]],
            ["{a,*(b|c,d)}", ["a", "(b|c", "*(b|c", "d)"]],
            // a
            // *(b|c)
            // *(b|d)
            ["{a,*(b|{c,d})}", ["a", "b", "bc", "cb", "c", "d"]],
            ["*(a|{b|c,c})", ["a", "b", "c", "ab", "ac", "bc", "cb"]],

            // test various flag settings.
            [
                "*(a|{b|c,c})", ["x(a|b|c)", "x(a|c)", "(a|b|c)", "(a|c)"],
                { noext: true }
            ],
            [
                "a?b", ["x/y/acb", "acb/"],
                { matchBase: true },
                ["x/y/acb", "acb/", "acb/d/e", "x/y/acb/d"]
            ],
            ["#*", ["#a", "#b"], { nocomment: true },
                ["#a", "#b", "c#d"]
            ],

            // begin channelling Boole and deMorgan...
            "negation tests",
            function () {
                files = ["d", "e", "!ab", "!abc", "a!b", "\\!a"];
            },

            // anything that is NOT a* matches.
            ["!a*", ["\\!a", "d", "e", "!ab", "!abc"]],

            // anything that IS !a* matches.
            ["!a*", ["!ab", "!abc"], { nonegate: true }],

            // anything that IS a* matches
            ["!!a*", ["a!b"]],

            // anything that is NOT !a* matches
            ["!\\!a*", ["a!b", "d", "e", "\\!a"]],

            // negation nestled within a pattern
            function () {
                files = [
                    "foo.js",
                    "foo.bar",
                    "foo.js.js",
                    "blar.js",
                    "foo.",
                    "boo.js.boo"
                ];
            },
            // last one is tricky! * matches foo, . matches ., and 'js.js' != 'js'
            // copy bash 4.3 behavior on this.
            ["*.!(js)", ["foo.bar", "foo.", "boo.js.boo", "foo.js.js"]],

            "**/.x/** should match all files inside .x independently of depth",
            function () {
                files = [
                    "a/b/.x/c", "a/b/.x/c/d", "a/b/.x/c/d/e", "a/b/.x", "a/b/.x/",
                    "a/.x/b", ".x", ".x/", ".x/a", ".x/a/b", "a/.x/b/.x/c", ".x/.x"
                ];
            },
            [
                "**/.x/**", [
                    ".x/", ".x/a", ".x/a/b", "a/.x/b", "a/b/.x/", "a/b/.x/c",
                    "a/b/.x/c/d", "a/b/.x/c/d/e"
                ]
            ],

            "Invalid ranges should not to throw",
            ["[z-a]", []],
            ["a/[2015-03-10T00:23:08.647Z]/z", []],
            ["[a-0][a-\u0100]", []]
        ];

        let message;
        for (const c of testCases) {
            if (adone.is.function(c)) {
                c();
                continue;
            }
            if (adone.is.string(c)) {
                message = c;
                continue;
            }

            // c = [ pattern, [matches], GlobExp opts, files ]
            const [pattern, expect] = c;
            expect.sort();
            let [, , options, f] = c[1].sort(alpha);
            options = c[2] || {};
            f = c[3] || files;

            const gexp = new GlobExp(pattern, options);

            let makedRe = gexp.makeRe();
            makedRe = String(makedRe) || JSON.stringify(makedRe);
            makedRe = `/${makedRe.slice(1, -1).replace(new RegExp("([^\\\\])/", "g"), "$1\\\/")}/`;

            let expectRe = regexps[re++];
            expectRe = `/${expectRe.slice(1, -1).replace(new RegExp("([^\\\\])/", "g"), "$1\\\/")}/`;

            const actualStatic = f.filter((x) => GlobExp.test(x, pattern, options));
            const actualInstance = f.filter((x) => gexp.test(x));

            actualStatic.sort(alpha);
            actualInstance.sort(alpha);

            assert.deepEqual(actualStatic, expect, message);
            assert.deepEqual(actualInstance, expect, message);
            assert.equal(makedRe, expectRe, message);
        }
    });

    it("expandBraces", () => {
        const patterns = [
            [
                "a{b,c{d,e},{f,g}h}x{y,z}",
                [
                    "abxy",
                    "abxz",
                    "acdxy",
                    "acdxz",
                    "acexy",
                    "acexz",
                    "afhxy",
                    "afhxz",
                    "aghxy",
                    "aghxz"
                ]
            ],
            [
                "a{1..5}b",
                [
                    "a1b",
                    "a2b",
                    "a3b",
                    "a4b",
                    "a5b"
                ]
            ],
            [
                "a{5..1}b",
                [
                    "a5b",
                    "a4b",
                    "a3b",
                    "a2b",
                    "a1b"
                ]
            ],
            ["a{b}c", ["a{b}c"]],
            [
                "a{00..05}b",
                [
                    "a00b",
                    "a01b",
                    "a02b",
                    "a03b",
                    "a04b",
                    "a05b"
                ]
            ],
          ["z{a,b},c}d", ["za,c}d", "zb,c}d"]],
          ["z{a,b{,c}d", ["z{a,bd", "z{a,bcd"]],
          ["a{b{c{d,e}f}g}h", ["a{b{cdf}g}h", "a{b{cef}g}h"]],
            [
                "a{b{c{d,e}f{x,y}}g}h",
                [
                    "a{b{cdfx}g}h",
                    "a{b{cdfy}g}h",
                    "a{b{cefx}g}h",
                    "a{b{cefy}g}h"
                ]
            ],
            [
                "a{b{c{d,e}f{x,y{}g}h",
                [
                    "a{b{cdfxh",
                    "a{b{cdfy{}gh",
                    "a{b{cefxh",
                    "a{b{cefy{}gh"
                ]
            ]
        ];
        for (const tc of patterns) {
            const [p, expect] = tc;
            assert.deepEqual(GlobExp.expandBraces(p), expect);
        }
    });

    it("extglob ending with statechar", () => {
        assert.isNotOk(GlobExp.test("ax", "a?(b*)"));
        assert.isOk(GlobExp.test("ax", "?(a*|b)"));
    });

    it("extglob-unfinished", () => {
        const types = "!?+*@".split("");

        for (const type of types) {
            assert.isOk(GlobExp.test(`${type}(a|B`, `${type}(a|B`, { nonegate: true }));
            assert.isNotOk(GlobExp.test(`${type}(a|B`, "B", { nonegate: true }));
        }
    });

    it("redos", () => {
        let exploit = `!(${"|".repeat(1024 * 15)}A)`;

        // within the limits, and valid match
        assert.isOk(GlobExp.test("A", exploit));

        // within the limits, but results in an invalid regexp
        exploit = `[!(${"|".repeat(1024 * 15)}A`;
        assert.isNotOk(GlobExp.test("A", exploit));

        assert.throw(() => {
            // too long, throws TypeError
            exploit = `!(${"|".repeat(1024 * 64)}A)`;
            GlobExp.test("A", exploit);
        }, TypeError);
    });

    describe("tricky-negations", () => {
        const cases = {
            "bar.min.js": {
                "*.!(js|css)": true,
                "!*.+(js|css)": false,
                "*.+(js|css)": true
            },

            "a-integration-test.js": {
                "*.!(j)": true,
                "!(*-integration-test.js)": false,
                "*-!(integration-)test.js": true,
                "*-!(integration)-test.js": false,
                "*!(-integration)-test.js": true,
                "*!(-integration-)test.js": true,
                "*!(integration)-test.js": true,
                "*!(integration-test).js": true,
                "*-!(integration-test).js": true,
                "*-!(integration-test.js)": true,
                "*-!(integra)tion-test.js": false,
                "*-integr!(ation)-test.js": false,
                "*-integr!(ation-t)est.js": false,
                "*-i!(ntegration-)test.js": false,
                "*i!(ntegration-)test.js": true,
                "*te!(gration-te)st.js": true,
                "*-!(integration)?test.js": false,
                "*?!(integration)?test.js": true
            },

            "foo-integration-test.js": {
                "foo-integration-test.js": true,
                "!(*-integration-test.js)": false
            },

            "foo.jszzz.js": {
                "*.!(js).js": true
            },

            "asd.jss": {
                "*.!(js)": true
            },

            "asd.jss.xyz": {
                "*.!(js).!(xy)": true
            },

            "asd.jss.xy": {
                "*.!(js).!(xy)": false
            },

            "asd.js.xyz": {
                "*.!(js).!(xy)": false
            },

            "asd.js.xy": {
                "*.!(js).!(xy)": false
            },

            "asd.sjs.zxy": {
                "*.!(js).!(xy)": true
            },

            "asd..xyz": {
                "*.!(js).!(xy)": true
            },

            "asd..xy": {
                "*.!(js).!(xy)": false,
                "*.!(js|x).!(xy)": false
            },

            "foo.js.js": {
                "*.!(js)": true
            },

            "testjson.json": {
                "*(*.json|!(*.js))": true,
                "+(*.json|!(*.js))": true,
                "@(*.json|!(*.js))": true,
                "?(*.json|!(*.js))": true
            },

            "foojs.js": {
                "*(*.json|!(*.js))": false, // XXX bash 4.3 disagrees!
                "+(*.json|!(*.js))": false, // XXX bash 4.3 disagrees!
                "@(*.json|!(*.js))": false,
                "?(*.json|!(*.js))": false
            },

            "other.bar": {
                "*(*.json|!(*.js))": true,
                "+(*.json|!(*.js))": true,
                "@(*.json|!(*.js))": true,
                "?(*.json|!(*.js))": true
            }

        };

        const options = { nonegate: true };

        for (const c of Object.keys(cases)) {
            it(c, () => {
                for (const pattern of Object.keys(cases[c])) {
                    const res = cases[c][pattern];
                    const s = `${c} ${pattern}`;
                    assert.equal(GlobExp.test(c, pattern, options), res, s);
                }
            });
        }
    });

    describe("hasMagic", () => {
        it("non-string pattern should throw error", () => {
            const patterns = [0, null, 12, { x: 1 }, undefined, /x/, NaN];
            for (const p of patterns) {
                assert.throw(() => {
                    GlobExp.hasMagic(p);
                });
            }
        });

        it("detect magic in glob patterns", () => {
            assert.notOk(GlobExp.hasMagic(""), "no magic in ''");
            assert.notOk(GlobExp.hasMagic("a/b/c/"), "no magic a/b/c/");
            assert.ok(GlobExp.hasMagic("a/b/**/"), "magic in a/b/**/");
            assert.ok(GlobExp.hasMagic("a/b/?/"), "magic in a/b/?/");
            assert.ok(GlobExp.hasMagic("a/b/+(x|y)"), "magic in a/b/+(x|y)");
            assert.notOk(GlobExp.hasMagic("a/b/+(x|y)", { noext: true }), "no magic in a/b/+(x|y) noext");
            assert.ok(GlobExp.hasMagic("{a,b}"), "magic in {a,b}");
            assert.notOk(GlobExp.hasMagic("{a,b}", { nobrace: true }), "magic in {a,b} nobrace:true");
        });
    });
});
