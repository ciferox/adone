describe("net", "http", "helpers", "accepts", "encoding", () => {
    const { net: { http: { server: { helper: { Accepts } } } } } = adone;

    const createRequest = (encoding) => {
        return {
            headers: {
                "accept-encoding": encoding
            }
        };
    };

    describe("with no arguments", () => {
        describe("when Accept-Encoding is populated", () => {
            it("should return accepted types", () => {
                const req = createRequest("gzip, compress;q=0.2");
                const accept = new Accepts(req);
                assert.deepEqual(accept.encodings(), ["gzip", "compress", "identity"]);
                assert.equal(accept.encodings("gzip", "compress"), "gzip");
            });
        });

        describe("when Accept-Encoding is not in request", () => {
            it("should return identity", () => {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.deepEqual(accept.encodings(), ["identity"]);
                assert.equal(accept.encodings("gzip", "deflate", "identity"), "identity");
            });

            describe("when identity is not included", () => {
                it("should return false", () => {
                    const req = createRequest();
                    const accept = new Accepts(req);
                    assert.strictEqual(accept.encodings("gzip", "deflate"), false);
                });
            });
        });

        describe("when Accept-Encoding is empty", () => {
            it("should return identity", () => {
                const req = createRequest("");
                const accept = new Accepts(req);
                assert.deepEqual(accept.encodings(), ["identity"]);
                assert.equal(accept.encodings("gzip", "deflate", "identity"), "identity");
            });

            describe("when identity is not included", () => {
                it("should return false", () => {
                    const req = createRequest("");
                    const accept = new Accepts(req);
                    assert.strictEqual(accept.encodings("gzip", "deflate"), false);
                });
            });
        });
    });

    describe("with multiple arguments", () => {
        it("should return the best fit", () => {
            const req = createRequest("gzip, compress;q=0.2");
            const accept = new Accepts(req);
            assert.equal(accept.encodings("compress", "gzip"), "gzip");
            assert.equal(accept.encodings("gzip", "compress"), "gzip");
        });
    });

    describe("with an array", () => {
        it("should return the best fit", () => {
            const req = createRequest("gzip, compress;q=0.2");
            const accept = new Accepts(req);
            assert.equal(accept.encodings(["compress", "gzip"]), "gzip");
        });
    });
});
