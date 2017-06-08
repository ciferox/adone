describe("net", "http", "helpers", "type is", () => {
    const { net: { http: { server: { helper: { typeIs } } } } } = adone;

    const createRequest = (type) => {
        return {
            headers: {
                "content-type": type || "",
                "transfer-encoding": "chunked"
            }
        };
    };

    describe("typeIs.request(req, type)", () => {
        it("should ignore params", () => {
            const req = createRequest("text/html; charset=utf-8");
            assert.equal(typeIs.request(req, ["text/*"]), "text/html");
        });

        it("should ignore params LWS", () => {
            const req = createRequest("text/html ; charset=utf-8");
            assert.equal(typeIs.request(req, ["text/*"]), "text/html");
        });

        it("should ignore casing", () => {
            const req = createRequest("text/HTML");
            assert.equal(typeIs.request(req, ["text/*"]), "text/html");
        });

        it("should fail invalid type", () => {
            const req = createRequest("text/html**");
            assert.strictEqual(typeIs.request(req, ["text/*"]), false);
        });

        it("should not match invalid type", () => {
            const req = createRequest("text/html");
            assert.strictEqual(typeIs.request(req, ["text/html/"]), false);
            assert.strictEqual(typeIs.request(req, [undefined, null, true, function () { }]), false);
        });

        describe("when no body is given", () => {
            it("should return null", () => {
                const req = { headers: {} };

                assert.strictEqual(typeIs.request(req), null);
                assert.strictEqual(typeIs.request(req, ["image/*"]), null);
                assert.strictEqual(typeIs.request(req, "image/*", "text/*"), null);
            });
        });

        describe("when no content type is given", () => {
            it("should return false", () => {
                const req = createRequest();
                assert.strictEqual(typeIs.request(req), false);
                assert.strictEqual(typeIs.request(req, ["image/*"]), false);
                assert.strictEqual(typeIs.request(req, ["text/*", "image/*"]), false);
            });
        });

        describe("give no types", () => {
            it("should return the mime type", () => {
                const req = createRequest("image/png");
                assert.equal(typeIs.request(req), "image/png");
            });
        });

        describe("given one type", () => {
            it("should return the type or false", () => {
                const req = createRequest("image/png");

                assert.equal(typeIs.request(req, ["png"]), "png");
                assert.equal(typeIs.request(req, [".png"]), ".png");
                assert.equal(typeIs.request(req, ["image/png"]), "image/png");
                assert.equal(typeIs.request(req, ["image/*"]), "image/png");
                assert.equal(typeIs.request(req, ["*/png"]), "image/png");

                assert.strictEqual(typeIs.request(req, ["jpeg"]), false);
                assert.strictEqual(typeIs.request(req, [".jpeg"]), false);
                assert.strictEqual(typeIs.request(req, ["image/jpeg"]), false);
                assert.strictEqual(typeIs.request(req, ["text/*"]), false);
                assert.strictEqual(typeIs.request(req, ["*/jpeg"]), false);

                assert.strictEqual(typeIs.request(req, ["bogus"]), false);
                assert.strictEqual(typeIs.request(req, ["something/bogus*"]), false);
            });
        });

        describe("given multiple types", () => {
            it("should return the first match or false", () => {
                const req = createRequest("image/png");

                assert.equal(typeIs.request(req, ["png"]), "png");
                assert.equal(typeIs.request(req, ".png"), ".png");
                assert.equal(typeIs.request(req, ["text/*", "image/*"]), "image/png");
                assert.equal(typeIs.request(req, ["image/*", "text/*"]), "image/png");
                assert.equal(typeIs.request(req, ["image/*", "image/png"]), "image/png");
                assert.equal(typeIs.request(req, "image/png", "image/*"), "image/png");

                assert.strictEqual(typeIs.request(req, ["jpeg"]), false);
                assert.strictEqual(typeIs.request(req, [".jpeg"]), false);
                assert.strictEqual(typeIs.request(req, ["text/*", "application/*"]), false);
                assert.strictEqual(typeIs.request(req, ["text/html", "text/plain", "application/json"]), false);
            });
        });

        describe("given +suffix", () => {
            it("should match suffix types", () => {
                const req = createRequest("application/vnd+json");

                assert.equal(typeIs.request(req, "+json"), "application/vnd+json");
                assert.equal(typeIs.request(req, "application/vnd+json"), "application/vnd+json");
                assert.equal(typeIs.request(req, "application/*+json"), "application/vnd+json");
                assert.equal(typeIs.request(req, "*/vnd+json"), "application/vnd+json");
                assert.strictEqual(typeIs.request(req, "application/json"), false);
                assert.strictEqual(typeIs.request(req, "text/*+json"), false);
            });
        });

        describe('given "*/*"', () => {
            it("should match any content-type", () => {
                assert.equal(typeIs.request(createRequest("text/html"), "*/*"), "text/html");
                assert.equal(typeIs.request(createRequest("text/xml"), "*/*"), "text/xml");
                assert.equal(typeIs.request(createRequest("application/json"), "*/*"), "application/json");
                assert.equal(typeIs.request(createRequest("application/vnd+json"), "*/*"), "application/vnd+json");
            });

            it("should not match invalid content-type", () => {
                assert.strictEqual(typeIs.request(createRequest("bogus"), "*/*"), false);
            });

            it("should not match body-less request", () => {
                const req = { headers: { "content-type": "text/html" } };
                assert.strictEqual(typeIs.request(req, "*/*"), null);
            });
        });

        describe("when Content-Type: application/x-www-form-urlencoded", () => {
            it('should match "urlencoded"', () => {
                const req = createRequest("application/x-www-form-urlencoded");

                assert.equal(typeIs.request(req, ["urlencoded"]), "urlencoded");
                assert.equal(typeIs.request(req, ["json", "urlencoded"]), "urlencoded");
                assert.equal(typeIs.request(req, ["urlencoded", "json"]), "urlencoded");
            });
        });

        describe("when Content-Type: multipart/form-data", () => {
            it('should match "multipart/*"', () => {
                const req = createRequest("multipart/form-data");

                assert.equal(typeIs.request(req, ["multipart/*"]), "multipart/form-data");
            });

            it('should match "multipart"', () => {
                const req = createRequest("multipart/form-data");

                assert.equal(typeIs.request(req, ["multipart"]), "multipart");
            });
        });
    });
});

