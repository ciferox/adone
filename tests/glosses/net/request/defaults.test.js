/* global describe it beforeEach afterEach */

import nock from "../../../helpers/nock";

const { request } = adone.net;
import defaults from "adone/glosses/net/request/defaults";

describe("defaults", function () {
    beforeEach(function () {
    });

    afterEach(function () {
        delete request.defaults.baseURL;
        delete request.defaults.headers.get["X-CUSTOM-HEADER"];
        delete request.defaults.headers.post["X-CUSTOM-HEADER"];
        // document.cookie = XSRF_COOKIE_NAME + "=;expires=" + new Date(Date.now() - 86400000).toGMTString();
    });

    it("should transform request json", function () {
        expect(defaults.transformRequest[0]({ foo: "bar" })).to.be.equal("{\"foo\":\"bar\"}");
    });

    it("should do nothing to request string", function () {
        expect(defaults.transformRequest[0]("foo=bar")).to.be.equal("foo=bar");
    });

    it("should transform response json", function () {
        var data = defaults.transformResponse[0]("{\"foo\":\"bar\"}");

        expect(typeof data).to.be.equal("object");
        expect(data.foo).to.be.equal("bar");
    });

    it("should do nothing to response string", function () {
        expect(defaults.transformResponse[0]("foo=bar")).to.be.equal("foo=bar");
    });

    it("should use global defaults config", function (done) {
        nock("http://e.com")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://e.com/foo");
    });

    it("should use modified defaults config", function (done) {
        request.defaults.baseURL = "http://example.org/";

        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("/foo");
    });

    it("should use request config", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("/foo", {
            baseURL: "http://example.org"
        });
    });

    it("should use GET headers", function (done) {
        request.defaults.headers.get["X-CUSTOM-HEADER"] = "foo";

        nock("http://example.org", {
            reqheaders: {
                "X-CUSTOM-HEADER": "foo"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request.get("http://example.org/foo");
    });

    it("should use POST headers", function (done) {
        nock("http://example.org", {
            reqheaders: {
                "X-CUSTOM-HEADER": "foo"
            }
        })
            .post("/foo")
            .reply(200, () => {
                done();
            });
            
        request.defaults.headers.post["X-CUSTOM-HEADER"] = "foo";
        request.post("http://example.org/foo", {});

    });

    it("should use header config", function (done) {
        nock("http://example.org", {
            reqheaders: {
                "X-COMMON-HEADER": "commonHeaderValue",
                "X-GET-HEADER": "getHeaderValue",
                "X-FOO-HEADER": "fooHeaderValue",
                "X-BAR-HEADER": "barHeaderValue"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        var instance = request.create({
            headers: {
                common: {
                    "X-COMMON-HEADER": "commonHeaderValue"
                },
                get: {
                    "X-GET-HEADER": "getHeaderValue"
                },
                post: {
                    "X-POST-HEADER": "postHeaderValue"
                }
            }
        });

        instance.get("http://example.org/foo", {
            headers: {
                "X-FOO-HEADER": "fooHeaderValue",
                "X-BAR-HEADER": "barHeaderValue"
            }
        });
    });

    it("should be used by custom instance if set before instance created", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request.defaults.baseURL = "http://example.org/";
        var instance = request.create();

        instance.get("/foo");
    });

    it("should be used by custom instance if set after instance created", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        var instance = request.create();
        request.defaults.baseURL = "http://example.org/";

        instance.get("/foo");
    });
});