/* global describe it */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("transform", function () {
    it("should transform JSON to string", function (done) {
        nock("http://example.org")
            .post("/foo", { foo: "bar" })
            .reply(200, () => done());

        var data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data);
    });

    it("should transform string to JSON", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, { foo: "bar" });

        request("http://example.org/foo").then(function (response) {
            expect(typeof response.data).to.be.equal("object");
            expect(response.data.foo).to.be.equal("bar");
            done();
        });
    });

    it("should override default transform", function (done) {
        nock("http://example.org")
            .post("/foo", { foo: "bar" })
            .reply(200, () => done());

        var data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data, {
            transformRequest: function (data) {
                return JSON.stringify(data);
            }
        });
    });

    it("should allow an Array of transformers", function (done) {
        nock("http://example.org")
            .post("/foo", { foo: "baz" })
            .reply(200, () => done());

        var data = {
            foo: "bar"
        };

        request.post("http://example.org/foo", data, {
            transformRequest: request.defaults.transformRequest.concat(
                function (data) {
                    return data.replace("bar", "baz");
                }
            )
        });
    });

    it("should allowing mutating headers", function (done) {
        var token = Math.floor(Math.random() * Math.pow(2, 64)).toString(36);

        nock("http://example.org", { reqheaders: { "X-Authorization": token } })
            .get("/foo")
            .reply(200, () => done());

        request("http://example.org/foo", {
            transformRequest: function (data, headers) {
                headers["X-Authorization"] = token;
            }
        });
    });
});