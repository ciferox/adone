describe("glosses", "sourcemap", "util", () => {
    const { sourcemap: { util } } = adone;

    specify("urls", () => {
        const assertUrl = function (url) {
            assert.equal(url, util.urlGenerate(util.urlParse(url)));
        };
        assertUrl("http://");
        assertUrl("http://www.example.com");
        assertUrl("http://user:pass@www.example.com");
        assertUrl("http://www.example.com:80");
        assertUrl("http://www.example.com/");
        assertUrl("http://www.example.com/foo/bar");
        assertUrl("http://www.example.com/foo/bar/");
        assertUrl("http://user:pass@www.example.com:80/foo/bar/");

        assertUrl("//");
        assertUrl("//www.example.com");
        assertUrl("file:///www.example.com");

        assert.equal(util.urlParse(""), null);
        assert.equal(util.urlParse("."), null);
        assert.equal(util.urlParse(".."), null);
        assert.equal(util.urlParse("a"), null);
        assert.equal(util.urlParse("a/b"), null);
        assert.equal(util.urlParse("a//b"), null);
        assert.equal(util.urlParse("/a"), null);
        assert.equal(util.urlParse("data:foo,bar"), null);
    });

    specify("normalize()", () => {
        assert.equal(util.normalize("/.."), "/");
        assert.equal(util.normalize("/../"), "/");
        assert.equal(util.normalize("/../../../.."), "/");
        assert.equal(util.normalize("/../../../../a/b/c"), "/a/b/c");
        assert.equal(util.normalize("/a/b/c/../../../d/../../e"), "/e");

        assert.equal(util.normalize(".."), "..");
        assert.equal(util.normalize("../"), "../");
        assert.equal(util.normalize("../../a/"), "../../a/");
        assert.equal(util.normalize("a/.."), ".");
        assert.equal(util.normalize("a/../../.."), "../..");

        assert.equal(util.normalize("/."), "/");
        assert.equal(util.normalize("/./"), "/");
        assert.equal(util.normalize("/./././."), "/");
        assert.equal(util.normalize("/././././a/b/c"), "/a/b/c");
        assert.equal(util.normalize("/a/b/c/./././d/././e"), "/a/b/c/d/e");

        assert.equal(util.normalize(""), ".");
        assert.equal(util.normalize("."), ".");
        assert.equal(util.normalize("./"), ".");
        assert.equal(util.normalize("././a"), "a");
        assert.equal(util.normalize("a/./"), "a/");
        assert.equal(util.normalize("a/././."), "a");

        assert.equal(util.normalize("/a/b//c////d/////"), "/a/b/c/d/");
        assert.equal(util.normalize("///a/b//c////d/////"), "///a/b/c/d/");
        assert.equal(util.normalize("a/b//c////d"), "a/b/c/d");

        assert.equal(util.normalize(".///.././../a/b//./.."), "../../a");

        assert.equal(util.normalize("http://www.example.com"), "http://www.example.com");
        assert.equal(util.normalize("http://www.example.com/"), "http://www.example.com/");
        assert.equal(util.normalize("http://www.example.com/./..//a/b/c/.././d//"), "http://www.example.com/a/b/d/");
    });

    specify("join()", () => {
        assert.equal(util.join("a", "b"), "a/b");
        assert.equal(util.join("a/", "b"), "a/b");
        assert.equal(util.join("a//", "b"), "a/b");
        assert.equal(util.join("a", "b/"), "a/b/");
        assert.equal(util.join("a", "b//"), "a/b/");
        assert.equal(util.join("a/", "/b"), "/b");
        assert.equal(util.join("a//", "//b"), "//b");

        assert.equal(util.join("a", ".."), ".");
        assert.equal(util.join("a", "../b"), "b");
        assert.equal(util.join("a/b", "../c"), "a/c");

        assert.equal(util.join("a", "."), "a");
        assert.equal(util.join("a", "./b"), "a/b");
        assert.equal(util.join("a/b", "./c"), "a/b/c");

        assert.equal(util.join("a", "http://www.example.com"), "http://www.example.com");
        assert.equal(util.join("a", "data:foo,bar"), "data:foo,bar");


        assert.equal(util.join("", "b"), "b");
        assert.equal(util.join(".", "b"), "b");
        assert.equal(util.join("", "b/"), "b/");
        assert.equal(util.join(".", "b/"), "b/");
        assert.equal(util.join("", "b//"), "b/");
        assert.equal(util.join(".", "b//"), "b/");

        assert.equal(util.join("", ".."), "..");
        assert.equal(util.join(".", ".."), "..");
        assert.equal(util.join("", "../b"), "../b");
        assert.equal(util.join(".", "../b"), "../b");

        assert.equal(util.join("", "."), ".");
        assert.equal(util.join(".", "."), ".");
        assert.equal(util.join("", "./b"), "b");
        assert.equal(util.join(".", "./b"), "b");

        assert.equal(util.join("", "http://www.example.com"), "http://www.example.com");
        assert.equal(util.join(".", "http://www.example.com"), "http://www.example.com");
        assert.equal(util.join("", "data:foo,bar"), "data:foo,bar");
        assert.equal(util.join(".", "data:foo,bar"), "data:foo,bar");


        assert.equal(util.join("..", "b"), "../b");
        assert.equal(util.join("..", "b/"), "../b/");
        assert.equal(util.join("..", "b//"), "../b/");

        assert.equal(util.join("..", ".."), "../..");
        assert.equal(util.join("..", "../b"), "../../b");

        assert.equal(util.join("..", "."), "..");
        assert.equal(util.join("..", "./b"), "../b");

        assert.equal(util.join("..", "http://www.example.com"), "http://www.example.com");
        assert.equal(util.join("..", "data:foo,bar"), "data:foo,bar");


        assert.equal(util.join("a", ""), "a");
        assert.equal(util.join("a", "."), "a");
        assert.equal(util.join("a/", ""), "a");
        assert.equal(util.join("a/", "."), "a");
        assert.equal(util.join("a//", ""), "a");
        assert.equal(util.join("a//", "."), "a");
        assert.equal(util.join("/a", ""), "/a");
        assert.equal(util.join("/a", "."), "/a");
        assert.equal(util.join("", ""), ".");
        assert.equal(util.join(".", ""), ".");
        assert.equal(util.join(".", ""), ".");
        assert.equal(util.join(".", "."), ".");
        assert.equal(util.join("..", ""), "..");
        assert.equal(util.join("..", "."), "..");
        assert.equal(util.join("http://foo.org/a", ""), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a", "."), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a/", ""), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a/", "."), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a//", ""), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a//", "."), "http://foo.org/a");
        assert.equal(util.join("http://foo.org", ""), "http://foo.org/");
        assert.equal(util.join("http://foo.org", "."), "http://foo.org/");
        assert.equal(util.join("http://foo.org/", ""), "http://foo.org/");
        assert.equal(util.join("http://foo.org/", "."), "http://foo.org/");
        assert.equal(util.join("http://foo.org//", ""), "http://foo.org/");
        assert.equal(util.join("http://foo.org//", "."), "http://foo.org/");
        assert.equal(util.join("//www.example.com", ""), "//www.example.com/");
        assert.equal(util.join("//www.example.com", "."), "//www.example.com/");


        assert.equal(util.join("http://foo.org/a", "b"), "http://foo.org/a/b");
        assert.equal(util.join("http://foo.org/a/", "b"), "http://foo.org/a/b");
        assert.equal(util.join("http://foo.org/a//", "b"), "http://foo.org/a/b");
        assert.equal(util.join("http://foo.org/a", "b/"), "http://foo.org/a/b/");
        assert.equal(util.join("http://foo.org/a", "b//"), "http://foo.org/a/b/");
        assert.equal(util.join("http://foo.org/a/", "/b"), "http://foo.org/b");
        assert.equal(util.join("http://foo.org/a//", "//b"), "http://b");

        assert.equal(util.join("http://foo.org/a", ".."), "http://foo.org/");
        assert.equal(util.join("http://foo.org/a", "../b"), "http://foo.org/b");
        assert.equal(util.join("http://foo.org/a/b", "../c"), "http://foo.org/a/c");

        assert.equal(util.join("http://foo.org/a", "."), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/a", "./b"), "http://foo.org/a/b");
        assert.equal(util.join("http://foo.org/a/b", "./c"), "http://foo.org/a/b/c");

        assert.equal(util.join("http://foo.org/a", "http://www.example.com"), "http://www.example.com");
        assert.equal(util.join("http://foo.org/a", "data:foo,bar"), "data:foo,bar");


        assert.equal(util.join("http://foo.org", "a"), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/", "a"), "http://foo.org/a");
        assert.equal(util.join("http://foo.org//", "a"), "http://foo.org/a");
        assert.equal(util.join("http://foo.org", "/a"), "http://foo.org/a");
        assert.equal(util.join("http://foo.org/", "/a"), "http://foo.org/a");
        assert.equal(util.join("http://foo.org//", "/a"), "http://foo.org/a");


        assert.equal(util.join("http://", "www.example.com"), "http://www.example.com");
        assert.equal(util.join("file:///", "www.example.com"), "file:///www.example.com");
        assert.equal(util.join("http://", "ftp://example.com"), "ftp://example.com");

        assert.equal(util.join("http://www.example.com", "//foo.org/bar"), "http://foo.org/bar");
        assert.equal(util.join("//www.example.com", "//foo.org/bar"), "//foo.org/bar");
    });

    // TODO Issue #128: Define and test this function properly.
    specify("relative()", () => {
        assert.equal(util.relative("/the/root", "/the/root/one.js"), "one.js");
        assert.equal(util.relative("http://the/root", "http://the/root/one.js"), "one.js");
        assert.equal(util.relative("/the/root", "/the/rootone.js"), "../rootone.js");
        assert.equal(util.relative("http://the/root", "http://the/rootone.js"), "../rootone.js");
        assert.equal(util.relative("/the/root", "/therootone.js"), "/therootone.js");
        assert.equal(util.relative("http://the/root", "/therootone.js"), "/therootone.js");

        assert.equal(util.relative("", "/the/root/one.js"), "/the/root/one.js");
        assert.equal(util.relative(".", "/the/root/one.js"), "/the/root/one.js");
        assert.equal(util.relative("", "the/root/one.js"), "the/root/one.js");
        assert.equal(util.relative(".", "the/root/one.js"), "the/root/one.js");

        assert.equal(util.relative("/", "/the/root/one.js"), "the/root/one.js");
        assert.equal(util.relative("/", "the/root/one.js"), "the/root/one.js");
    });

    context("search", () => {
        const { util: { binarySearch } } = adone;
        const { search } = util;
        const numberCompare = (a, b) => a - b;

        specify("too high with default (glb) bias", () => {
            const needle = 30;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.doesNotThrow(() => {
                search(haystack, needle, numberCompare);
            });

            assert.equal(haystack[search(haystack, needle, numberCompare)], 20);
        });

        specify("too low with default (glb) bias", () => {
            const needle = 1;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.doesNotThrow(() => {
                search(haystack, needle, numberCompare);
            });

            assert.equal(search(haystack, needle, numberCompare), -1);
        });

        specify("too high with lub bias", () => {
            const needle = 30;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.doesNotThrow(() => {
                search(haystack, needle, numberCompare);
            });

            assert.equal(search(haystack, needle, numberCompare,
                binarySearch.LEAST_UPPER_BOUND), -1);
        });

        specify("too low with lub bias", () => {
            const needle = 1;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.doesNotThrow(() => {
                search(haystack, needle, numberCompare);
            });

            assert.equal(haystack[search(haystack, needle, numberCompare,
                binarySearch.LEAST_UPPER_BOUND)], 2);
        });

        specify("exact search", () => {
            const needle = 4;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.equal(haystack[search(haystack, needle, numberCompare)], 4);
        });

        specify("fuzzy search with default (glb) bias", () => {
            const needle = 19;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.equal(haystack[search(haystack, needle, numberCompare)], 18);
        });

        specify("fuzzy search with lub bias", () => {
            const needle = 19;
            const haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

            assert.equal(haystack[search(haystack, needle, numberCompare,
                binarySearch.LEAST_UPPER_BOUND)], 20);
        });

        specify("multiple matches", () => {
            const needle = 5;
            const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

            assert.equal(search(haystack, needle, numberCompare,
                binarySearch.LEAST_UPPER_BOUND), 3);
        });

        specify("multiple matches at the beginning", () => {
            const needle = 1;
            const haystack = [1, 1, 2, 5, 5, 5, 13, 21];

            assert.equal(search(haystack, needle, numberCompare,
                binarySearch.LEAST_UPPER_BOUND), 0);
        });
    });
});
