describe("glosses", "net", "http", "helpers", "accepts", "type", () => {
    const { net: { http: { server: { helper: { Accepts } } } } } = adone;

    const createRequest = (type) => {
        return {
            headers: {
                accept: type
            }
        };
    };

    describe("with no arguments", () =>  {
        describe("when Accept is populated", () =>  {
            it("should return all accepted types", () =>  {
                const req = createRequest("application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain");
                const accept = new Accepts(req);
                assert.deepEqual(accept.types(), ["text/html", "text/plain", "image/jpeg", "application/*"]);
            });
        });

        describe("when Accept not in request", () =>  {
            it("should return */*", () =>  {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.deepEqual(accept.types(), ["*/*"]);
            });
        });

        describe("when Accept is empty", () =>  {
            it("should return []", () =>  {
                const req = createRequest("");
                const accept = new Accepts(req);
                assert.deepEqual(accept.types(), []);
            });
        });
    });

    describe("with no valid types", () =>  {
        describe("when Accept is populated", () =>  {
            it("should return false", () =>  {
                const req = createRequest("application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain");
                const accept = new Accepts(req);
                assert.strictEqual(accept.types("image/png", "image/tiff"), false);
            });
        });

        describe("when Accept is not populated", () =>  {
            it("should return the first type", () =>  {
                const req = createRequest();
                const accept = new Accepts(req);
                assert.equal(accept.types("text/html", "text/plain", "image/jpeg", "application/*"), "text/html");
            });
        });
    });

    describe("when extensions are given", () =>  {
        it("should convert to mime types", () =>  {
            const req = createRequest("text/plain, text/html");
            const accept = new Accepts(req);
            assert.equal(accept.types("html"), "html");
            assert.equal(accept.types(".html"), ".html");
            assert.equal(accept.types("txt"), "txt");
            assert.equal(accept.types(".txt"), ".txt");
            assert.strictEqual(accept.types("png"), false);
            assert.strictEqual(accept.types("bogus"), false);
        });
    });

    describe("when an array is given", () =>  {
        it("should return the first match", () =>  {
            const req = createRequest("text/plain, text/html");
            const accept = new Accepts(req);
            assert.equal(accept.types(["png", "text", "html"]), "text");
            assert.equal(accept.types(["png", "html"]), "html");
            assert.equal(accept.types(["bogus", "html"]), "html");
        });
    });

    describe("when multiple arguments are given", () =>  {
        it("should return the first match", () =>  {
            const req = createRequest("text/plain, text/html");
            const accept = new Accepts(req);
            assert.equal(accept.types("png", "text", "html"), "text");
            assert.equal(accept.types("png", "html"), "html");
            assert.equal(accept.types("bogus", "html"), "html");
        });
    });

    describe("when present in Accept as an exact match", () =>  {
        it("should return the type", () =>  {
            const req = createRequest("text/plain, text/html");
            const accept = new Accepts(req);
            assert.equal(accept.types("text/html"), "text/html");
            assert.equal(accept.types("text/plain"), "text/plain");
        });
    });

    describe("when present in Accept as a type match", () =>  {
        it("should return the type", () =>  {
            const req = createRequest("application/json, */*");
            const accept = new Accepts(req);
            assert.equal(accept.types("text/html"), "text/html");
            assert.equal(accept.types("text/plain"), "text/plain");
            assert.equal(accept.types("image/png"), "image/png");
        });
    });

    describe("when present in Accept as a subtype match", () =>  {
        it("should return the type", () =>  {
            const req = createRequest("application/json, text/*");
            const accept = new Accepts(req);
            assert.equal(accept.types("text/html"), "text/html");
            assert.equal(accept.types("text/plain"), "text/plain");
            assert.strictEqual(accept.types("image/png"), false);
        });
    });
});
