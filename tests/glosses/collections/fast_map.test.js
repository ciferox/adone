const { FastMap } = adone.collection;
const describeDict = require("./dict");
const describeMap = require("./map");
const describeToJson = require("./to_json");

describe("FastMap", function () {
    describeDict(FastMap);
    describeMap(FastMap);
    describeToJson(FastMap, [[{a: 1}, 10], [{b: 2}, 20], [{c: 3}, 30]]);
});

