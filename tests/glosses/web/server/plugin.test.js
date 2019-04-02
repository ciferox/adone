const {
    web: { server }
} = adone;
const sget = require("simple-get").concat;
const fp = server.plugin;
const lolex = require("lolex");

describe("plugin", () => {
    it("require a plugin", (done) => {
        const fastify = server();
        fastify.register(require("./plugin.helper"));
        fastify.ready(() => {
            assert.ok(fastify.test);
            done();
        });
    });

    it("fastify.register with fastify-plugin should not incapsulate his code", (done) => {
        const fastify = server();

        expect(5).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                i.decorate("test", () => { });
                assert.ok(i.test);
                expect(true).to.be.ok.mark();
                n();
            }));

            assert.notOk(instance.test);

            // the decoration is added at the end
            instance.after(() => {
                assert.ok(instance.test);
                expect(true).to.be.ok.mark();
            });

            instance.get("/", (req, reply) => {
                assert.ok(instance.test);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it.todo("fastify.register with fastify-plugin should provide access to external fastify instance if opts argument is a function", (done) => {
        const fastify = server();

        expect(8).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                i.decorate("global", () => { });
                assert.ok(i.global);
                expect(true).to.be.ok.mark();
                n();
            }));

            instance.register((i, o, n) => n(), (p) => {
                assert.notOk(p === instance || p === fastify);
                assert.ok(instance.isPrototypeOf(p));
                assert.ok(fastify.isPrototypeOf(p));
                assert.ok(p.global);
                expect(true).to.be.ok.mark();
            });

            instance.register((i, o, n) => {
                i.decorate("local", () => { });
                n();
            });

            instance.register((i, o, n) => n(), (p) => assert.notOk(p.local));

            instance.register((i, o, n) => {
                assert.ok(i.local);
                expect(true).to.be.ok.mark();
                n();
            }, (p) => p.decorate("local", () => { }));

            instance.register((i, o, n) => n(), (p) => assert.notOk(p.local));

            instance.register(fp((i, o, n) => {
                assert.ok(i.global_2);
                expect(true).to.be.ok.mark();
                n();
            }), (p) => p.decorate("global_2", () => "hello"));

            instance.register((i, o, n) => {
                i.decorate("global_2", () => "world");
                n();
            }, (p) => p.get("/", (req, reply) => {
                assert.ok(p.global_2);
                expect(true).to.be.ok.mark();
                reply.send({ hello: p.global_2() });
            }));

            assert.notOk(instance.global);
            assert.notOk(instance.global_2);
            assert.notOk(instance.local);

            // the decoration is added at the end
            instance.after(() => {
                assert.ok(instance.global);
                assert.strictEqual(instance.global_2(), "hello");
                assert.notOk(instance.local);
                expect(true).to.be.ok.mark();
            });

            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.global);
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("fastify.register with fastify-plugin registers root level plugins", (done) => {
        const fastify = server();

        expect(6).checks(done);

        function rootPlugin(instance, opts, next) {
            instance.decorate("test", "first");
            assert.ok(instance.test);
            expect(true).to.be.ok.mark();
            next();
        }

        function innerPlugin(instance, opts, next) {
            instance.decorate("test2", "second");
            next();
        }

        fastify.register(fp(rootPlugin));

        fastify.register((instance, opts, next) => {
            assert.ok(instance.test);
            instance.register(fp(innerPlugin));

            instance.get("/test2", (req, reply) => {
                assert.ok(instance.test2);
                expect(true).to.be.ok.mark();
                reply.send({ test2: instance.test2 });
            });

            next();
        });

        fastify.ready(() => {
            assert.ok(fastify.test);
            assert.notOk(fastify.test2);
            expect(true).to.be.ok.mark();
        });

        fastify.get("/", (req, reply) => {
            assert.ok(fastify.test);
            expect(true).to.be.ok.mark();
            reply.send({ test: fastify.test });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { test: "first" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/test2`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { test2: "second" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("check dependencies - should not throw", (done) => {
        const fastify = server();

        expect(5).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                i.decorate("test", () => { });
                assert.ok(i.test);
                expect(true).to.be.ok.mark();
                n();
            }));

            instance.register(fp((i, o, n) => {
                try {
                    i.decorate("otherTest", () => { }, ["test"]);
                    assert.ok(i.test);
                    assert.ok(i.otherTest);
                    expect(true).to.be.ok.mark();
                    n();
                } catch (e) {
                    assert.fail();
                }
            }));

            instance.get("/", (req, reply) => {
                assert.ok(instance.test);
                assert.ok(instance.otherTest);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            assert.notOk(fastify.otherTest);
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("check dependencies - should throw", (done) => {
        const fastify = server();

        expect(5).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                try {
                    i.decorate("otherTest", () => { }, ["test"]);
                    assert.fail();
                } catch (e) {
                    assert.equal(e.code, "FST_ERR_DEC_MISSING_DEPENDENCY");
                    assert.equal(e.message, "FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency 'test'.");
                    expect(true).to.be.ok.mark();
                }
                n();
            }));

            instance.register(fp((i, o, n) => {
                i.decorate("test", () => { });
                assert.ok(i.test);
                assert.notOk(i.otherTest);
                expect(true).to.be.ok.mark();
                n();
            }));

            instance.get("/", (req, reply) => {
                assert.ok(instance.test);
                assert.notOk(instance.otherTest);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("plugin incapsulation", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                i.decorate("test", "first");
                n();
            }));

            instance.get("/first", (req, reply) => {
                reply.send({ plugin: instance.test });
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                i.decorate("test", "second");
                n();
            }));

            instance.get("/second", (req, reply) => {
                reply.send({ plugin: instance.test });
            });

            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/first`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { plugin: "first" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { plugin: "second" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("if a plugin raises an error and there is not a callback to handle it, the server must not start", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            next(new Error("err"));
        });

        fastify.listen(0, (err) => {
            assert.ok(err instanceof Error);
            assert.equal(err.message, "err");
            done();
        });
    });

    it("add hooks after route declaration", (done) => {
        const fastify = server();

        function plugin(instance, opts, next) {
            instance.decorateRequest("check", {});
            setImmediate(next);
        }
        fastify.register(fp(plugin));

        fastify.register((instance, options, next) => {
            instance.addHook("preHandler", function b(req, res, next) {
                req.check.hook2 = true;
                next();
            });

            instance.get("/", (req, reply) => {
                reply.send(req.check);
            });

            instance.addHook("preHandler", function c(req, res, next) {
                req.check.hook3 = true;
                next();
            });

            next();
        });

        fastify.addHook("preHandler", function a(req, res, next) {
            req.check.hook1 = true;
            next();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body), { hook1: true, hook2: true, hook3: true });
                fastify.close();
                done();
            });
        });
    });

    it("nested plugins", (done) => {
        const fastify = server();

        expect(2).checks(() => {
            fastify.close();
            done();
        });

        fastify.register((fastify, opts, next) => {
            fastify.register((fastify, opts, next) => {
                fastify.get("/", (req, reply) => {
                    reply.send("I am child 1");
                });
                next();
            }, { prefix: "/child1" });

            fastify.register((fastify, opts, next) => {
                fastify.get("/", (req, reply) => {
                    reply.send("I am child 2");
                });
                next();
            }, { prefix: "/child2" });

            next();
        }, { prefix: "/parent" });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/parent/child1`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body.toString(), "I am child 1");
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/parent/child2`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.deepEqual(body.toString(), "I am child 2");
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("plugin metadata - decorators", (done) => {
        const fastify = server();

        fastify.decorate("plugin1", true);
        fastify.decorateReply("plugin1", true);
        fastify.decorateRequest("plugin1", true);

        plugin[Symbol.for("skip-override")] = true;
        plugin[Symbol.for("plugin-meta")] = {
            decorators: {
                fastify: ["plugin1"],
                reply: ["plugin1"],
                request: ["plugin1"]
            }
        };

        fastify.register(plugin);

        fastify.ready(() => {
            assert.ok(fastify.plugin);
            done();
        });

        function plugin(instance, opts, next) {
            instance.decorate("plugin", true);
            next();
        }
    });

    it("plugin metadata - dependencies", (done) => {
        const fastify = server();

        dependency[Symbol.for("skip-override")] = true;
        dependency[Symbol.for("plugin-meta")] = {
            name: "plugin"
        };

        plugin[Symbol.for("skip-override")] = true;
        plugin[Symbol.for("plugin-meta")] = {
            dependencies: ["plugin"]
        };

        fastify.register(dependency);
        fastify.register(plugin);

        fastify.ready(() => {
            done(/*"everything right"*/);
        });

        function dependency(instance, opts, next) {
            next();
        }

        function plugin(instance, opts, next) {
            next();
        }
    });

    it("plugin metadata - dependencies (nested)", (done) => {
        const fastify = server();

        dependency[Symbol.for("skip-override")] = true;
        dependency[Symbol.for("plugin-meta")] = {
            name: "plugin"
        };

        nested[Symbol.for("skip-override")] = true;
        nested[Symbol.for("plugin-meta")] = {
            dependencies: ["plugin"]
        };

        fastify.register(dependency);
        fastify.register(plugin);

        fastify.ready(() => {
            done(/*"everything right"*/);
        });

        function dependency(instance, opts, next) {
            next();
        }

        function plugin(instance, opts, next) {
            instance.register(nested);
            next();
        }

        function nested(instance, opts, next) {
            next();
        }
    });

    it("pluginTimeout", (done) => {
        const fastify = server({
            pluginTimeout: 10
        });
        fastify.register((app, opts, next) => {
            // to no call next on purpose
        });
        fastify.ready((err) => {
            assert.ok(err);
            assert.equal(err.code, "ERR_AVVIO_PLUGIN_TIMEOUT");
            done();
        });
    });

    it.todo("pluginTimeout default", (done) => {
        const clock = lolex.install();

        const fastify = server();
        fastify.register((app, opts, next) => {
            // default time elapsed without calling next
            clock.tick(10000);
        });

        fastify.ready((err) => {
            assert.ok(err);
            assert.equal(err.code, "ERR_AVVIO_PLUGIN_TIMEOUT");
            clock.uninstall();
            done();
        });
    });
});
