const {
    net: { spdy: transport }
} = adone;

const utils = transport.utils;

describe("utils", () => {
    function compare(a, b) {
        return a - b;
    }

    describe("binaryInsert", () => {
        const binaryInsert = utils.binaryInsert;
        it("should properly insert items in sequential order", () => {
            const list = [];
            binaryInsert(list, 1, compare);
            binaryInsert(list, 2, compare);
            binaryInsert(list, 3, compare);
            binaryInsert(list, 4, compare);

            assert.deepEqual(list, [1, 2, 3, 4]);
        });

        it("should properly insert items in reverse order", () => {
            const list = [];
            binaryInsert(list, 4, compare);
            binaryInsert(list, 3, compare);
            binaryInsert(list, 2, compare);
            binaryInsert(list, 1, compare);

            assert.deepEqual(list, [1, 2, 3, 4]);
        });

        it("should properly insert items in random order", () => {
            const list = [];
            binaryInsert(list, 3, compare);
            binaryInsert(list, 2, compare);
            binaryInsert(list, 4, compare);
            binaryInsert(list, 1, compare);

            assert.deepEqual(list, [1, 2, 3, 4]);
        });
    });

    describe("binarySearch", () => {
        const binarySearch = utils.binarySearch;

        it("should return the index of the value", () => {
            const list = [1, 2, 3, 4, 5, 6, 7];
            for (let i = 0; i < list.length; i++) {
                assert.equal(binarySearch(list, list[i], compare), i);
            }
        });

        it("should return -1 when value is not present in list", () => {
            const list = [1, 2, 3, 5, 6, 7];
            assert.equal(binarySearch(list, 4, compare), -1);
            assert.equal(binarySearch(list, 0, compare), -1);
            assert.equal(binarySearch(list, 8, compare), -1);
        });
    });

    describe("priority to weight", () => {
        const utils = transport.protocol.base.utils;

        const toWeight = utils.priorityToWeight;
        const toPriority = utils.weightToPriority;

        it("should preserve weight=16", () => {
            const priority = toPriority(16);
            assert.equal(priority, 3);
            assert.equal(toWeight(priority), 16);
        });
    });
});
