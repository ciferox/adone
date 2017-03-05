/* global describe it */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("headers", function () {
    it("should default common headers", function (done) {
        var headers = request.defaults.headers.common;

        nock("http://example.org", {
            reqheaders: headers
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });
        
        request("http://example.org/foo");
    });

    it("should add extra headers for post", function (done) {
        var headers = request.defaults.headers.common;

        nock("http://example.org", {
            reqheaders: headers
        })
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo", "fizz=buzz");
    });

    it("should use application/json when posting an object", function (done) {
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/json;charset=utf-8"
            }
        })
            .post("/foo/bar", /.*/)
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo/bar", {
            firstName: "foo",
            lastName: "bar"
        });
    });

    it("should remove content-type if data is empty", function (done) {

        nock("http://example.org")
            .matchHeader("Content-Type", undefined)
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo");
    });

    it("should preserve content-type if data is false", function (done) {
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
            .post("/foo", /.*/)
            .reply(200, () => {
                done();
            });
        request.post("http://example.org/foo", false);
    });
});