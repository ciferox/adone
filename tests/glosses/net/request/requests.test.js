/* global describe it */

import nock from "../../../helpers/nock";
import Dummy from "../../../helpers/spy";

const { request } = adone.net;

describe("requests", function () {
    it("should treat single string arg as url", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo");
    });

    it("should allow string arg as url, and config arg", function (done) {
        nock("http://example.org")
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo");
    });

    it("should reject on network errors", function (done) {
        this.timeout(30000);
        var resolveSpy = new Dummy();
        var rejectSpy = new Dummy();

        var finish = function () {
            expect(resolveSpy.calls).to.be.at.least(0);
            expect(rejectSpy.calls).to.be.at.least(1);
            var reason = rejectSpy.get(0).args[0];
            expect(reason.code).to.be.equal("ENOTFOUND");
            expect(reason.config.method).to.be.equal("get");
            expect(reason.config.url).to.be.equal("http://thisisnotaserver");
            done();
        };

        request("http://thisisnotaserver")
            .then(resolveSpy.callback, rejectSpy.callback)
            .then(finish, finish);
    });

    it("should reject when validateStatus returns false", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(500);

        var resolveSpy = new Dummy();
        var rejectSpy = new Dummy();

        request("http://example.org/foo", {
            validateStatus: function (status) {
                return status !== 500;
            }
        }).then(resolveSpy.callback, rejectSpy.callback)
            .then(function () {
                expect(resolveSpy.calls).to.be.equal(0);
                expect(rejectSpy.calls).to.be.equal(1);
                var reason = rejectSpy.get(0).args[0];
                expect(reason instanceof Error).to.be.true;
                expect(reason.message).to.be.equal("Request failed with status code 500");
                expect(reason.config.method).to.be.equal("get");
                expect(reason.config.url).to.be.equal("http://example.org/foo");
                expect(reason.response.status).to.be.equal(500);

                done();
            });
    });

    it("should resolve when validateStatus returns true", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(500);

        var resolveSpy = new Dummy();
        var rejectSpy = new Dummy();

        request("http://example.org/foo", {
            validateStatus: function (status) {
                return status === 500;
            }
        }).then(resolveSpy.callback)
            .catch(rejectSpy.callback)
            .then(function () {
                expect(resolveSpy.calls).to.be.equal(1);
                expect(rejectSpy.calls).to.be.equal(0);
                done();
            });
    });

    // https://github.com/mzabriskie/axios/issues/378
    it("should return JSON when rejecting", function (done) {
        nock("http://example.org")
            .post("/api/account/signup", /.*/)
            .reply(400, "{\"error\": \"BAD USERNAME\", \"code\": 1}");

        request.post("http://example.org/api/account/signup", {
            username: null,
            password: null
        }, {
            headers: {
                "Accept": "application/json"
            }
        })
        .catch(function ({ response }) {
            expect(typeof response.data).to.be.equal("object");
            expect(response.data.error).to.be.equal("BAD USERNAME");
            expect(response.data.code).to.be.equal(1);
            done();
        });
    });

    it("should make cross domian http request", function (done) {
        nock("http://someurl.com")
            .post("/foo", /.*/)
            .reply(200, "{\"foo\": \"bar\"}", {
                "Content-Type": "application/json"
            });

        request.post("http://someurl.com/foo").then(function (response) {
            expect(response.data.foo).to.be.equal("bar");
            expect(response.status).to.be.equal(200);
            expect(response.headers["content-type"]).to.be.equal("application/json");
            done();
        });
    });

    it("should allow overriding Content-Type header case-insensitive", function (done) {
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/vnd.myapp.type+json"
            }
        })
            .post("/foo", { prop: "value" })
            .reply(200, "{\"foo\": \"bar\"}", {
                "Content-Type": "application/json"
            });


        var contentType = "application/vnd.myapp.type+json";

        request.post("http://example.org/foo", { prop: "value" }, {
            headers: {
                "content-type": contentType
            }
        }).then(function () {
            done();
        });
    });

    it("should support binary data as array buffer", function (done) {
        var input = new Int8Array(2);
        input[0] = 1;
        input[1] = 2;
        
        nock("http://example.org")
            .post("/foo", (x) => "\x01\x02" in x)
            .reply(200, () => {
                done();
            });


        request.post("http://example.org/foo", input.buffer);
    });

    it("should support binary data as array buffer view", function (done) {
        var input = new Int8Array(2);
        input[0] = 1;
        input[1] = 2;
        
        nock("http://example.org")
            .post("/foo", (x) => "\x01\x02" in x)
            .reply(200, () => {
                done();
            });


        request.post("http://example.org/foo", input);
    });

    it("should support array buffer response", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, Buffer.from("Hello, World!"));

        request("http://example.org/foo", {
            responseType: "arraybuffer"
        }).then(function (response) {
            expect(response.data.byteLength).to.be.equal(13);
            done();
        });
    });

    it("should support URLSearchParams", function (done) {
        const qs = adone.std.querystring.stringify({ param1: "value1", param2: "value2" });
        
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
            .post("/foo", qs)
            .reply(200, () => done());


        request.post("http://example.org/foo", qs);
    });
});