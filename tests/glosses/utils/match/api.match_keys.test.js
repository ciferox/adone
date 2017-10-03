const mm = adone.util.match;

describe("util", "match", ".matchKeys()", () => {
    describe("error handling", () => {
        it("should throw when the first argument is not an object", () => {
            assert.throws(() => {
                mm.matchKeys();
            }, /expected the first argument to be an object/);

            assert.throws(() => {
                mm.matchKeys("foo");
            }, /expected the first argument to be an object/);

            assert.throws(() => {
                mm.matchKeys(["foo"]);
            }, /expected the first argument to be an object/);
        });
    });

    describe("match object keys", () => {
        it("should return a new object with only keys that match the given glob pattern", () => {
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, "*"), { a: "a", b: "b", c: "c" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, "a"), { a: "a" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, "[a-b]"), { a: "a", b: "b" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, "(a|c)"), { a: "a", c: "c" });
            assert.notDeepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, "a"), { b: "b" });
        });

        it("should return a new object with only keys that match a regex:", () => {
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, /.*/), { a: "a", b: "b", c: "c" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, /a/), { a: "a" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, /[a-b]/), { a: "a", b: "b" });
            assert.deepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, /(a|c)/), { a: "a", c: "c" });
            assert.notDeepEqual(mm.matchKeys({ a: "a", b: "b", c: "c" }, /a/), { b: "b" });
        });
    });
});
