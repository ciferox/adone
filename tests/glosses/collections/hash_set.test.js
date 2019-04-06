// Tests adapted from: https://github.com/blond/hash-set

const {
    collection: { HashSet }
} = adone;

describe("collection", "HashSet", () => {
    it("should create empty set", () => {
        const set = new HashSet();

        assert.deepEqual(Array.from(set), []);
    });

    it("should create set with array items", () => {
        const arr = [1, 2, 3];
        const set = new HashSet(arr);

        assert.deepEqual(Array.from(set), arr);
    });

    it("should create set with iterable items", () => {
        const iterable = (new Set([1, 2, 3])).values();
        const set = new HashSet(iterable);

        assert.deepEqual(Array.from(set), Array.from([1, 2, 3]));
    });

    it("should add value", () => {
        const set = new HashSet();

        set.add(1);

        assert.deepEqual(Array.from(set), [1]);
    });

    it("should not add existing value", () => {
        const set = new HashSet();

        set.add(1);
        set.add(1);

        assert.deepEqual(Array.from(set), [1]);
    });

    it("should support chains", () => {
        const set = new HashSet();

        set
            .add(1)
            .add(2);

        assert.deepEqual(Array.from(set), [1, 2]);
    });

    it("should return `true` if value not exist", () => {
        const set = new HashSet([1, 2]);

        assert.isTrue(set.has(2));
    });

    it("should return `false` if value exist", () => {
        const set = new HashSet([1, 2]);

        assert.isFalse(set.has(3));
    });

    it("should delete existing value", () => {
        const set = new HashSet();

        set.add(1);
        set.add(2);

        set.delete(1);

        assert.deepEqual(Array.from(set), [2]);
    });

    it("should not throw if deleted value is not exist", () => {
        const set = new HashSet();

        set.delete(1);

        assert.deepEqual(Array.from(set), []);
    });

    it("should not change empty set", () => {
        const set = new HashSet();

        set.clear();

        assert.equal(set.size, 0);
    });

    it("should clear set", () => {
        const set = new HashSet();

        set.add(1);
        set.clear();

        assert.equal(set.size, 0);
    });

    it("should be iterable", () => {
        const set = new HashSet([1, 2]);
        const arr = [];

        for (const v of set) {
            arr.push(v);
        }

        assert.deepEqual(arr, [1, 2]);
    });

    it("forEach()", () => {
        const set = new HashSet([1, 2]);
        const arr = [];

        set.forEach((v) => arr.push(v));

        assert.deepEqual(arr, [1, 2]);
    });

    it("entries()", () => {
        const set = new HashSet([1, 2]);

        assert.deepEqual(Array.from(set.entries()), [1, 2]);
    });

    it("keys()", () => {
        const set = new HashSet([1, 2]);

        assert.deepEqual(Array.from(set.keys()), [1, 2]);
    });

    it("values()", () => {
        const set = new HashSet([1, 2]);

        assert.deepEqual(Array.from(set.values()), [1, 2]);
    });

    it("should mimic `toString()` method", () => {
        const originSet = new Set();
        const mySet = new HashSet();

        assert.equal(mySet.toString(), originSet.toString());
    });

    it("should return original Set with `valueOf()` method", () => {
        const originSet = new Set([1, 2, 3]);
        const mySet = new HashSet([1, 2, 3]);

        assert.deepEqual(mySet.valueOf(), originSet);
    });

    describe("forEach", () => {
        it("should iterates over all items", () => {
            const origItems = [0, 1, 2, 3];
            const set = new HashSet(origItems, (x) => x - 1);
            const resultItems = [];

            set.forEach((item) => resultItems.push(item));

            assert.deepEqual(origItems, resultItems);
        });

        it("should pass context", () => {
            const set = new HashSet([1], (x) => x - 1);
            const context = {};

            set.forEach(function () {
                assert.strictEqual(this, context);
                assert.notStrictEqual(this, {});
            }, context);
        });

        it("should pass correct arguments", () => {
            const set = new HashSet([1], (x) => x - 1);
            const context = {};

            set.forEach((item, key, set_) => {
                assert.equal(item, 1);
                assert.equal(key, 0);
                assert.equal(set, set_);
            }, context);
        });

        it("should not runs on empty set", () => {
            const set = new HashSet(null, (x) => x - 1);
            let runsCount = 0;
            const spy = () => ++runsCount;
            set.forEach(spy);

            assert.equal(runsCount, 0);
        });
    });

    describe("custom hash function", () => {
        const hashFn = (animal) => {
            switch (animal) {
                case "cat": return "cat";
                case "kitty": return "cat";

                case "dog": return "dog";
                case "puppy": return "dog";
            }
        };

        it("should add value but not hash", () => {
            const set = new HashSet(null, hashFn);

            set.add("kitty");

            assert.deepEqual(Array.from(set), ["kitty"]);
        });

        it("should add values with different hash", () => {
            const set = new HashSet(null, hashFn);

            set.add("kitty");
            set.add("puppy");

            assert.deepEqual(Array.from(set), ["kitty", "puppy"]);
        });

        it("should not add value if other value with same hash", () => {
            const set = new HashSet(null, hashFn);

            set.add("cat");
            set.add("kitty");

            assert.deepEqual(Array.from(set), ["cat"]);
        });
    });
});
