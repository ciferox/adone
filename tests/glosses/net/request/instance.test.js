/* global describe it */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("instance", function () {

    it("should have the same methods as default instance", function () {
        var instance = request.create();

        for (var prop in request) {
            if ([
                "Axios",
                "create",
                "Cancel",
                "CancelToken",
                "isCancel",
                "all",
                "spread",
                "default"].indexOf(prop) > -1) {
                continue;
            }
            expect(typeof instance[prop]).to.be.equal(typeof request[prop]);
        }
    });

    it("should make an http request without verb helper", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        var instance = request.create();

        instance("http://example.org/foo");
    });

    it("should make an http request", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        var instance = request.create();

        instance.get("http://example.org/foo");
    });

    it("should have defaults.headers", function () {
        var instance = request.create({
            baseURL: "https://api.example.com"
        });

        expect(typeof instance.defaults.headers, "object");
        expect(typeof instance.defaults.headers.common, "object");
    });

    it("should have interceptors on the instance", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200);

        request.interceptors.request.use(function (config) {
            config.foo = true;
            return config;
        });

        var instance = request.create();
        instance.interceptors.request.use(function (config) {
            config.bar = true;
            return config;
        });

        var response;
        instance.get("http://example.org/foo").then(function (res) {
            response = res;
            expect(response.config.foo).to.be.undefined;
            expect(response.config.bar).to.be.true;
            done();
        });
    });
});