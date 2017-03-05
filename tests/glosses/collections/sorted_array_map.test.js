const { SortedArrayMap } = adone.collection;
const describeDict = require("./dict");
const describeMap = require("./map");
const describeToJson = require("./to_json");

describe("SortedArrayMap", function () {
    describeDict(SortedArrayMap);
    describeMap(SortedArrayMap, [1, 2, 3]);
    describeToJson(SortedArrayMap, [[1, 10], [2, 20], [3, 30]]);
});

