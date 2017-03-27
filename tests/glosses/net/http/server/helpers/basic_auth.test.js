describe("glosses", "net", "http", "helpers", "basicAuth", () => {
    const { net: { http: { server: { helper: { basicAuth } } } } } = adone;

    const request = (authorization) => ({
        headers: {
            authorization
        }
    });

    describe("auth(req)", () => {
        describe("arguments", () => {
            describe("req", () => {
                it("should be required", () => {
                    assert.throws(basicAuth.from, "req is required");
                });

                it("should accept a request", () => {
                    const req = request("basic Zm9vOmJhcg==");
                    const creds = basicAuth.from(req);
                    assert.equal(creds.name, "foo");
                    assert.equal(creds.pass, "bar");
                });

                it("should accept a koa context", () => {
                    const ctx = { req: request("basic Zm9vOmJhcg==") };
                    const creds = basicAuth.from(ctx);
                    assert.equal(creds.name, "foo");
                    assert.equal(creds.pass, "bar");
                });

                it("should reject null", () => {
                    assert.throws(basicAuth.from.bind(null, null), "req is required");
                });

                it("should reject a number", () => {
                    assert.throws(basicAuth.from.bind(null, 42), "req must be an object");
                });

                it("should reject an object without headers", () => {
                    assert.throws(basicAuth.from.bind(null, {}), "required to have headers property");
                });
            });
        });

        describe("with no Authorization field", () => {
            it("should return null", () => {
                const req = request();
                assert.strictEqual(basicAuth.from(req), null);
            });
        });

        describe("with malformed Authorization field", () => {
            it("should return null", () => {
                const req = request("Something");
                assert.strictEqual(basicAuth.from(req), null);
            });
        });

        describe("with malformed Authorization scheme", () => {
            it("should return null", () => {
                const req = request("basic_Zm9vOmJhcg==");
                assert.strictEqual(basicAuth.from(req), null);
            });
        });

        describe("with malformed credentials", () => {
            it("should return null", () => {
                const req = request("basic Zm9vcgo=");
                assert.strictEqual(basicAuth.from(req), null);
            });
        });

        describe("with valid credentials", () => {
            it("should return .name and .pass", () => {
                const req = request("basic Zm9vOmJhcg==");
                const creds = basicAuth.from(req);
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "bar");
            });
        });

        describe("with empty password", () => {
            it("should return .name and .pass", () => {
                const req = request("basic Zm9vOg==");
                const creds = basicAuth.from(req);
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "");
            });
        });

        describe("with empty userid", () => {
            it("should return .name and .pass", () => {
                const req = request("basic OnBhc3M=");
                const creds = basicAuth.from(req);
                assert.equal(creds.name, "");
                assert.equal(creds.pass, "pass");
            });
        });

        describe("with empty userid and pass", () => {
            it("should return .name and .pass", () => {
                const req = request("basic Og==");
                const creds = basicAuth.from(req);
                assert.equal(creds.name, "");
                assert.equal(creds.pass, "");
            });
        });

        describe("with colon in pass", () => {
            it("should return .name and .pass", () => {
                const req = request("basic Zm9vOnBhc3M6d29yZA==");
                const creds = basicAuth.from(req);
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "pass:word");
            });
        });
    });

    describe("auth.parse(string)", () => {
        describe("with undefined string", () => {
            it("should return null", () => {
                assert.strictEqual(basicAuth.parse(), null);
            });
        });

        describe("with malformed string", () => {
            it("should return null", () => {
                assert.strictEqual(basicAuth.parse("Something"), null);
            });
        });

        describe("with malformed scheme", () => {
            it("should return null", () => {
                assert.strictEqual(basicAuth.parse("basic_Zm9vOmJhcg=="), null);
            });
        });

        describe("with malformed credentials", () => {
            it("should return null", () => {
                assert.strictEqual(basicAuth.parse("basic Zm9vcgo="), null);
            });
        });

        describe("with valid credentials", () => {
            it("should return .name and .pass", () => {
                const creds = basicAuth.parse("basic Zm9vOmJhcg==");
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "bar");
            });
        });

        describe("with empty password", () => {
            it("should return .name and .pass", () => {
                const creds = basicAuth.parse("basic Zm9vOg==");
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "");
            });
        });

        describe("with empty userid", () => {
            it("should return .name and .pass", () => {
                const creds = basicAuth.parse("basic OnBhc3M=");
                assert.equal(creds.name, "");
                assert.equal(creds.pass, "pass");
            });
        });

        describe("with empty userid and pass", () => {
            it("should return .name and .pass", () => {
                const creds = basicAuth.parse("basic Og==");
                assert.equal(creds.name, "");
                assert.equal(creds.pass, "");
            });
        });

        describe("with colon in pass", () => {
            it("should return .name and .pass", () => {
                const creds = basicAuth.parse("basic Zm9vOnBhc3M6d29yZA==");
                assert.equal(creds.name, "foo");
                assert.equal(creds.pass, "pass:word");
            });
        });
    });
});

