/* global it describe assert */

import createSpy from "adone/glosses/shani/mock/spy";
import functionToString from "adone/glosses/shani/mock/util/function-to-string";

describe("util/functionToString", function () {
    it("returns function's displayName property", function () {
        const fn = function () {};
        fn.displayName = "Larry";

        assert.equal(functionToString.call(fn), "Larry");
    });

    it("guesses name from last call's this object", function () {
        const obj = {};
        obj.doStuff = createSpy();
        obj.doStuff.call({});
        obj.doStuff();

        assert.equal(functionToString.call(obj.doStuff), "doStuff");
    });

    it("guesses name from any call where property can be located", function () {
        const obj = {};
        const otherObj = { id: 42 };

        obj.doStuff = createSpy();
        obj.doStuff.call({});
        obj.doStuff();
        obj.doStuff.call(otherObj);

        assert.equal(functionToString.call(obj.doStuff), "doStuff");
    });
});
