const { glob: { match: { minimal: { capture } } } } = adone;

describe("glob", "match", "minimal", ".capture()", () => {
    it("should return null if no match", () => {
        assert.equal(capture("test/*", "hi/123"), null);
    });

    it("should return an empty array if there are no captures", () => {
        assert.deepEqual(capture("test/hi", "test/hi"), []);
    });

    it("should capture stars", () => {
        assert.deepEqual(capture("test/*", "test/foo"), ["foo"]);
        assert.deepEqual(capture("test/*/bar", "test/foo/bar"), ["foo"]);
        assert.deepEqual(capture("test/*/bar/*", "test/foo/bar/baz"), ["foo", "baz"]);
        assert.deepEqual(capture("test/*.js", "test/foo.js"), ["foo"]);
        assert.deepEqual(capture("test/*-controller.js", "test/foo-controller.js"), ["foo"]);
    });

    it("should capture globstars", () => {
        assert.deepEqual(capture("test/**/*.js", "test/a.js"), ["", "a"]);
        assert.deepEqual(capture("test/**/*.js", "test/dir/a.js"), ["dir", "a"]);
        assert.deepEqual(capture("test/**/*.js", "test/dir/test/a.js"), ["dir/test", "a"]);
    });
});
