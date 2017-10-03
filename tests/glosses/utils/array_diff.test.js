describe("util", "arrayDiff", () => {
    const { util: { arrayDiff } } = adone;

    it("should diff array", () => {
        assert.deepEqual(arrayDiff(["a", "b", "c"], ["b", "c", "e"]), ["a"]);
        assert.deepEqual(arrayDiff(["x", "b", "c", "e", "y"], ["b", "x", "e"]), ["c", "y"]);
        assert.deepEqual(arrayDiff(["x", "x"], ["a", "b", "c"]), ["x", "x"]);
        assert.deepEqual(arrayDiff(["x"], ["a", "b", "c"]), ["x"]);
        assert.deepEqual(arrayDiff(["x", "b", "b", "b", "c", "e", "y"], ["x", "e"]), ["b", "b", "b", "c", "y"]);
    });

    it("should remove all occurrences of an element", () => {
        assert.deepEqual(arrayDiff(["a", "b", "b", "b", "b"], ["b"]), ["a"]);
    });

    it("should not modify the input array", () => {
        const arr = ["x", "b", "b", "b", "c", "e", "y"];
        const init = arr.slice();
        arrayDiff(arr, ["x", "e"]);
        assert.deepEqual(arr, init);
    });

    it("should diff elements from multiple arrays", () => {
        assert.deepEqual(arrayDiff(["a", "b", "c"], ["a"], ["b"]), ["c"]);
    });

    it("should return an empty array if no unique elements are in the first array", () => {
        assert.deepEqual(arrayDiff(["a"], ["a", "b", "c"]), []);
    });

    it("should return the first array if the second array is empty", () => {
        assert.deepEqual(arrayDiff(["a", "b", "c"], []), ["a", "b", "c"]);
    });

    it("should return the first array if no other args are passed", () => {
        assert.deepEqual(arrayDiff(["a", "b", "c"]), ["a", "b", "c"]);
    });

    it("should iterate over sparse arguments", () => {
        assert.deepEqual(arrayDiff(["a", "b", "c"], null, ["a", "b"]), ["c"]);
    });
});
