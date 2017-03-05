/* global it describe assert */

import $typeOf from "adone/glosses/shani/mock/util/type-of";

describe("typeOf", function () {
    it("returns boolean", function () {
        assert.equal($typeOf(false), "boolean");
    });

    it("returns string", function () {
        assert.equal($typeOf("haha"), "string");
    });

    it("returns number", function () {
        assert.equal($typeOf(123), "number");
    });

    it("returns object", function () {
        assert.equal($typeOf({}), "object");
    });

    it("returns function", function () {
        assert.equal($typeOf(function () {}), "function");
    });

    it("returns undefined", function () {
        assert.equal($typeOf(undefined), "undefined");
    });

    it("returns null", function () {
        assert.equal($typeOf(null), "null");
    });

    it("returns array", function () {
        assert.equal($typeOf([]), "array");
    });

    it("returns regexp", function () {
        assert.equal($typeOf(/.*/), "regexp");
    });

    it("returns date", function () {
        assert.equal($typeOf(new Date()), "date");
    });
});
