describe("glosses", "net", "http", "helpers", "accepts", "language", () => {
    const { net: { http: { server: { helper: { Accepts } } } } } = adone;

    const createRequest = (language) => {
        return {
            headers: {
                "accept-language": language
            }
        };
    };

    describe("with no arguments", () =>  {
        describe("when Accept-Language is populated", () =>  {
            it("should return accepted types", () =>  {
                const req = createRequest("en;q=0.8, es, pt");
                const accept = new Accepts(req);
                assert.deepEqual(accept.languages(), ["es", "pt", "en"]);
            });
        });

        describe("when Accept-Language is not in request", () =>  {
            it("should return *", () =>  {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.deepEqual(accept.languages(), ["*"]);
            });
        });

        describe("when Accept-Language is empty", () =>  {
            it("should return an empty array", () =>  {
                const req = createRequest("");
                const accept = new Accepts(req);
                assert.deepEqual(accept.languages(), []);
            });
        });
    });

    describe("with multiple arguments", () =>  {
        describe("when Accept-Language is populated", () =>  {
            describe("if any types types match", () =>  {
                it("should return the best fit", () =>  {
                    const req = createRequest("en;q=0.8, es, pt");
                    const accept = new Accepts(req);
                    assert.equal(accept.languages("es", "en"), "es");
                });
            });

            describe("if no types match", () =>  {
                it("should return false", () =>  {
                    const req = createRequest("en;q=0.8, es, pt");
                    const accept = new Accepts(req);
                    assert.strictEqual(accept.languages("fr", "au"), false);
                });
            });
        });

        describe("when Accept-Language is not populated", () =>  {
            it("should return the first type", () =>  {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.equal(accept.languages("es", "en"), "es");
            });
        });
    });

    describe("with an array", () =>  {
        it("should return the best fit", () =>  {
            const req = createRequest("en;q=0.8, es, pt");
            const accept = new Accepts(req);
            assert.equal(accept.languages(["es", "en"]), "es");
        });
    });
});
