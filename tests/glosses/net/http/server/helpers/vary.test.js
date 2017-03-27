describe("glosses", "net", "http", "helpers", "vary", () => {
    const { net: { http: { server: { helper: { vary } } } }, std: { http } } = adone;

    const alterVary = (header, field) => (req, res) => {
        res.setHeader("Vary", header);
        vary(res, field);
    };

    const callVary = (field) => (req, res) => vary(res, field);

    const createServer = (fn) => {
        return http.createServer(function onRequest(req, res) {
            try {
                fn(req, res);
                res.statusCode = 200;
            } catch (err) {
                res.statusCode = 500;
                res.write(err.message);
            } finally {
                res.end();
            }
        });
    };

    const shouldNotHaveHeader = (header) => (res) => {
        assert.ok(!(header.toLowerCase() in res.headers), `should not have header ${header}`);
    };


    describe("vary(res, field)", () => {
        describe("arguments", () => {
            describe("res", () => {
                it("should be required", () => {
                    assert.throws(vary.bind(), /res.*required/);
                });

                it("should not allow non-res-like objects", () => {
                    assert.throws(vary.bind(null, {}), /res.*required/);
                });
            });

            describe("field", () => {
                it("should be required", async () => {
                    await request(createServer(callVary()))
                        .get("/")
                        .expectStatus(500)
                        .expectBody(/field.*required/);
                });

                it("should accept string", async () => {
                    await request(createServer(callVary("foo")))
                        .get("/")
                        .expectStatus(200);
                });

                it("should accept array of string", async () => {
                    await request(createServer(callVary(["foo", "bar"])))
                        .get("/")
                        .expectStatus(200);
                });

                it("should accept string that is Vary header", async () => {
                    await request(createServer(callVary("foo, bar")))
                        .get("/")
                        .expectStatus(200);
                });

                it('should not allow separator ":"', async () => {
                    await request(createServer(callVary("invalid:header")))
                        .get("/")
                        .expectStatus(500)
                        .expectBody(/field.*contains.*invalid/);
                });

                it('should not allow separator " "', async () => {
                    await request(createServer(callVary("invalid header")))
                        .get("/")
                        .expectStatus(500)
                        .expectBody(/field.*contains.*invalid/);
                });
            });
        });

        describe("when no Vary", () => {
            it("should set value", async () => {
                await request(createServer(callVary("Origin")))
                    .get("/")
                    .expectHeader("Vary", "Origin")
                    .expectStatus(200);
            });

            it("should set value with multiple calls", async () => {
                await request(createServer(callVary(["Origin", "User-Agent"])))
                    .get("/")
                    .expectHeader("Vary", "Origin, User-Agent")
                    .expectStatus(200);
            });

            it("should preserve case", async () => {
                await request(createServer(callVary(["ORIGIN", "user-agent", "AccepT"])))
                    .get("/")
                    .expectHeader("Vary", "ORIGIN, user-agent, AccepT")
                    .expectStatus(200);
            });

            it("should not set Vary on empty array", async () => {
                await request(createServer(callVary([])))
                    .get("/")
                    .expect(shouldNotHaveHeader("Vary"))
                    .expectStatus(200);
            });
        });

        describe("when existing Vary", () => {
            it("should set value", async () => {
                await request(createServer(alterVary("Accept", "Origin")))
                    .get("/")
                    .expectHeader("Vary", "Accept, Origin")
                    .expectStatus(200);
            });

            it("should set value with multiple calls", async () => {
                const server = createServer((req, res) => {
                    res.setHeader("Vary", "Accept");
                    vary(res, "Origin");
                    vary(res, "User-Agent");
                });
                await request(server)
                    .get("/")
                    .expectHeader("Vary", "Accept, Origin, User-Agent")
                    .expectStatus(200);
            });

            it("should not duplicate existing value", async () => {
                await request(createServer(alterVary("Accept", "Accept")))
                    .get("/")
                    .expectHeader("Vary", "Accept")
                    .expectStatus(200);
            });

            it("should compare case-insensitive", async () => {
                await request(createServer(alterVary("Accept", "accEPT")))
                    .get("/")
                    .expectHeader("Vary", "Accept")
                    .expectStatus(200);
            });

            it("should preserve case", async () => {
                await request(createServer(alterVary("AccepT", ["accEPT", "ORIGIN"])))
                    .get("/")
                    .expectHeader("Vary", "AccepT, ORIGIN")
                    .expectStatus(200);
            });
        });

        describe("when existing Vary as array", () => {
            it("should set value", async () => {
                await request(createServer(alterVary(["Accept", "Accept-Encoding"], "Origin")))
                    .get("/")
                    .expectHeader("Vary", "Accept, Accept-Encoding, Origin")
                    .expectStatus(200);
            });

            it("should not duplicate existing value", async () => {
                await request(createServer(alterVary(["Accept", "Accept-Encoding"], ["accept", "origin"])))
                    .get("/")
                    .expectHeader("Vary", "Accept, Accept-Encoding, origin")
                    .expectStatus(200);
            });
        });

        describe("when Vary: *", () => {
            it("should set value", async () => {
                await request(createServer(callVary("*")))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });

            it("should act as if all values alread set", async () => {
                await request(createServer(alterVary("*", ["Origin", "User-Agent"])))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });

            it("should erradicate existing values", async () => {
                await request(createServer(alterVary("Accept, Accept-Encoding", "*")))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });

            it("should update bad existing header", async () => {
                await request(createServer(alterVary("Accept, Accept-Encoding, *", "Origin")))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });
        });

        describe("when field is string", () => {
            it("should set value", async () => {
                await request(createServer(callVary("Accept")))
                    .get("/")
                    .expectHeader("Vary", "Accept")
                    .expectStatus(200);
            });

            it("should set value when vary header", async () => {
                await request(createServer(callVary("Accept, Accept-Encoding")))
                    .get("/")
                    .expectHeader("Vary", "Accept, Accept-Encoding")
                    .expectStatus(200);
            });

            it("should acept LWS", async () => {
                await request(createServer(callVary("  Accept     ,     Origin    ")))
                    .get("/")
                    .expectHeader("Vary", "Accept, Origin")
                    .expectStatus(200);
            });

            it("should handle contained *", async () => {
                await request(createServer(callVary("Accept,*")))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });
        });

        describe("when field is array", () => {
            it("should set value", async () => {
                await request(createServer(callVary(["Accept", "Accept-Language"])))
                    .get("/")
                    .expectHeader("Vary", "Accept, Accept-Language")
                    .expectStatus(200);
            });

            it("should ignore double-entries", async () => {
                await request(createServer(callVary(["Accept", "Accept"])))
                    .get("/")
                    .expectHeader("Vary", "Accept")
                    .expectStatus(200);
            });

            it("should be case-insensitive", async () => {
                await request(createServer(callVary(["Accept", "ACCEPT"])))
                    .get("/")
                    .expectHeader("Vary", "Accept")
                    .expectStatus(200);
            });

            it("should handle contained *", async () => {
                await request(createServer(callVary(["Origin", "User-Agent", "*", "Accept"])))
                    .get("/")
                    .expectHeader("Vary", "*")
                    .expectStatus(200);
            });

            it("should handle existing values", async () => {
                await request(createServer(alterVary("Accept, Accept-Encoding", ["origin", "accept", "accept-charset"])))
                    .get("/")
                    .expectHeader("Vary", "Accept, Accept-Encoding, origin, accept-charset")
                    .expectStatus(200);
            });
        });
    });

    describe("vary.append(header, field)", () => {
        describe("arguments", () => {
            describe("header", () => {
                it("should be required", () => {
                    assert.throws(vary.append.bind(), /header.*required/);
                });

                it("should be a string", () => {
                    assert.throws(vary.append.bind(null, 42), /header.*required/);
                });
            });

            describe("field", () => {
                it("should be required", () => {
                    assert.throws(vary.append.bind(null, ""), /field.*required/);
                });

                it("should accept string", () => {
                    assert.doesNotThrow(vary.append.bind(null, "", "foo"));
                });

                it("should accept string that is Vary header", () => {
                    assert.doesNotThrow(vary.append.bind(null, "", "foo, bar"));
                });

                it("should accept array of string", () => {
                    assert.doesNotThrow(vary.append.bind(null, "", ["foo", "bar"]));
                });

                it('should not allow separator ":"', () => {
                    assert.throws(vary.append.bind(null, "", "invalid:header"), /field.*contains.*invalid/);
                });

                it('should not allow separator " "', () => {
                    assert.throws(vary.append.bind(null, "", "invalid header"), /field.*contains.*invalid/);
                });

                it("should not allow non-token characters", () => {
                    assert.throws(vary.append.bind(null, "", "invalid\nheader"), /field.*contains.*invalid/);
                    assert.throws(vary.append.bind(null, "", "invalid\u0080header"), /field.*contains.*invalid/);
                });
            });
        });

        describe("when header empty", () => {
            it("should set value", () => {
                assert.equal(vary.append("", "Origin"), "Origin");
            });

            it("should set value with array", () => {
                assert.equal(vary.append("", ["Origin", "User-Agent"]), "Origin, User-Agent");
            });

            it("should preserve case", () => {
                assert.equal(vary.append("", ["ORIGIN", "user-agent", "AccepT"]), "ORIGIN, user-agent, AccepT");
            });
        });

        describe("when header has values", () => {
            it("should set value", () => {
                assert.equal(vary.append("Accept", "Origin"), "Accept, Origin");
            });

            it("should set value with array", () => {
                assert.equal(vary.append("Accept", ["Origin", "User-Agent"]), "Accept, Origin, User-Agent");
            });

            it("should not duplicate existing value", () => {
                assert.equal(vary.append("Accept", "Accept"), "Accept");
            });

            it("should compare case-insensitive", () => {
                assert.equal(vary.append("Accept", "accEPT"), "Accept");
            });

            it("should preserve case", () => {
                assert.equal(vary.append("Accept", "AccepT"), "Accept");
            });
        });

        describe("when *", () => {
            it("should set value", () => {
                assert.equal(vary.append("", "*"), "*");
            });

            it("should act as if all values already set", () => {
                assert.equal(vary.append("*", "Origin"), "*");
            });

            it("should erradicate existing values", () => {
                assert.equal(vary.append("Accept, Accept-Encoding", "*"), "*");
            });

            it("should update bad existing header", () => {
                assert.equal(vary.append("Accept, Accept-Encoding, *", "Origin"), "*");
            });
        });

        describe("when field is string", () => {
            it("should set value", () => {
                assert.equal(vary.append("", "Accept"), "Accept");
            });

            it("should set value when vary header", () => {
                assert.equal(vary.append("", "Accept, Accept-Encoding"), "Accept, Accept-Encoding");
            });

            it("should acept LWS", () => {
                assert.equal(vary.append("", "  Accept     ,     Origin    "), "Accept, Origin");
            });

            it("should handle contained *", () => {
                assert.equal(vary.append("", "Accept,*"), "*");
            });
        });

        describe("when field is array", () => {
            it("should set value", () => {
                assert.equal(vary.append("", ["Accept", "Accept-Language"]), "Accept, Accept-Language");
            });

            it("should ignore double-entries", () => {
                assert.equal(vary.append("", ["Accept", "Accept"]), "Accept");
            });

            it("should be case-insensitive", () => {
                assert.equal(vary.append("", ["Accept", "ACCEPT"]), "Accept");
            });

            it("should handle contained *", () => {
                assert.equal(vary.append("", ["Origin", "User-Agent", "*", "Accept"]), "*");
            });

            it("should handle existing values", () => {
                assert.equal(vary.append("Accept, Accept-Encoding", ["origin", "accept", "accept-charset"]), "Accept, Accept-Encoding, origin, accept-charset");
            });
        });
    });
});
