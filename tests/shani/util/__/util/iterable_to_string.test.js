describe("shani", "util", "__", "util", "iterableToString", () => {
    const { iterableToString } = adone.shani.util.__.util;

    it("returns an String representation of Array objects", () => {
        const arr = [1, "one", true, undefined, null];
        const expected = "1,'one',true,undefined,null";

        assert.equal(iterableToString(arr), expected);
    });

    it("returns an String representation of Map objects", () => {
        const map = new Map();
        map.set(1, 1);
        map.set("one", "one");
        map.set(true, true);
        map.set(undefined, undefined);
        map.set(null, null);
        const expected = "[1,1]," +
            "['one','one']," +
            "[true,true]," +
            "[undefined,undefined]," +
            "[null,null]";

        assert.equal(iterableToString(map), expected);
    });

    it("returns an String representation of Set objects", () => {
        const set = new Set();
        set.add(1);
        set.add("one");
        set.add(true);
        set.add(undefined);
        set.add(null);

        const expected = "1,'one',true,undefined,null";

        assert.equal(iterableToString(set), expected);
    });
});
