/* global describe it */


const { request } = adone.net;

describe("adapter", function () {
    it("should support custom adapter", function (done) {
        var called = false;

        request("/foo", {
            adapter: function (resolve, reject, config) {
                called = true;
                return Promise.resolve({});
            }
        });

        setTimeout(function () {
            expect(called).to.be.true;
            done();
        }, 100);
    });
});