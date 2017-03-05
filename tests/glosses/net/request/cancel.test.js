/* global describe it */

import nock from "../../../helpers/nock";

const { request } = adone.net;

// var Cancel = request.Cancel;
var CancelToken = request.CancelToken;

describe("cancel", function () {
    describe("when called before sending request", function () {
        it("rejects Promise with a Cancel object", function (done) {
            var source = CancelToken.source();
            source.cancel("Operation has been canceled.");
            request.get("/foo", {
                cancelToken: source.token
            }).catch(function (thrown) {
                // expect(thrown).to.be(jasmine.any(Cancel));
                expect(thrown.message).to.be.equal("Operation has been canceled.");
                done();
            });
        });
    });

    describe("when called after request has been sent", function () {
        it("rejects Promise with a Cancel object", function (done) {
            nock("http://example.com")
                .get("/foo/bar")
                .reply(200, () => {
                    source.cancel("Operation has been canceled.");
                    return "OK";
                });

            var source = CancelToken.source();
            request.get("http://example.com/foo/bar", {
                cancelToken: source.token
            }).catch(function (thrown) {
                // expect(thrown).toEqual(jasmine.any(Cancel));
                expect(thrown.message).to.be.equal("Operation has been canceled.");
                done();
            });
        });
    });

    describe("when called after response has been received", function () {
        // https://github.com/mzabriskie/request/issues/482
        it("does not cause unhandled rejection", function (done) {
            nock("http://example.com")
                .get("/foo")
                .reply(200, "OK");

            var source = CancelToken.source();
            request.get("http://example.com/foo", {
                cancelToken: source.token
            }).then(function () {
                const f = function () {
                    done(new Error("Unhandled rejection."));
                };
                process.once("unhandledrejection", f);
                source.cancel();
                setTimeout(() => {
                    process.removeListener("unhandledrejection", f);
                    done();
                }, 100);
            });
        });
    });
});