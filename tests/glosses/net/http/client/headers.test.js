const { request } = adone.net.http.client;

describe("net", "http", "client", "headers", () => {
    it("should default common headers", (done) => {
        const headers = request.options.headers.common;

        nock("http://example.org", {
            reqheaders: headers
        })
            .get("/foo")
            .reply(200, () => {
                done();
            });

        request("http://example.org/foo");
    });

    it("should add extra headers for post", (done) => {
        const headers = request.options.headers.common;

        nock("http://example.org", {
            reqheaders: headers
        })
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo", "fizz=buzz");
    });

    it("should use application/json when posting an object", (done) => {
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

    it("should remove content-type if data is empty", (done) => {

        nock("http://example.org")
            .matchHeader("Content-Type", undefined)
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo");
    });

    it("should preserve content-type if data is false", (done) => {
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
