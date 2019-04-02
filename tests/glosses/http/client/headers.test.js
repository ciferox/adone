const { request } = adone.http.client;

describe("headers", () => {
    const {
        is
    } = adone;

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("should default common headers", (done) => {
        const headers = request.config.headers.common;

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
        const headers = request.config.headers.common;

        nock("http://example.org", {
            reqheaders: headers
        })
            .post("/foo")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo", "fizz=buzz");
    });

    it("should use application/json posting an object with", (done) => {
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

    it("should use qs.stringify object if content-type is application/x-www-form-urlencoded", (done) => {
        nock("http://example.org", {
            reqheaders: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
            .post("/foo/bar", "firstName=foo&lastName=bar")
            .reply(200, () => {
                done();
            });

        request.post("http://example.org/foo/bar", {
            firstName: "foo",
            lastName: "bar"
        }, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    });

    it("should remove content-type if data is empty", (done) => {
        nock("http://example.org")
            .matchHeader("Content-Type", (x) => is.undefined(x))
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
