/* global describe it beforeEach */


import transformData from "adone/glosses/net/request/core/transform_data";

describe("core::transformData", function () {
    it("should support a single transformer", function () {
        var data;
        data = transformData(data, null, function (data) {
            data = "foo";
            return data;
        });

        expect(data).to.be.equal("foo");
    });

    it("should support an array of transformers", function () {
        var data = "";
        data = transformData(data, null, [function (data) {
            data += "f";
            return data;
        }, function (data) {
            data += "o";
            return data;
        }, function (data) {
            data += "o";
            return data;
        }]);

        expect(data).to.be.equal("foo");
    });
});