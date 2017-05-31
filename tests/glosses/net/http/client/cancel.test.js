const { request, CancelToken } = adone.net.http.client;

describe("glosses", "net", "http", "client", "cancel", () => {
    describe("when called before sending request", () => {
        it("rejects Promise with a Cancel object", (done) => {
            const source = CancelToken.source();
            source.cancel("Operation has been canceled.");
            request.get("/foo", {
                cancelToken: source.token
            }).catch((thrown) => {
                // expect(thrown).to.be(jasmine.any(Cancel));
                expect(thrown.message).to.be.equal("Operation has been canceled.");
                done();
            });
        });
    });

    describe("when called after request has been sent", () => {
        it("rejects Promise with a Cancel object", (done) => {
            let source;
            nock("http://example.com")
                .get("/foo/bar")
                .reply(200, () => {
                    source.cancel("Operation has been canceled.");
                    return "OK";
                });

            source = CancelToken.source();
            request.get("http://example.com/foo/bar", {
                cancelToken: source.token
            }).catch((thrown) => {
                // expect(thrown).toEqual(jasmine.any(Cancel));
                expect(thrown.message).to.be.equal("Operation has been canceled.");
                done();
            });
        });
    });

    describe("when called after response has been received", () => {
        // https://github.com/mzabriskie/request/issues/482
        it("does not cause unhandled rejection", (done) => {
            nock("http://example.com")
                .get("/foo")
                .reply(200, "OK");

            const source = CancelToken.source();
            request.get("http://example.com/foo", {
                cancelToken: source.token
            }).then(() => {
                const f = function () {
                    done(new Error("Unhandled rejection."));
                };
                process.once("unhandledrejection", f);
                source.cancel();
                setTimeout(() => {
                    process.removeListener("unhandledrejection", f);
                    done();
                }, 100);
            });
        });
    });
});
