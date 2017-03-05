describe("glosses", "net", "http", "helpers", "accepts", "charset", () => {
    const { net: { http: { helper: { Accepts } } } } = adone;

    const createRequest = (charset) => {
        return {
            headers: {
                "accept-charset": charset
            }
        };
    };

    describe("with no arguments", () => {
        describe("when Accept-Charset is populated", () => {
            it("should return accepted types", () => {
                const req = createRequest("utf-8, iso-8859-1;q=0.2, utf-7;q=0.5");
                const accept = new Accepts(req);
                assert.deepEqual(accept.charsets(), ["utf-8", "utf-7", "iso-8859-1"]);
            });
        });

        describe("when Accept-Charset is not in request", () => {
            it("should return *", () => {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.deepEqual(accept.charsets(), ["*"]);
            });
        });

        describe("when Accept-Charset is empty", () => {
            it("should return an empty array", () => {
                const req = createRequest("");
                const accept = new Accepts(req);
                assert.deepEqual(accept.charsets(), []);
            });
        });
    });

    describe("with multiple arguments", () => {
        describe("when Accept-Charset is populated", () => {
            describe("if any types match", () => {
                it("should return the best fit", () => {
                    const req = createRequest("utf-8, iso-8859-1;q=0.2, utf-7;q=0.5");
                    const accept = new Accepts(req);
                    assert.equal(accept.charsets("utf-7", "utf-8"), "utf-8");
                });
            });

            describe("if no types match", () => {
                it("should return false", () => {
                    const req = createRequest("utf-8, iso-8859-1;q=0.2, utf-7;q=0.5");
                    const accept = new Accepts(req);
                    assert.strictEqual(accept.charsets("utf-16"), false);
                });
            });
        });

        describe("when Accept-Charset is not populated", () => {
            it("should return the first type", () => {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.equal(accept.charsets("utf-7", "utf-8"), "utf-7");
            });
        });
    });

    describe("with an array", () => {
        it("should return the best fit", () => {
            const req = createRequest("utf-8, iso-8859-1;q=0.2, utf-7;q=0.5");
            const accept = new Accepts(req);
            assert.equal(accept.charsets(["utf-7", "utf-8"]), "utf-8");
        });
    });
});
