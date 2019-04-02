const {
    http: { server }
} = adone;

const { plugin: fp } = server;
const sget = require("simple-get").concat;
const symbols = server.symbol;

describe("descortator", () => {
    it("server methods should exist", () => {
        const fastify = server();
        assert.ok(fastify.decorate);
        assert.ok(fastify.hasDecorator);
    });

    it("server methods should be incapsulated via .register", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.decorate("test", () => { });
            assert.ok(instance.test);
            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            done();
        });
    });

    it("hasServerMethod should check if the given method already exist", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.decorate("test", () => { });
            assert.ok(instance.hasDecorator("test"));
            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.hasDecorator("test"));
            done();
        });
    });

    it("decorate should throw if a declared dependency is not present", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            try {
                instance.decorate("test", () => { }, ["dependency"]);
                assert.fail();
            } catch (e) {
                assert.equal(e.message, "FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency 'dependency'.");
            }
            next();
        });

        fastify.ready(() => done());
    });

    // issue #777
    it("should pass error for missing request decorator", (done) => {
        const fastify = server();

        const plugin = fp((instance, opts, next) => {
            next();
        }, {
                decorators: {
                    request: ["foo"]
                }
            });
        fastify
            .register(plugin)
            .ready((err) => {
                assert.instanceOf(err, Error);
                assert.match(err, /The decorator 'foo'/);
                done();
            });
    });

    it("decorateReply inside register", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.decorateReply("test", "test");
            assert.ok(instance[symbols.kReply].prototype.test);

            instance.get("/yes", (req, reply) => {
                assert.ok(reply.test, "test exists");
                reply.send({ hello: "world" });
            });

            next();
        });

        expect(2).checks(done);

        fastify.get("/no", (req, reply) => {
            assert.notOk(reply.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateReply as plugin (inside .after)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                instance.decorateReply("test", "test");
                n();
            })).after(() => {
                instance.get("/yes", (req, reply) => {
                    assert.ok(reply.test);
                    reply.send({ hello: "world" });
                });
            });
            next();
        });

        fastify.get("/no", (req, reply) => {
            assert.notOk(reply.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateReply as plugin (outside .after)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                instance.decorateReply("test", "test");
                n();
            }));

            instance.get("/yes", (req, reply) => {
                assert.ok(reply.test);
                reply.send({ hello: "world" });
            });
            next();
        });

        fastify.get("/no", (req, reply) => {
            assert.notOk(reply.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateRequest inside register", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.decorateRequest("test", "test");
            assert.ok(instance[symbols.kRequest].prototype.test);

            instance.get("/yes", (req, reply) => {
                assert.ok(req.test, "test exists");
                reply.send({ hello: "world" });
            });

            next();
        });

        fastify.get("/no", (req, reply) => {
            assert.notOk(req.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateRequest as plugin (inside .after)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                instance.decorateRequest("test", "test");
                n();
            })).after(() => {
                instance.get("/yes", (req, reply) => {
                    assert.ok(req.test);
                    reply.send({ hello: "world" });
                });
            });
            next();
        });

        fastify.get("/no", (req, reply) => {
            assert.notOk(req.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateRequest as plugin (outside .after)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register(fp((i, o, n) => {
                instance.decorateRequest("test", "test");
                n();
            }));

            instance.get("/yes", (req, reply) => {
                assert.ok(req.test);
                reply.send({ hello: "world" });
            });
            next();
        });

        fastify.get("/no", (req, reply) => {
            assert.notOk(req.test);
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/yes`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorators should be instance separated", () => {
        const fastify1 = server();
        const fastify2 = server();

        fastify1.decorate("test", "foo");
        fastify2.decorate("test", "foo");

        fastify1.decorateRequest("test", "foo");
        fastify2.decorateRequest("test", "foo");

        fastify1.decorateReply("test", "foo");
        fastify2.decorateReply("test", "foo");
    });

    describe("hasRequestDecorator", () => {
        const requestDecoratorName = "my-decorator-name";

        it("is a function", () => {
            const fastify = server();
            assert.ok(fastify.hasRequestDecorator);
        });

        it("should check if the given request decoration already exist", () => {
            const fastify = server();

            assert.notOk(fastify.hasRequestDecorator(requestDecoratorName));
            fastify.decorateRequest(requestDecoratorName, 42);
            assert.ok(fastify.hasRequestDecorator(requestDecoratorName));
        });

        it("should be plugin encapsulable", (done) => {
            const fastify = server();

            expect(2).checks(done);

            assert.notOk(fastify.hasRequestDecorator(requestDecoratorName));

            fastify.register((fastify2, opts, next) => {
                fastify2.decorateRequest(requestDecoratorName, 42);
                assert.ok(fastify2.hasRequestDecorator(requestDecoratorName));
                expect(true).to.be.ok.mark();
                next();
            });

            assert.notOk(fastify.hasRequestDecorator(requestDecoratorName));

            fastify.ready(() => {
                assert.notOk(fastify.hasRequestDecorator(requestDecoratorName));
                expect(true).to.be.ok.mark();
            });
        });

        it("should be inherited", (done) => {
            const fastify = server();

            expect(2).checks(done);

            fastify.decorateRequest(requestDecoratorName, 42);

            fastify.register((fastify2, opts, next) => {
                assert.ok(fastify2.hasRequestDecorator(requestDecoratorName));
                expect(true).to.be.ok.mark();
                next();
            });

            fastify.ready(() => {
                assert.ok(fastify.hasRequestDecorator(requestDecoratorName));
                expect(true).to.be.ok.mark();
            });
        });
    });

    describe("hasReplyDecorator", () => {
        const replyDecoratorName = "my-decorator-name";

        it("is a function", () => {
            const fastify = server();
            assert.ok(fastify.hasReplyDecorator);
        });

        it("should check if the given reply decoration already exist", () => {
            const fastify = server();

            assert.notOk(fastify.hasReplyDecorator(replyDecoratorName));
            fastify.decorateReply(replyDecoratorName, 42);
            assert.ok(fastify.hasReplyDecorator(replyDecoratorName));
        });

        it("should be plugin encapsulable", (done) => {
            const fastify = server();

            expect(2).checks(done);

            assert.notOk(fastify.hasReplyDecorator(replyDecoratorName));

            fastify.register((fastify2, opts, next) => {
                fastify2.decorateReply(replyDecoratorName, 42);
                assert.ok(fastify2.hasReplyDecorator(replyDecoratorName));
                expect(true).to.be.ok.mark();
                next();
            });

            assert.notOk(fastify.hasReplyDecorator(replyDecoratorName));

            fastify.ready(() => {
                assert.notOk(fastify.hasReplyDecorator(replyDecoratorName));
                expect(true).to.be.ok.mark();
            });
        });

        it("should be inherited", (done) => {
            const fastify = server();

            expect(2).checks(done);

            fastify.decorateReply(replyDecoratorName, 42);

            fastify.register((fastify2, opts, next) => {
                assert.ok(fastify2.hasReplyDecorator(replyDecoratorName));
                expect(true).to.be.ok.mark();
                next();
            });

            fastify.ready(() => {
                assert.ok(fastify.hasReplyDecorator(replyDecoratorName));
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("should register properties via getter/setter objects", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.decorate("test", {
                getter() {
                    return "a getter";
                }
            });
            assert.ok(instance.test);
            assert.equal(instance.test, "a getter");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            expect(true).to.be.ok.mark();
            done();
        });
    });

    it("decorateRequest should work with getter/setter", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.decorateRequest("test", {
                getter() {
                    return "a getter";
                }
            });

            instance.get("/req-decorated-get-set", (req, res) => {
                res.send({ test: req.test });
            });

            next();
        });

        fastify.get("/not-decorated", (req, res) => {
            assert.notOk(req.test);
            expect(true).to.be.ok.mark();
            res.send();
        });

        fastify.ready(() => {
            fastify.inject({ url: "/req-decorated-get-set" }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), { test: "a getter" });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({ url: "/not-decorated" }, (err, res) => {
                assert.notExists(err);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("decorateReply should work with getter/setter", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.decorateReply("test", {
                getter() {
                    return "a getter";
                }
            });

            instance.get("/res-decorated-get-set", (req, res) => {
                res.send({ test: res.test });
            });

            next();
        });

        fastify.get("/not-decorated", (req, res) => {
            assert.notOk(res.test);
            expect(true).to.be.ok.mark();
            res.send();
        });

        fastify.ready(() => {
            fastify.inject({ url: "/res-decorated-get-set" }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), { test: "a getter" });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({ url: "/not-decorated" }, (err, res) => {
                assert.notExists(err);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("should register empty values", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.decorate("test", null);
            assert.isTrue(instance.hasOwnProperty("test"));
            next();
        });

        fastify.ready(() => {
            assert.notOk(fastify.test);
            done();
        });
    });

    it("nested plugins can override things", (done) => {
        const fastify = server();

        expect(2).checks(done);

        const rootFunc = () => { };
        fastify.decorate("test", rootFunc);
        fastify.decorateRequest("test", rootFunc);
        fastify.decorateReply("test", rootFunc);

        fastify.register((instance, opts, next) => {
            const func = () => { };
            instance.decorate("test", func);
            instance.decorateRequest("test", func);
            instance.decorateReply("test", func);

            assert.equal(instance.test, func);
            assert.equal(instance[symbols.kRequest].prototype.test, func);
            assert.equal(instance[symbols.kReply].prototype.test, func);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.ready(() => {
            assert.equal(fastify.test, rootFunc);
            assert.equal(fastify[symbols.kRequest].prototype.test, rootFunc);
            assert.equal(fastify[symbols.kReply].prototype.test, rootFunc);
            expect(true).to.be.ok.mark();
        });
    });

    it("a decorator should addSchema to all the encapsulated tree", (done) => {
        const fastify = server();

        const decorator = function (instance, opts, next) {
            instance.decorate("decoratorAddSchema", (whereAddTheSchema) => {
                instance.addSchema({
                    $id: "schema",
                    type: "string"
                });
            });
            next();
        };

        fastify.register(fp(decorator));

        fastify.register((instance, opts, next) => {
            instance.register((subInstance, opts, next) => {
                subInstance.decoratorAddSchema();
                next();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            done();
        });
    });
});
