const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;
const fp = server.plugin;
const cors = require("cors");
const helmet = require("helmet");
const serveStatic = require("serve-static");
const fs = require("fs");
const path = require("path");
const symbols = server.symbol;

describe("middleware", () => {
    it("use a middleware", (done) => {
        const instance = server();

        const useRes = instance.use((req, res, next) => {
            assert.ok("middleware called");
            next();
        });

        assert.equal(useRes, instance);

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                instance.server.close();
                done();
            });
        });
    });

    it("cannot add middleware after binding", (done) => {
        const instance = server();

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            try {
                instance.route({
                    method: "GET",
                    url: "/another-get-route",
                    handler(req, reply) {
                        reply.send({ hello: "world" });
                    }
                });
                assert.fail();
            } catch (e) {
                instance.server.close();
                done();
            }
        });
    });

    it("use cors", (done) => {
        const instance = server();

        instance.use(cors());

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.equal(response.headers["access-control-allow-origin"], "*");
                instance.server.close();
                done();
            });
        });
    });

    it("use helmet", (done) => {
        const instance = server();

        instance.use(helmet());

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.ok(response.headers["x-xss-protection"]);
                instance.server.close();
                done();
            });
        });
    });

    it("use helmet and cors", (done) => {
        const instance = server();

        instance.use(cors());
        instance.use(helmet());

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.ok(response.headers["x-xss-protection"]);
                assert.equal(response.headers["access-control-allow-origin"], "*");
                instance.server.close();
                done();
            });
        });
    });

    it("middlewares should support encapsulation / 1", (done) => {
        const instance = server();

        instance.register((i, opts, done) => {
            assert.ok(i[symbols.kMiddlewares].length === 0);
            i.use((req, res, next) => {
                assert.fail("this should not be called");
                next();
            });
            done();
        });

        instance.get("/", (request, reply) => {
            assert.ok(instance[symbols.kMiddlewares].length === 0);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);
            assert.ok(instance[symbols.kMiddlewares].length === 0);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                instance.server.close();
                done();
            });
        });
    });

    it("middlewares should support encapsulation / 2", (done) => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });

        instance.register((i, opts, done) => {
            i.use((req, res, next) => {
                req.local = true;
                next();
            });

            i.get("/local", (request, reply) => {
                assert.ok(request.raw.global);
                assert.ok(request.raw.local);
                reply.send({ hello: "world" });
            });

            done();
        });

        instance.get("/global", (request, reply) => {
            assert.ok(request.raw.global);
            assert.notOk(request.raw.local);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/global`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                sget({
                    method: "GET",
                    url: `http://localhost:${instance.server.address().port}/local`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(response.headers["content-length"], `${body.length}`);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    instance.server.close();
                    done();
                });
            });
        });
    });

    it("middlewares should support encapsulation / 3", (done) => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });

        instance.register((i, opts, done) => {
            i.use((req, res, next) => {
                req.firstLocal = true;
                next();
            });

            i.use((req, res, next) => {
                req.secondLocal = true;
                next();
            });

            i.get("/local", (request, reply) => {
                assert.ok(request.raw.global);
                assert.ok(request.raw.firstLocal);
                assert.ok(request.raw.secondLocal);
                reply.send({ hello: "world" });
            });

            done();
        });

        instance.get("/global", (request, reply) => {
            assert.ok(request.raw.global);
            assert.notOk(request.raw.firstLocal);
            assert.notOk(request.raw.secondLocal);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/global`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                sget({
                    method: "GET",
                    url: `http://localhost:${instance.server.address().port}/local`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(response.headers["content-length"], `${body.length}`);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });
                    instance.server.close();
                    done();
                });
            });
        });
    });

    it("middlewares should support encapsulation / 4", (done) => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });

        instance.register((i, opts, done) => {
            i.use((req, res, next) => {
                req.firstLocal = true;
                next();
            });

            i.register((f, opts, d) => {
                f.use((req, res, next) => {
                    req.secondLocal = true;
                    next();
                });

                f.get("/secondLocal", (request, reply) => {
                    assert.ok(request.raw.global);
                    assert.ok(request.raw.firstLocal);
                    assert.ok(request.raw.secondLocal);
                    assert.ok(request.raw.thirdLocal);
                    reply.send({ hello: "world" });
                });

                f.use((req, res, next) => {
                    req.thirdLocal = true;
                    next();
                });

                d();
            });

            i.get("/firstLocal", (request, reply) => {
                assert.ok(request.raw.global);
                assert.ok(request.raw.firstLocal);
                assert.notOk(request.raw.secondLocal);
                assert.notOk(request.raw.thirdLocal);
                reply.send({ hello: "world" });
            });

            done();
        });

        instance.get("/global", (request, reply) => {
            assert.ok(request.raw.global);
            assert.notOk(request.raw.firstLocal);
            assert.notOk(request.raw.secondLocal);
            assert.notOk(request.raw.thirdLocal);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/global`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                sget({
                    method: "GET",
                    url: `http://localhost:${instance.server.address().port}/firstLocal`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(response.headers["content-length"], `${body.length}`);
                    assert.deepEqual(JSON.parse(body), { hello: "world" });

                    sget({
                        method: "GET",
                        url: `http://localhost:${instance.server.address().port}/secondLocal`
                    }, (err, response, body) => {
                        assert.notExists(err);
                        assert.strictEqual(response.statusCode, 200);
                        assert.strictEqual(response.headers["content-length"], `${body.length}`);
                        assert.deepEqual(JSON.parse(body), { hello: "world" });
                        instance.server.close();
                        done();
                    });
                });
            });
        });
    });

    it("middlewares should support encapsulation / 5", (done) => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });

        instance.register((i, opts, done) => {
            i.use((req, res, next) => {
                next(new Error("kaboom!"));
            });

            i.get("/local", (request, reply) => {
                assert.fail("this should not be called");
            });

            done();
        });

        instance.get("/global", (request, reply) => {
            assert.ok(request.raw.global);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/global`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                sget({
                    method: "GET",
                    url: `http://localhost:${instance.server.address().port}/local`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 500);
                    assert.deepEqual(JSON.parse(body), {
                        error: "Internal Server Error",
                        message: "kaboom!",
                        statusCode: 500
                    });
                    instance.server.close();
                    done();
                });
            });
        });
    });

    it("middlewares should support encapsulation with prefix", (done) => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });

        instance.register((i, opts, done) => {
            i.use((req, res, next) => {
                next(new Error("kaboom!"));
            });

            i.get("/", (request, reply) => {
                assert.fail("this should not be called");
            });

            done();
        }, { prefix: "/local" });

        instance.get("/global", (request, reply) => {
            assert.ok(request.raw.global);
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/global`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });

                sget({
                    method: "GET",
                    url: `http://localhost:${instance.server.address().port}/local`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 500);
                    assert.deepEqual(JSON.parse(body), {
                        error: "Internal Server Error",
                        message: "kaboom!",
                        statusCode: 500
                    });
                    instance.server.close();
                    done();
                });
            });
        });
    });

    it("middlewares should support non-encapsulated plugins", (done) => {
        expect(4).checks(done);

        const instance = server();

        instance.register(fp((i, opts, done) => {
            i.use((req, res, next) => {
                assert.ok("middleware called");
                expect(true).to.be.ok.mark();
                req.midval = 10;
                next();
            });

            done();
        }));

        instance.get("/", (request, reply) => {
            assert.strictEqual(request.raw.midval, 10);
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });

        instance.register(fp((i, opts, done) => {
            i.use((req, res, next) => {
                assert.ok("middleware called");
                expect(true).to.be.ok.mark();
                next();
            });

            done();
        }));

        instance.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("use serve-static", (done) => {
        const instance = server();

        instance.use(serveStatic(__dirname));

        const basename = path.basename(__filename);

        instance.inject({
            method: "GET",
            url: `/${basename}`
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(res.payload, fs.readFileSync(__filename, "utf8"));
            done();
        });
    });

    describe("middlewares with prefix", () => {
        const instance = server();

        instance.use((req, res, next) => {
            req.global = true;
            next();
        });
        instance.use("", (req, res, next) => {
            req.global2 = true;
            next();
        });
        instance.use("/", (req, res, next) => {
            req.root = true;
            next();
        });
        instance.use("/prefix", (req, res, next) => {
            req.prefixed = true;
            next();
        });
        instance.use("/prefix/", (req, res, next) => {
            req.slashed = true;
            next();
        });

        function handler(request, reply) {
            reply.send({
                prefixed: request.raw.prefixed,
                slashed: request.raw.slashed,
                global: request.raw.global,
                global2: request.raw.global2,
                root: request.raw.root
            });
        }

        instance.get("/", handler);
        instance.get("/prefix", handler);
        instance.get("/prefix/", handler);
        instance.get("/prefix/inner", handler);

        before((done) => {
            instance.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            instance.server.close();
        });


        it("/", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/`,
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body, {
                    global: true,
                    global2: true,
                    root: true
                });
                done();
            });
        });

        it("/prefix", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/prefix`,
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body, {
                    prefixed: true,
                    global: true,
                    global2: true,
                    root: true,
                    slashed: true
                });
                done();
            });
        });

        it("/prefix/", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/prefix/`,
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body, {
                    prefixed: true,
                    slashed: true,
                    global: true,
                    global2: true,
                    root: true
                });
                done();
            });
        });

        it("/prefix/inner", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${instance.server.address().port}/prefix/inner`,
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body, {
                    prefixed: true,
                    slashed: true,
                    global: true,
                    global2: true,
                    root: true
                });
                done();
            });
        });
    });

    it("res.end should block middleware execution", (done) => {
        const instance = server();

        instance.addHook("onRequest", (req, res, next) => {
            assert.ok("called");
            next();
        });

        instance.use((req, res, next) => {
            res.end("hello");
        });

        instance.use((req, res, next) => {
            assert.fail("we should not be here");
        });

        instance.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        instance.addHook("onSend", (req, reply, payload, next) => {
            assert.fail("this should not be called");
        });

        instance.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            next();
        });

        instance.get("/", (request, reply) => {
            assert.fail("we should no be here");
        });

        instance.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            done();
        });
    });

    it("middlewares should be able to respond with a stream", (done) => {
        const instance = server();

        instance.addHook("onRequest", (req, res, next) => {
            assert.ok("called");
            next();
        });

        instance.use((req, res, next) => {
            const stream = fs.createReadStream(adone.std.path.join(__dirname, "middleware.test.js"), "utf8");
            stream.pipe(res);
            res.once("finish", next);
        });

        instance.use((req, res, next) => {
            assert.fail("we should not be here");
        });

        instance.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        instance.addHook("onSend", (req, reply, payload, next) => {
            assert.fail("this should not be called");
        });

        instance.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            next();
        });

        instance.get("/", (request, reply) => {
            assert.fail("we should no be here");
        });

        instance.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            done();
        });
    });

    it("Use a middleware inside a plugin after an encapsulated plugin", (done) => {
        expect(3).checks(done);
        const f = server();

        f.register((instance, opts, next) => {
            instance.use((req, res, next) => {
                assert.ok("first middleware called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        });

        f.register(fp((instance, opts, next) => {
            instance.use((req, res, next) => {
                assert.ok("second middleware called");
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }));

        f.inject("/", (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("middlewares should run in the order in which they are defined", (done) => {
        expect(7).checks(done);
        const f = server();

        f.register((instance, opts, next) => {
            instance.use((req, res, next) => {
                assert.strictEqual(req.previous, undefined);
                expect(true).to.be.ok.mark();
                req.previous = 1;
                next();
            });

            instance.get("/", (request, reply) => {
                assert.strictEqual(request.req.previous, 5);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            instance.register(fp((i, opts, next) => {
                i.use((req, res, next) => {
                    assert.strictEqual(req.previous, 1);
                    expect(true).to.be.ok.mark();
                    req.previous = 2;
                    next();
                });
                next();
            }));

            next();
        });

        f.register(fp((instance, opts, next) => {
            instance.use((req, res, next) => {
                assert.strictEqual(req.previous, 2);
                expect(true).to.be.ok.mark();
                req.previous = 3;
                next();
            });

            instance.register(fp((i, opts, next) => {
                i.use((req, res, next) => {
                    assert.strictEqual(req.previous, 3);
                    expect(true).to.be.ok.mark();
                    req.previous = 4;
                    next();
                });
                next();
            }));

            instance.use((req, res, next) => {
                assert.strictEqual(req.previous, 4);
                expect(true).to.be.ok.mark();
                req.previous = 5;
                next();
            });

            next();
        }));

        f.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });
});
