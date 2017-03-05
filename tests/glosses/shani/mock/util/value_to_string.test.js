/* global it describe assert */

import valueToString from "adone/glosses/shani/mock/util/value-to-string";

describe("util/valueToString", function () {
    it("returns string representation of an object", function () {
        const obj = {};

        assert.equal(valueToString(obj), obj.toString());
    });

    it("returns 'null' for literal null'", function () {
        assert.equal(valueToString(null), "null");
    });

    it("returns 'undefined' for literal undefined", function () {
        assert.equal(valueToString(undefined), "undefined");
    });
});
