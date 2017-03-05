/* global it describe assert */

import format from "adone/glosses/shani/mock/util/format";

describe("util/format", function () {
    it("formats with formatio by default", function () {
        assert.equal(format({ id: 42 }), "{\n    id: 42\n}");
    });

    it("formats strings without quotes", function () {
        assert.equal(format("Hey"), "Hey");
    });
});
