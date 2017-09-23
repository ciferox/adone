describe("collection", "ArraySet", () => {
    const { collection: { ArraySet } } = adone;

    const makeTestSet = () => {
        const set = new ArraySet();
        for (let i = 0; i < 100; i++) {
            set.add(String(i));
        }
        return set;
    };

    it("test .has() membership", () => {
        const set = makeTestSet();
        for (let i = 0; i < 100; i++) {
            assert.ok(set.has(String(i)));
        }
    });

    it("test .at() indexing", () => {
        const set = makeTestSet();
        for (let i = 0; i < 100; i++) {
            assert.strictEqual(set.indexOf(String(i)), i);
        }
    });

    it("test .at() indexing", () => {
        const set = makeTestSet();
        for (let i = 0; i < 100; i++) {
            assert.strictEqual(set.at(i), String(i));
        }
    });

    it("test creating from an array", () => {
        const set = ArraySet.from(["foo", "bar", "baz", "quux", "hasOwnProperty"]);

        assert.ok(set.has("foo"));
        assert.ok(set.has("bar"));
        assert.ok(set.has("baz"));
        assert.ok(set.has("quux"));
        assert.ok(set.has("hasOwnProperty"));

        assert.strictEqual(set.indexOf("foo"), 0);
        assert.strictEqual(set.indexOf("bar"), 1);
        assert.strictEqual(set.indexOf("baz"), 2);
        assert.strictEqual(set.indexOf("quux"), 3);

        assert.strictEqual(set.at(0), "foo");
        assert.strictEqual(set.at(1), "bar");
        assert.strictEqual(set.at(2), "baz");
        assert.strictEqual(set.at(3), "quux");
    });

    it("test that you can add __proto__; see github issue #30", () => {
        const set = new ArraySet();
        set.add("__proto__");
        assert.ok(set.has("__proto__"));
        assert.strictEqual(set.at(0), "__proto__");
        assert.strictEqual(set.indexOf("__proto__"), 0);
    });

    it("test .from() with duplicates", () => {
        let set = ArraySet.from(["foo", "foo"]);
        assert.ok(set.has("foo"));
        assert.strictEqual(set.at(0), "foo");
        assert.strictEqual(set.indexOf("foo"), 0);
        assert.strictEqual(set.toArray().length, 1);

        set = ArraySet.from(["foo", "foo"], true);
        assert.ok(set.has("foo"));
        assert.strictEqual(set.at(0), "foo");
        assert.strictEqual(set.at(1), "foo");
        assert.strictEqual(set.indexOf("foo"), 0);
        assert.strictEqual(set.toArray().length, 2);
    });

    it("test .add() with duplicates", () => {
        const set = new ArraySet();
        set.add("foo");

        set.add("foo");
        assert.ok(set.has("foo"));
        assert.strictEqual(set.at(0), "foo");
        assert.strictEqual(set.indexOf("foo"), 0);
        assert.strictEqual(set.toArray().length, 1);

        set.add("foo", true);
        assert.ok(set.has("foo"));
        assert.strictEqual(set.at(0), "foo");
        assert.strictEqual(set.at(1), "foo");
        assert.strictEqual(set.indexOf("foo"), 0);
        assert.strictEqual(set.toArray().length, 2);
    });

    it("test .length", () => {
        const set = new ArraySet();
        set.add("foo");
        set.add("bar");
        set.add("baz");
        assert.strictEqual(set.length, 3);
    });

    it("test .length with disallowed duplicates", () => {
        const set = new ArraySet();

        set.add("foo");
        set.add("foo");

        set.add("bar");
        set.add("bar");

        set.add("baz");
        set.add("baz");

        assert.strictEqual(set.length, 3);
    });

    it("test .length with allowed duplicates", () => {
        const set = new ArraySet();

        set.add("foo");
        set.add("foo", true);

        set.add("bar");
        set.add("bar", true);

        set.add("baz");
        set.add("baz", true);

        assert.strictEqual(set.length, 3);
    });

    describe("indexOf", () => {
        it("should return an index of an element", () => {
            const set = ArraySet.from([1, 2, 3, 4, 5]);
            expect(set.indexOf(3)).to.be.equal(2);
        });

        it("should return -1 if an element is not present", () => {
            const set = ArraySet.from([1, 2, 3, 4, 5]);
            expect(set.indexOf({})).to.be.equal(-1);
        });
    });
});
