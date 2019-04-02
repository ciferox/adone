const {
    web: { server }
} = adone;

const sget = require("simple-get").concat;
const http = require("http");
const split = require("split2");

describe("versioned routes", () => {
    it("Should register a versioned route", (done) => {
        const fastify = server();

        expect(4).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.2.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.2.0"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.2.1"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("Should register the same route with different versions", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send("1.2.0");
            }
        });

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.3.0",
            handler: (req, reply) => {
                reply.send("1.3.0");
            }
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload, "1.3.0");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.2.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload, "1.2.0");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "2.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("The versioned route should take precedence", (done) => {
        const fastify = server();

        fastify.route({
            method: "GET",
            url: "/",
            handler: (req, reply) => {
                reply.send({ winter: "is coming" });
            }
        });

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });

    it("Versioned route but not version header should return a 404", (done) => {
        const fastify = server();

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            done();
        });
    });

    it("Should register a versioned route", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Accept-Version": "1.x"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Accept-Version": "2.x"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("Shorthand route declaration", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.get("/", { version: "1.2.0" }, (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "1.2.1"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("The not found handler should not use the Accept-Version header", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.setNotFoundHandler((req, reply) => {
            assert.notOk(req.headers["accept-version"]);
            expect(true).to.be.ok.mark();
            reply.code(404).send("not found handler");
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "2.x"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(res.payload, "not found handler");
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("Bad accept version (inject)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": "a.b.c"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                "Accept-Version": 12
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("Bas accept version (server)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.route({
            method: "GET",
            url: "/",
            version: "1.2.0",
            handler: (req, reply) => {
                reply.send({ hello: "world" });
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Accept-Version": "a.b.c"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Accept-Version": 12
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("test log stream", (done) => {
        const stream = split(JSON.parse);
        const fastify = server({
            logger: {
                stream,
                level: "info"
            }
        });

        fastify.get("/", { version: "1.2.0" }, (req, reply) => {
            reply.send(new Error("kaboom"));
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            http.get({
                hostname: "localhost",
                port: fastify.server.address().port,
                path: "/",
                method: "GET",
                headers: {
                    "Accept-Version": "1.x"
                }
            });

            stream.once("data", (listenAtLogLine) => {
                stream.once("data", (line) => {
                    assert.equal(line.req.version, "1.x");
                    stream.once("data", (line) => {
                        assert.equal(line.req.version, "1.x");
                        done();
                    });
                });
            });
        });
    });

    it("Should register a versioned route with custome versioning strategy", (done) => {
        expect(3).checks(done);

        const versioning = {
            storage() {
                let versions = {};
                return {
                    get: (version) => {
                        return versions[version] || null;
                    },
                    set: (version, store) => {
                        versions[version] = store;
                    },
                    del: (version) => {
                        delete versions[version];
                    },
                    empty: () => {
                        versions = {};
                    }
                };
            },
            deriveVersion: (req, ctx) => {
                return req.headers.accept;
            }
        };

        const fastify = server({ versioning });

        fastify.route({
            method: "GET",
            url: "/",
            version: "application/vnd.example.api+json;version=2",
            handler: (req, reply) => {
                reply.send({ hello: "from route v2" });
            }
        });

        fastify.route({
            method: "GET",
            url: "/",
            version: "application/vnd.example.api+json;version=3",
            handler: (req, reply) => {
                reply.send({ hello: "from route v3" });
            }
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                Accept: "application/vnd.example.api+json;version=2"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "from route v2" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                Accept: "application/vnd.example.api+json;version=3"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "from route v3" });
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                Accept: "application/vnd.example.api+json;version=4"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });
});
