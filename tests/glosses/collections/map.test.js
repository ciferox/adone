// TODO test insertion order

const { Map } = adone.collection;
const describeDict = require("./dict");
const describeMap = require("./map");
const describeToJson = require("./to_json");

describe("Map", function () {
    describeDict(Map);
    describeMap(Map);
    describeToJson(Map, [[{a: 1}, 10], [{b: 2}, 20], [{c: 3}, 30]]);
});
