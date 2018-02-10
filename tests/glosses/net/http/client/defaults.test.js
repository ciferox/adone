const { request, create, defaults } = adone.net.http.client;

describe("net", "http", "client", "defaults", () => {
    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    afterEach(() => {
        delete request.config.baseURL;
        delete request.config.headers.get["X-CUSTOM-HEADER"];
        delete request.config.headers.post["X-CUSTOM-HEADER"];
        // document.cookie = XSRF_COOKIE_NAME + "=;expires=" + new Date(Date.now() - 86400000).toGMTString();
    });

    it("should transform request json", () => {
        expect(defaults.transformRequest[0]({ foo: "bar" })).to.be.equal("{\"foo\":\"bar\"}");
    });

    it("should do nothing to request string", () => {
        expect(defaults.transformRequest[0]("foo=bar")).to.be.equal("foo=bar");
    });

    it("should transform response json", () => {
        const data = defaults.transformResponse[0]("{\"foo\":\"bar\"}", {}, { responseType: "json" });

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

        request("http://e.com/foo");
    });

    it("should use modified defaults config", (done) => {
        request.config.baseURL = "http://example.org/";

        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("/foo");
    });

    it("should use request config", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("/foo", {
            baseURL: "http://example.org"
        });
    });

    it("should use GET headers", (done) => {
        request.config.headers.get["X-CUSTOM-HEADER"] = "foo";

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

        request.config.headers.post["X-CUSTOM-HEADER"] = "foo";
        request.post("http://example.org/foo", {});

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

        const instance = create({
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

        request.config.baseURL = "http://example.org/";
        const instance = create();

        instance.get("/foo");
    });

    it("should be used by custom instance if set after instance created", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = create();
        request.config.baseURL = "http://example.org/";

        instance.get("/foo");
    });
});
