/* global describe it afterEach */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("options", function () {
    it("should default method to get", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo");
    });

    it("should accept headers", function (done) {
        nock("http://example.org", {
            "X-Requested-With": "XMLHttpRequest"
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo", {
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });
    });

    it("should accept params", function (done) {
        nock("http://example.org")
            .get("/foo?foo=123&bar=456")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo", {
            params: {
                foo: 123,
                bar: 456
            }
        });
    });

    it("should allow overriding default headers", function (done) {
        nock("http://example.org", {
            Accept: "foo/bar"
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo", {
            headers: {
                "Accept": "foo/bar"
            }
        });
    });

    it("should accept base URL", function (done) {
        nock("http://test.com")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        var instance = request.create({
            baseURL: "http://test.com/"
        });

        instance.get("/foo");
    });

    it("should ignore base URL if request URL is absolute", function (done) {
        nock("http://someotherurl.com/")
            .get("/")
            .reply(200, () => {
                done();
            });

        var instance = request.create({
            baseURL: "http://someurl.com/"
        });

        instance.get("http://someotherurl.com/");
    });
});