const {
    web: { server }
} = adone;
const sget = require("simple-get").concat;

describe("route", () => {
    describe("route", () => {
        const fastify = server();

        it("route - get", (done) => {
            try {
                fastify.route({
                    method: "GET",
                    url: "/",
                    schema: {
                        response: {
                            "2xx": {
                                type: "object",
                                properties: {
                                    hello: {
                                        type: "string"
                                    }
                                }
                            }
                        }
                    },
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                done();
            } catch (e) {
                assert.fail();
            }
        });

        it("missing schema - route", (done) => {
            try {
                fastify.route({
                    method: "GET",
                    url: "/missing",
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                done();
            } catch (e) {
                assert.fail();
            }
        });

        it("invalid handler attribute - route", (done) => {
            try {
                fastify.get("/", { handler: "not a function" }, () => { });
                assert.fail();
            } catch (e) {
                done();
            }
        });

        it("invalid schema - route", (done) => {
            try {
                fastify.route({
                    method: "GET",
                    url: "/invalid",
                    schema: {
                        querystring: {
                            id: "string"
                        }
                    },
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                fastify.after((err) => {
                    assert.ok(err instanceof Error);
                });
                done();

            } catch (e) {
                assert.fail();
            }
        });

        it("Multiple methods", (done) => {
            try {
                fastify.route({
                    method: ["GET", "DELETE"],
                    url: "/multiple",
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                done();
            } catch (e) {
                assert.fail();
            }
        });

        it("Add multiple methods", (done) => {
            try {
                fastify.get("/add-multiple", (req, reply) => {
                    reply.send({ hello: "Bob!" });
                });
                fastify.route({
                    method: ["PUT", "DELETE"],
                    url: "/add-multiple",
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                done();
            } catch (e) {
                assert.fail();
            }
        });

        describe("sub tests", () => {
            before((done) => {
                fastify.listen(0, (err) => {
                    assert.notExists(err);
                    fastify.server.unref();
                    done();
                });        
            });

            it("cannot add another route after binding", (done) => {
                try {
                    fastify.route({
                        method: "GET",
                        url: "/another-get-route",
                        handler(req, reply) {
                            reply.send({ hello: "world" });
                        }
                    });
                    assert.fail();
                } catch (e) {
                    done();
                }
            });

            it("route - get", (done) => {
                sget({
                    method: "GET",
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    done();
                });
            });

            it("route - missing schema", (done) => {
                sget({
                    method: "GET",
                    url: `http://localhost:${fastify.server.address().port}/missing`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    done();
                });
            });

            it("route - multiple methods", (done) => {
                expect(2).checks(done);

                sget({
                    method: "GET",
                    url: `http://localhost:${fastify.server.address().port}/multiple`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    expect(true).to.be.ok.mark();
                });

                sget({
                    method: "DELETE",
                    url: `http://localhost:${fastify.server.address().port}/multiple`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    expect(true).to.be.ok.mark();
                });
            });
        });
    });

    it("path can be specified in place of uri", (done) => {
        const fastify = server();

        fastify.route({
            method: "GET",
            path: "/path",
            handler(req, reply) {
                reply.send({ hello: "world" });
            }
        });

        const reqOpts = {
            method: "GET",
            url: "/path"
        };

        fastify.inject(reqOpts, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            done();
        });
    });

    it("invalid bodyLimit option - route", () => {
        const fastify = server();

        try {
            fastify.route({
                bodyLimit: false,
                method: "PUT",
                handler: () => null
            });
            assert.fail("bodyLimit must be an integer");
        } catch (err) {
            assert.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got 'false'");
        }

        try {
            fastify.post("/url", { bodyLimit: 10000.1 }, () => null);
            assert.fail("bodyLimit must be an integer");
        } catch (err) {
            assert.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got '10000.1'");
        }
    });

    it("handler function in options of shorthand route should works correctly", (done) => {
        const fastify = server();
        fastify.get("/foo", {
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/foo"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            done();
        });
    });
});
