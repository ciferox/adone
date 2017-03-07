import nock from "shani/helpers/nock";

const { client } = adone.net.http;
import defaults from "adone/glosses/net/http/client/defaults";

describe("defaults", () => {
    beforeEach(() => {
    });

    afterEach(() => {
        delete client.defaults.baseURL;
        delete client.defaults.headers.get["X-CUSTOM-HEADER"];
        delete client.defaults.headers.post["X-CUSTOM-HEADER"];
        // document.cookie = XSRF_COOKIE_NAME + "=;expires=" + new Date(Date.now() - 86400000).toGMTString();
    });

    it("should transform request json", () => {
        expect(defaults.transformRequest[0]({ foo: "bar" })).to.be.equal("{\"foo\":\"bar\"}");
    });

    it("should do nothing to request string", () => {
        expect(defaults.transformRequest[0]("foo=bar")).to.be.equal("foo=bar");
    });

    it("should transform response json", () => {
        const data = defaults.transformResponse[0]("{\"foo\":\"bar\"}");

        expect(typeof data).to.be.equal("object");
        expect(data.foo).to.be.equal("bar");
    });

    it("should do nothing to response string", () => {
        expect(defaults.transformResponse[0]("foo=bar")).to.be.equal("foo=bar");
    });

    it("should use global defaults config", (done) => {
        nock("http://e.com")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client("http://e.com/foo");
    });

    it("should use modified defaults config", (done) => {
        client.defaults.baseURL = "http://example.org/";

        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client("/foo");
    });

    it("should use request config", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client("/foo", {
            baseURL: "http://example.org"
        });
    });

    it("should use GET headers", (done) => {
        client.defaults.headers.get["X-CUSTOM-HEADER"] = "foo";

        nock("http://example.org", {
            reqheaders: {
                "X-CUSTOM-HEADER": "foo"
            }
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client.get("http://example.org/foo");
    });

    it("should use POST headers", (done) => {
        nock("http://example.org", {
            reqheaders: {
                "X-CUSTOM-HEADER": "foo"
            }
        })
            .post("/foo")
            .reply(200, () => {
                done();
            });

        client.defaults.headers.post["X-CUSTOM-HEADER"] = "foo";
        client.post("http://example.org/foo", {});

    });

    it("should use header config", (done) => {
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

        const instance = client.create({
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

    it("should be used by custom instance if set before instance created", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        client.defaults.baseURL = "http://example.org/";
        const instance = client.create();

        instance.get("/foo");
    });

    it("should be used by custom instance if set after instance created", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = client.create();
        client.defaults.baseURL = "http://example.org/";

        instance.get("/foo");
    });
});
