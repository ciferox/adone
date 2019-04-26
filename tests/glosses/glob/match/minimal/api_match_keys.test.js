const { glob: { match: { minimal: nm } } } = adone;

describe("glob", "match", "minimal", ".matchKeys method", () => {
    describe("error handling", () => {
        it("should throw when the first argument is not an object", () => {
            assert.throws(() => {
                nm.matchKeys();
            });

            assert.throws(() => {
                nm.matchKeys("foo");
            });

            assert.throws(() => {
                nm.matchKeys(["foo"]);
            });
        });
    });

    describe("match object keys", () => {
        it("should return a new object with only keys that match the given glob pattern", () => {
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, "*"), { a: "a", b: "b", c: "c" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, "a"), { a: "a" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, "[a-b]"), { a: "a", b: "b" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, "(a|c)"), { a: "a", c: "c" });
            assert.notDeepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, "a"), { b: "b" });
        });

        it("should return a new object with only keys that match a regex:", () => {
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, /.*/), { a: "a", b: "b", c: "c" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, /a/), { a: "a" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, /[a-b]/), { a: "a", b: "b" });
            assert.deepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, /(a|c)/), { a: "a", c: "c" });
            assert.notDeepEqual(nm.matchKeys({ a: "a", b: "b", c: "c" }, /a/), { b: "b" });
        });
    });
});
