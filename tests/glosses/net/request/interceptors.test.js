/* global describe it afterEach */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("interceptors", function () {
    afterEach(function () {
        request.interceptors.request.handlers = [];
        request.interceptors.response.handlers = [];
    });

    it("should add a request interceptor", function (done) {
        nock("http://example.org", {
            reqheaders: {
                test: "added by interceptor"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(function (config) {
            config.headers.test = "added by interceptor";
            return config;
        });

        request("http://example.org/foo");
    });

    it("should add a request interceptor that returns a new config object", function (done) {
        nock("http://example.org")
            .post("/bar")
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(function () {
            return {
                url: "http://example.org/bar",
                method: "post"
            };
        });

        request("http://example.org/foo");
    });

    it("should add a request interceptor that returns a promise", function (done) {
        nock("http://example.org", {
            reqheaders: {
                async: "promise"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(function (config) {
            return new Promise(function (resolve) {
                // do something async
                setTimeout(function () {
                    config.headers.async = "promise";
                    resolve(config);
                }, 100);
            });
        });

        request("http://example.org/foo");
    });

    it("should add multiple request interceptors", function (done) {
        nock("http://example.org", {
            reqheaders: {
                test1: "1",
                test2: "2",
                test3: "3"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(function (config) {
            config.headers.test1 = "1";
            return config;
        });
        request.interceptors.request.use(function (config) {
            config.headers.test2 = "2";
            return config;
        });
        request.interceptors.request.use(function (config) {
            config.headers.test3 = "3";
            return config;
        });

        request("http://example.org/foo");
    });

    it("should add a response interceptor", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use(function (data) {
            data.data = data.data + " - modified by interceptor";
            return data;
        });

        request("http://example.org/foo").then(function (data) {
            expect(data.data).to.be.equal("OK - modified by interceptor");
            done();
        });
    });

    it("should add a response interceptor that returns a new data object", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");
    
        request.interceptors.response.use(function () {
            return {
                data: "stuff"
            };
        });

        request("http://example.org/foo").then(function (data) {
            expect(data.data).to.be.equal("stuff");
            done();
        });
    });

    it("should add a response interceptor that returns a promise", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");
        request.interceptors.response.use(function (data) {
            return new Promise(function (resolve) {
                // do something async
                setTimeout(function () {
                    data.data = "you have been promised!";
                    resolve(data);
                }, 10);
            });
        });

        request("http://example.org/foo").then(function (data) {
            expect(data.data).to.be.equal("you have been promised!");
            done();
        });
    });

    it("should add multiple response interceptors", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        request.interceptors.response.use(function (data) {
            data.data = data.data + "1";
            return data;
        });
        request.interceptors.response.use(function (data) {
            data.data = data.data + "2";
            return data;
        });
        request.interceptors.response.use(function (data) {
            data.data = data.data + "3";
            return data;
        });

        request("http://example.org/foo").then(function (data) {
            expect(data.data).to.be.equal("OK123");
            done();
        });
    });

    it("should allow removing interceptors", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "OK");

        var intercept;

        request.interceptors.response.use(function (data) {
            data.data = data.data + "1";
            return data;
        });
        intercept = request.interceptors.response.use(function (data) {
            data.data = data.data + "2";
            return data;
        });
        request.interceptors.response.use(function (data) {
            data.data = data.data + "3";
            return data;
        });

        request.interceptors.response.eject(intercept);

        request("http://example.org/foo").then(function (data) {
            expect(data.data).to.be.equal("OK13");
            done();
        });
    });

    it("should execute interceptors before transformers", function (done) {
        nock("http://example.org")
            .post("/foo", { foo: "bar", baz: "qux" })
            .reply(200, () => {
                done();
            });

        request.interceptors.request.use(function (config) {
            config.data.baz = "qux";
            return config;
        });

        request.post("http://example.org/foo", {
            foo: "bar"
        });
    });
});