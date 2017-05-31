const { request, create } = adone.net.http.client;

describe("glosses", "net", "http", "client", "options", () => {
    it("should default method to get", (done) => {
        nock("http://example.org")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo");
    });

    it("should accept headers", (done) => {
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

    it("should accept params", (done) => {
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

    it("should allow overriding default headers", (done) => {
        nock("http://example.org", {
            Accept: "foo/bar"
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo", {
            headers: {
                Accept: "foo/bar"
            }
        });
    });

    it("should accept base URL", (done) => {
        nock("http://test.com")
            .get("/foo")
            .reply(200, () => {
                done();
            });

        const instance = create({
            baseURL: "http://test.com/"
        });

        instance.get("/foo");
    });

    it("should ignore base URL if request URL is absolute", (done) => {
        nock("http://someotherurl.com/")
            .get("/")
            .reply(200, () => {
                done();
            });

        const instance = create({
            baseURL: "http://someurl.com/"
        });

        instance.get("http://someotherurl.com/");
    });
});
