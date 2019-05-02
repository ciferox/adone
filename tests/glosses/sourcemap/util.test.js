const libUtil = require(adone.path.join(adone.ROOT_PATH, "lib", "glosses", "sourcemap", "util"));

describe("util", () => {
    it("test normalize()", () => {
        assert.equal(libUtil.normalize("/.."), "/");
        assert.equal(libUtil.normalize("/../"), "/");
        assert.equal(libUtil.normalize("/../../../.."), "/");
        assert.equal(libUtil.normalize("/../../../../a/b/c"), "/a/b/c");
        assert.equal(libUtil.normalize("/a/b/c/../../../d/../../e"), "/e");

        assert.equal(libUtil.normalize(".."), "../");
        assert.equal(libUtil.normalize("../"), "../");

        assert.equal(libUtil.normalize("../../a/"), "../../a/");
        assert.equal(libUtil.normalize("a/.."), "");
        assert.equal(libUtil.normalize("a/../../.."), "../../");

        assert.equal(libUtil.normalize("/."), "/");
        assert.equal(libUtil.normalize("/./"), "/");
        assert.equal(libUtil.normalize("/./././."), "/");
        assert.equal(libUtil.normalize("/././././a/b/c"), "/a/b/c");
        assert.equal(libUtil.normalize("/a/b/c/./././d/././e"), "/a/b/c/d/e");

        assert.equal(libUtil.normalize(""), "");
        assert.equal(libUtil.normalize("."), "");
        assert.equal(libUtil.normalize("./"), "");
        assert.equal(libUtil.normalize("././a"), "a");
        assert.equal(libUtil.normalize("a/./"), "a/");
        assert.equal(libUtil.normalize("a/././."), "a/");

        assert.equal(libUtil.normalize("/a/b//c////d/////"), "/a/b//c////d/////");

        assert.equal(libUtil.normalize("///a/b//c////d/////"), "//a/b//c////d/////");
        assert.equal(libUtil.normalize("a/b//c////d"), "a/b//c////d");

        assert.equal(libUtil.normalize(".///.././../a/b//./.."), "a/b/");

        assert.equal(libUtil.normalize("http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.normalize("http://www.example.com/"), "http://www.example.com/");
        assert.equal(libUtil.normalize("http://www.example.com/./..//a/b/c/.././d//"), "http://www.example.com//a/b/d//");
    });

    it("test join()", () => {
        assert.equal(libUtil.join("a", "b"), "a/b");
        assert.equal(libUtil.join("a/", "b"), "a/b");
        assert.equal(libUtil.join("a//", "b"), "a//b");
        assert.equal(libUtil.join("a", "b/"), "a/b/");
        assert.equal(libUtil.join("a", "b//"), "a/b//");
        assert.equal(libUtil.join("a/", "/b"), "/b");
        assert.equal(libUtil.join("a//", "//b"), "//b/");

        assert.equal(libUtil.join("a", ".."), "");
        assert.equal(libUtil.join("a", "../b"), "b");
        assert.equal(libUtil.join("a/b", "../c"), "a/c");

        assert.equal(libUtil.join("a", "."), "a/");
        assert.equal(libUtil.join("a", "./b"), "a/b");
        assert.equal(libUtil.join("a/b", "./c"), "a/b/c");

        assert.equal(libUtil.join("a", "http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.join("a", "data:foo,bar"), "data:foo,bar");


        assert.equal(libUtil.join("", "b"), "b");
        assert.equal(libUtil.join(".", "b"), "b");
        assert.equal(libUtil.join("", "b/"), "b/");
        assert.equal(libUtil.join(".", "b/"), "b/");
        assert.equal(libUtil.join("", "b//"), "b//");
        assert.equal(libUtil.join(".", "b//"), "b//");

        assert.equal(libUtil.join("", ".."), "../");
        assert.equal(libUtil.join(".", ".."), "../");
        assert.equal(libUtil.join("", "../b"), "../b");
        assert.equal(libUtil.join(".", "../b"), "../b");

        assert.equal(libUtil.join("", "."), "");
        assert.equal(libUtil.join(".", "."), "");
        assert.equal(libUtil.join("", "./b"), "b");
        assert.equal(libUtil.join(".", "./b"), "b");

        assert.equal(libUtil.join("", "http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.join(".", "http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.join("", "data:foo,bar"), "data:foo,bar");
        assert.equal(libUtil.join(".", "data:foo,bar"), "data:foo,bar");


        assert.equal(libUtil.join("..", "b"), "../b");
        assert.equal(libUtil.join("..", "b/"), "../b/");
        assert.equal(libUtil.join("..", "b//"), "../b//");

        assert.equal(libUtil.join("..", ".."), "../../");
        assert.equal(libUtil.join("..", "../b"), "../../b");

        assert.equal(libUtil.join("..", "."), "../");
        assert.equal(libUtil.join("..", "./b"), "../b");

        assert.equal(libUtil.join("..", "http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.join("..", "data:foo,bar"), "data:foo,bar");


        assert.equal(libUtil.join("a", ""), "a/");
        assert.equal(libUtil.join("a", "."), "a/");
        assert.equal(libUtil.join("a/", ""), "a/");
        assert.equal(libUtil.join("a/", "."), "a/");
        assert.equal(libUtil.join("a//", ""), "a//");
        assert.equal(libUtil.join("a//", "."), "a//");
        assert.equal(libUtil.join("/a", ""), "/a/");
        assert.equal(libUtil.join("/a", "."), "/a/");
        assert.equal(libUtil.join("", ""), "");
        assert.equal(libUtil.join(".", ""), "");
        assert.equal(libUtil.join(".", ""), "");
        assert.equal(libUtil.join(".", "."), "");
        assert.equal(libUtil.join("..", ""), "../");
        assert.equal(libUtil.join("..", "."), "../");
        assert.equal(libUtil.join("http://foo.org/a", ""), "http://foo.org/a/");
        assert.equal(libUtil.join("http://foo.org/a", "."), "http://foo.org/a/");
        assert.equal(libUtil.join("http://foo.org/a/", ""), "http://foo.org/a/");
        assert.equal(libUtil.join("http://foo.org/a/", "."), "http://foo.org/a/");
        assert.equal(libUtil.join("http://foo.org/a//", ""), "http://foo.org/a//");
        assert.equal(libUtil.join("http://foo.org/a//", "."), "http://foo.org/a//");
        assert.equal(libUtil.join("http://foo.org", ""), "http://foo.org/");
        assert.equal(libUtil.join("http://foo.org", "."), "http://foo.org/");
        assert.equal(libUtil.join("http://foo.org/", ""), "http://foo.org/");
        assert.equal(libUtil.join("http://foo.org/", "."), "http://foo.org/");
        assert.equal(libUtil.join("http://foo.org//", ""), "http://foo.org//");
        assert.equal(libUtil.join("http://foo.org//", "."), "http://foo.org//");
        assert.equal(libUtil.join("//www.example.com", ""), "//www.example.com/");
        assert.equal(libUtil.join("//www.example.com", "."), "//www.example.com/");


        assert.equal(libUtil.join("http://foo.org/a", "b"), "http://foo.org/a/b");
        assert.equal(libUtil.join("http://foo.org/a/", "b"), "http://foo.org/a/b");
        assert.equal(libUtil.join("http://foo.org/a//", "b"), "http://foo.org/a//b");
        assert.equal(libUtil.join("http://foo.org/a", "b/"), "http://foo.org/a/b/");
        assert.equal(libUtil.join("http://foo.org/a", "b//"), "http://foo.org/a/b//");
        assert.equal(libUtil.join("http://foo.org/a/", "/b"), "http://foo.org/b");
        assert.equal(libUtil.join("http://foo.org/a//", "//b"), "http://b/");

        assert.equal(libUtil.join("http://foo.org/a", ".."), "http://foo.org/");
        assert.equal(libUtil.join("http://foo.org/a", "../b"), "http://foo.org/b");
        assert.equal(libUtil.join("http://foo.org/a/b", "../c"), "http://foo.org/a/c");

        assert.equal(libUtil.join("http://foo.org/a", "."), "http://foo.org/a/");
        assert.equal(libUtil.join("http://foo.org/a", "./b"), "http://foo.org/a/b");
        assert.equal(libUtil.join("http://foo.org/a/b", "./c"), "http://foo.org/a/b/c");

        assert.equal(libUtil.join("http://foo.org/a", "http://www.example.com"), "http://www.example.com/");
        assert.equal(libUtil.join("http://foo.org/a", "data:foo,bar"), "data:foo,bar");


        assert.equal(libUtil.join("http://foo.org", "a"), "http://foo.org/a");
        assert.equal(libUtil.join("http://foo.org/", "a"), "http://foo.org/a");
        assert.equal(libUtil.join("http://foo.org//", "a"), "http://foo.org//a");
        assert.equal(libUtil.join("http://foo.org", "/a"), "http://foo.org/a");
        assert.equal(libUtil.join("http://foo.org/", "/a"), "http://foo.org/a");
        assert.equal(libUtil.join("http://foo.org//", "/a"), "http://foo.org/a");

        assert.equal(libUtil.join("http://www.example.com", "//foo.org/bar"), "http://foo.org/bar");
        assert.equal(libUtil.join("//www.example.com", "//foo.org/bar"), "//foo.org/bar");
    });

    // TODO Issue #128: Define and test this function properly.
    it("test relative()", () => {
        assert.equal(libUtil.relative("/the/root", "/the/root/one.js"), "one.js");
        assert.equal(libUtil.relative("http://the/root", "http://the/root/one.js"), "one.js");
        assert.equal(libUtil.relative("/the/root", "/the/rootone.js"), "../rootone.js");
        assert.equal(libUtil.relative("http://the/root", "http://the/rootone.js"), "../rootone.js");
        assert.equal(libUtil.relative("/the/root", "/therootone.js"), "../../therootone.js");
        assert.equal(libUtil.relative("http://the/root", "/therootone.js"), "/therootone.js");

        assert.equal(libUtil.relative("", "/the/root/one.js"), "/the/root/one.js");
        assert.equal(libUtil.relative(".", "/the/root/one.js"), "/the/root/one.js");
        assert.equal(libUtil.relative("", "the/root/one.js"), "the/root/one.js");
        assert.equal(libUtil.relative(".", "the/root/one.js"), "the/root/one.js");

        assert.equal(libUtil.relative("/", "/the/root/one.js"), "the/root/one.js");
        assert.equal(libUtil.relative("/", "the/root/one.js"), "the/root/one.js");
    });

    it("test computeSourceURL", () => {
        // Tests with sourceMapURL.
        assert.equal(libUtil.computeSourceURL("", "src/test.js", "http://example.com"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL(undefined, "src/test.js", "http://example.com"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("src", "test.js", "http://example.com"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("src/", "test.js", "http://example.com"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("src", "/test.js", "http://example.com"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("http://mozilla.com", "src/test.js", "http://example.com"),
            "http://mozilla.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("", "test.js", "http://example.com/src/test.js.map"),
            "http://example.com/src/test.js");
        assert.equal(libUtil.computeSourceURL("", "/test.js", "http://example.com/src/test.js.map"),
            "http://example.com/test.js");

        // Legacy code won't pass in the sourceMapURL.
        assert.equal(libUtil.computeSourceURL("", "src/test.js"), "src/test.js");
        assert.equal(libUtil.computeSourceURL(undefined, "src/test.js"), "src/test.js");
        assert.equal(libUtil.computeSourceURL("src", "test.js"), "src/test.js");
        assert.equal(libUtil.computeSourceURL("src/", "test.js"), "src/test.js");
        assert.equal(libUtil.computeSourceURL("src", "/test.js"), "src/test.js");
        assert.equal(libUtil.computeSourceURL("src", "../test.js"), "test.js");
        assert.equal(libUtil.computeSourceURL("src/dir", "../././../test.js"), "test.js");

        // This gives different results with the old algorithm and the new
        // spec-compliant algorithm.
        assert.equal(libUtil.computeSourceURL("http://example.com/dir", "/test.js"),
            "http://example.com/dir/test.js");
    });
});
