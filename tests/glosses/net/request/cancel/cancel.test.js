/* global describe it */


const { request: { Cancel } } = adone.net;

describe("Cancel", function () {
    describe("toString", function () {
        it("returns correct result when message is not specified", function () {
            var cancel = new Cancel();
            expect(cancel.toString()).to.be.equal("Cancel");
        });

        it("returns correct result when message is specified", function () {
            var cancel = new Cancel("Operation has been canceled.");
            expect(cancel.toString()).to.be.equal("Cancel: Operation has been canceled.");
        });
    });
});