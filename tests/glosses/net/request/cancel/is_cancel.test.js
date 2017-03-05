/* global describe it */


const { request: { Cancel, isCancel } } = adone.net;

describe("isCancel", function () {
    it("returns true if value is a Cancel", function () {
        expect(isCancel(new Cancel())).to.be.true;
    });

    it("returns false if value is not a Cancel", function () {
        expect(isCancel({ foo: "bar" })).to.be.false;
    });
});