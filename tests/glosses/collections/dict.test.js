const { Dict } = adone.collection;
const describeDict = require("./dict");
const describeToJson = require("./to_json");

describe("Dict", function () {
    describeDict(Dict);
    describeToJson(Dict, {a: 1, b: 2, c: 3});

    it("should throw errors for non-string keys", function () {
        const dict = new Dict();
        expect(function () {
            dict.get(0);
        }).to.throw();
        expect(function () {
            dict.set(0, 10);
        }).to.throw();
        expect(function () {
            dict.has(0);
        }).to.throw();
        expect(function () {
            dict.delete(0);
        }).to.throw();
    });

});

