const {
    semver,
    std: { stream, fs },
    web: { server }
} = adone;

const sget = require("simple-get").concat;
const { plugin: fp, symbol: symbols } = server;
const split = require("split2");

const payload = { hello: "world" };

describe("hooks", () => {
    it("hooks", (done) => {
        const fastify = server();

        expect(20).checks(done);

        try {
            fastify.addHook("preHandler", (request, reply, next) => {
                assert.equal(request.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                if (request.raw.method === "HEAD") {
                    next(new Error("some error"));
                } else {
                    next();
                }
                expect(true).to.be.ok.mark();
            });
        } catch (e) {
            assert.fail();
        }

        try {
            fastify.addHook("preParsing", (request, reply, next) => {
                request.preParsing = true;
                assert.equal(request.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                next();
                expect(true).to.be.ok.mark();
            });
        } catch (e) {
            assert.fail();
        }

        try {
            fastify.addHook("preValidation", (request, reply, next) => {
                assert.equal(request.preParsing, true);
                assert.equal(request.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                next();
                expect(true).to.be.ok.mark();
            });
        } catch (e) {
            assert.fail();
        }

        try {
            fastify.addHook("preSerialization", (request, reply, payload, next) => {
                assert.ok("preSerialization called");
                next();
                expect(true).to.be.ok.mark();
            });
        } catch (e) {
            assert.fail();
        }

        try {
            fastify.addHook("onRequest", (request, reply, next) => {
                request.test = "the request is coming";
                reply.test = "the reply has come";
                if (request.raw.method === "DELETE") {
                    next(new Error("some error"));
                } else {
                    next();
                }
                expect(true).to.be.ok.mark();
            });
        } catch (e) {
            assert.fail();
        }

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("onResponse called");
            next();
            expect(true).to.be.ok.mark();
        });

        fastify.addHook("onSend", (req, reply, thePayload, next) => {
            assert.ok("onSend called");
            next();
            expect(true).to.be.ok.mark();
        });

        fastify.route({
            method: "GET",
            url: "/",
            handler(req, reply) {
                assert.equal(req.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                reply.code(200).send(payload);
                expect(true).to.be.ok.mark();
            },
            response: {
                200: {
                    type: "object"
                }
            }
        });

        fastify.head("/", (req, reply) => {
            reply.code(200).send(payload);
        });

        fastify.delete("/", (req, reply) => {
            reply.code(200).send(payload);
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

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onRequest hook should support encapsulation / 1", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onRequest", (req, reply, next) => {
                assert.strictEqual(req.raw.url, "/plugin");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/plugin", (request, reply) => {
                reply.send();
            });

            next();
        });

        fastify.get("/root", (request, reply) => {
            reply.send();
        });

        fastify.inject("/root", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject("/plugin", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRequest hook should support encapsulation / 2", (done) => {
        const fastify = server();
        let pluginInstance;

        fastify.addHook("onRequest", () => { });

        fastify.register((instance, opts, next) => {
            instance.addHook("onRequest", () => { });
            pluginInstance = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.equal(fastify[symbols.kHooks].onRequest.length, 1);
            assert.equal(pluginInstance[symbols.kHooks].onRequest.length, 2);
            done();
        });
    });

    it("onRequest hook should support encapsulation / 3", (done) => {
        const fastify = server();
        fastify.decorate("hello", "world");

        expect(7).checks(done);

        fastify.addHook("onRequest", function (req, reply, next) {
            assert.ok(this.hello);
            assert.ok(this.hello2);
            req.first = true;
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.decorate("hello2", "world");

        fastify.get("/first", (req, reply) => {
            assert.ok(req.first);
            assert.notOk(req.second);
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello3", "world");
            instance.addHook("onRequest", function (req, reply, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                assert.ok(this.hello3);
                expect(true).to.be.ok.mark();
                req.second = true;
                next();
            });

            instance.get("/second", (req, reply) => {
                assert.ok(req.first);
                assert.ok(req.second);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("preHandler hook should support encapsulation / 5", (done) => {
        const fastify = server();
        fastify.decorate("hello", "world");

        expect(7).checks(done);

        fastify.addHook("preHandler", function (req, res, next) {
            assert.ok(this.hello);
            req.first = true;
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/first", (req, reply) => {
            assert.ok(req.first);
            assert.notOk(req.second);
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello2", "world");
            instance.addHook("preHandler", function (req, res, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                expect(true).to.be.ok.mark();
                req.second = true;
                next();
            });

            instance.get("/second", (req, reply) => {
                assert.ok(req.first);
                assert.ok(req.second);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onRoute hook should be called / 1", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", () => {
                expect(true).to.be.ok.mark();
            });
            instance.get("/", opts, (req, reply) => {
                reply.send();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should be called / 2", (done) => {
        let firstHandler = 0;
        let secondHandler = 0;
        const fastify = server();

        expect(4).checks(done);


        fastify.addHook("onRoute", (route) => {
            expect(true).to.be.ok.mark();
            firstHandler++;
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                expect(true).to.be.ok.mark();
                secondHandler++;
            });
            instance.get("/", opts, (req, reply) => {
                reply.send();
            });
            next();
        }).after(() => {
            assert.strictEqual(firstHandler, 1);
            assert.strictEqual(secondHandler, 1);
            expect(true).to.be.ok.mark();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should be called / 3", (done) => {
        const fastify = server();

        expect(6).checks(done);

        function handler(req, reply) {
            reply.send();
        }

        fastify.addHook("onRoute", (route) => {
            expect(true).to.be.ok.mark();
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                expect(true).to.be.ok.mark();
            });
            instance.get("/a", handler);
            next();
        })
            .after((err, done) => {
                assert.notExists(err);
                expect(true).to.be.ok.mark();
                setTimeout(() => {
                    fastify.get("/b", handler);
                    done();
                }, 10);
            });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute should keep the context", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.decorate("test", true);
            instance.addHook("onRoute", onRoute);
            assert.ok(instance.prototype === fastify.prototype);
            expect(true).to.be.ok.mark();

            function onRoute(route) {
                assert.ok(this.test);
                assert.strictEqual(this, instance);
                expect(true).to.be.ok.mark();
            }

            instance.get("/", opts, (req, reply) => {
                reply.send();
            });

            next();
        });

        fastify.close((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should pass correct route", (done) => {
        const fastify = server();

        expect(3).checks(done);
        fastify.addHook("onRoute", (route) => {
            assert.strictEqual(route.method, "GET");
            assert.strictEqual(route.url, "/");
            assert.strictEqual(route.path, "/");
            expect(true).to.be.ok.mark();
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.method, "GET");
                assert.strictEqual(route.url, "/");
                assert.strictEqual(route.path, "/");
                expect(true).to.be.ok.mark();
            });
            instance.get("/", opts, (req, reply) => {
                reply.send();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should pass correct route with custom prefix", (done) => {
        const fastify = server();
        expect(3).checks(done);
        fastify.addHook("onRoute", (route) => {
            assert.strictEqual(route.method, "GET");
            assert.strictEqual(route.url, "/v1/foo");
            assert.strictEqual(route.path, "/v1/foo");
            assert.strictEqual(route.prefix, "/v1");
            expect(true).to.be.ok.mark();
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.method, "GET");
                assert.strictEqual(route.url, "/v1/foo");
                assert.strictEqual(route.path, "/v1/foo");
                assert.strictEqual(route.prefix, "/v1");
                expect(true).to.be.ok.mark();
            });
            instance.get("/foo", opts, (req, reply) => {
                reply.send();
            });
            next();
        }, { prefix: "/v1" });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should pass correct route with custom options", (done) => {
        const fastify = server();

        expect(2).checks(done);
        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.method, "GET");
                assert.strictEqual(route.url, "/foo");
                assert.strictEqual(route.logLevel, "info");
                assert.strictEqual(route.bodyLimit, 100);
                expect(true).to.be.ok.mark();
            });
            instance.get("/foo", { logLevel: "info", bodyLimit: 100 }, (req, reply) => {
                reply.send();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should receive any route option", (done) => {
        const fastify = server();
        expect(2).checks(done);
        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.method, "GET");
                assert.strictEqual(route.url, "/foo");
                assert.strictEqual(route.auth, "basic");
                expect(true).to.be.ok.mark();
            });
            instance.get("/foo", { auth: "basic" }, (req, reply) => {
                reply.send();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should preserve system route configuration", (done) => {
        const fastify = server();
        expect(2).checks(done);
        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.method, "GET");
                assert.strictEqual(route.url, "/foo");
                assert.strictEqual(route.handler.length, 2);
                expect(true).to.be.ok.mark();
            });
            instance.get("/foo", { url: "/bar", method: "POST" }, (req, reply) => {
                reply.send();
            });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRoute hook should preserve handler function in options of shorthand route system configuration", (done) => {
        const handler = (req, reply) => { };

        const fastify = server();
        expect(2).checks(done);
        fastify.register((instance, opts, next) => {
            instance.addHook("onRoute", (route) => {
                assert.strictEqual(route.handler, handler);
                expect(true).to.be.ok.mark();
            });
            instance.get("/foo", { handler });
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onResponse hook should log request error", (done) => {
        let fastify = null;
        expect(2).checks(done);
        const logStream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream: logStream,
                    level: "error"
                }
            });
        } catch (e) {
            assert.fail();
        }

        logStream.once("data", (line) => {
            assert.equal(line.msg, "request errored");
            assert.equal(line.level, 50);
            expect(true).to.be.ok.mark();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            next(new Error("kaboom"));
        });

        fastify.get("/root", (request, reply) => {
            reply.send();
        });

        fastify.inject("/root", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("onResponse hook should support encapsulation / 1", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onResponse", (request, reply, next) => {
                assert.strictEqual(reply.plugin, true);
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/plugin", (request, reply) => {
                reply.plugin = true;
                reply.send();
            });

            next();
        });

        fastify.get("/root", (request, reply) => {
            reply.send();
        });

        fastify.inject("/root", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject("/plugin", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("onResponse hook should support encapsulation / 2", (done) => {
        const fastify = server();
        let pluginInstance;

        fastify.addHook("onResponse", () => { });

        fastify.register((instance, opts, next) => {
            instance.addHook("onResponse", () => { });
            pluginInstance = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.equal(fastify[symbols.kHooks].onResponse.length, 1);
            assert.equal(pluginInstance[symbols.kHooks].onResponse.length, 2);
            done();
        });
    });

    it("onResponse hook should support encapsulation / 3", (done) => {
        const fastify = server();

        expect(5).checks(done);
        fastify.decorate("hello", "world");

        fastify.addHook("onResponse", function (request, reply, next) {
            assert.ok(this.hello);
            assert.ok("onResponse called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/first", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello2", "world");
            instance.addHook("onResponse", function (request, reply, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                assert.ok("onResponse called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/second", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onSend hook should support encapsulation / 1", (done) => {
        const fastify = server();
        let pluginInstance;

        fastify.addHook("onSend", () => { });

        fastify.register((instance, opts, next) => {
            instance.addHook("onSend", () => { });
            pluginInstance = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.equal(fastify[symbols.kHooks].onSend.length, 1);
            assert.equal(pluginInstance[symbols.kHooks].onSend.length, 2);
            done();
        });
    });

    it("onSend hook should support encapsulation / 2", (done) => {
        const fastify = server();

        expect(5).checks(done);
        fastify.decorate("hello", "world");

        fastify.addHook("onSend", function (request, reply, thePayload, next) {
            assert.ok(this.hello);
            assert.ok("onSend called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/first", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello2", "world");
            instance.addHook("onSend", function (request, reply, thePayload, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                assert.ok("onSend called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/second", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onSend hook is called after payload is serialized and headers are set", (done) => {
        const fastify = server();

        expect(10).checks(done);

        fastify.register((instance, opts, next) => {
            const thePayload = { hello: "world" };

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.deepEqual(JSON.parse(payload), thePayload);
                assert.strictEqual(reply[symbols.kReplyHeaders]["content-type"], "application/json; charset=utf-8");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/json", (request, reply) => {
                reply.send(thePayload);
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(payload, "some text");
                assert.strictEqual(reply[symbols.kReplyHeaders]["content-type"], "text/plain; charset=utf-8");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/text", (request, reply) => {
                reply.send("some text");
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            const thePayload = Buffer.from("buffer payload");

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(payload, thePayload);
                assert.strictEqual(reply[symbols.kReplyHeaders]["content-type"], "application/octet-stream");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/buffer", (request, reply) => {
                reply.send(thePayload);
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            let chunk = "stream payload";
            const thePayload = new stream.Readable({
                read() {
                    this.push(chunk);
                    chunk = null;
                }
            });

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(payload, thePayload);
                assert.strictEqual(reply[symbols.kReplyHeaders]["content-type"], "application/octet-stream");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/stream", (request, reply) => {
                reply.send(thePayload);
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            const serializedPayload = "serialized";

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(payload, serializedPayload);
                assert.strictEqual(reply[symbols.kReplyHeaders]["content-type"], "text/custom");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/custom-serializer", (request, reply) => {
                reply
                    .serializer(() => serializedPayload)
                    .type("text/custom")
                    .send("needs to be serialized");
            });

            next();
        });

        fastify.inject({
            method: "GET",
            url: "/json"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            assert.strictEqual(res.headers["content-length"], "17");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/text"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(res.payload, "some text");
            assert.strictEqual(res.headers["content-length"], "9");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/buffer"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(res.payload, "buffer payload");
            assert.strictEqual(res.headers["content-length"], "14");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/stream"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(res.payload, "stream payload");
            assert.strictEqual(res.headers["transfer-encoding"], "chunked");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/custom-serializer"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(res.payload, "serialized");
            assert.strictEqual(res.headers["content-type"], "text/custom");
            expect(true).to.be.ok.mark();
        });
    });

    it("modify payload", (done) => {
        const fastify = server();
        expect(4).checks(done);
        const payload = { hello: "world" };
        const modifiedPayload = { hello: "modified" };
        const anotherPayload = '"winter is coming"';

        fastify.addHook("onSend", (request, reply, thePayload, next) => {
            assert.ok("onSend called");
            assert.deepEqual(JSON.parse(thePayload), payload);
            expect(true).to.be.ok.mark();
            thePayload = thePayload.replace("world", "modified");
            next(null, thePayload);
        });

        fastify.addHook("onSend", (request, reply, thePayload, next) => {
            assert.ok("onSend called");
            assert.deepEqual(JSON.parse(thePayload), modifiedPayload);
            expect(true).to.be.ok.mark();
            next(null, anotherPayload);
        });

        fastify.addHook("onSend", (request, reply, thePayload, next) => {
            assert.ok("onSend called");
            assert.strictEqual(thePayload, anotherPayload);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send(payload);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.payload, anotherPayload);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "18");
            expect(true).to.be.ok.mark();
        });
    });

    it("clear payload", (done) => {
        const fastify = server();
        expect(2).checks(done);

        fastify.addHook("onSend", (request, reply, payload, next) => {
            assert.ok("onSend called");
            expect(true).to.be.ok.mark();
            reply.code(304);
            next(null, null);
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 304);
            assert.strictEqual(res.payload, "");
            assert.strictEqual(res.headers["content-length"], undefined);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            expect(true).to.be.ok.mark();
        });
    });

    it("onSend hook throws", (done) => {
        const fastify = server();
        expect(2).checks(done);
        fastify.addHook("onSend", (request, reply, payload, next) => {
            if (request.raw.method === "DELETE") {
                next(new Error("some error"));
                return;
            }
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.delete("/", (req, reply) => {
            reply.send({ hello: "world" });
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
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onSend hook should receive valid request and reply objects if onRequest hook fails", (done) => {
        const fastify = server();
        expect(2).checks(done);

        fastify.decorateRequest("testDecorator", "testDecoratorVal");
        fastify.decorateReply("testDecorator", "testDecoratorVal");

        fastify.addHook("onRequest", (req, reply, next) => {
            next(new Error("onRequest hook failed"));
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            assert.strictEqual(request.testDecorator, "testDecoratorVal");
            assert.strictEqual(reply.testDecorator, "testDecoratorVal");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send("hello");
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            expect(true).to.be.ok.mark();
        });
    });

    it("onSend hook should receive valid request and reply objects if middleware fails", (done) => {
        const fastify = server();
        expect(2).checks(done);

        fastify.decorateRequest("testDecorator", "testDecoratorVal");
        fastify.decorateReply("testDecorator", "testDecoratorVal");

        fastify.use((req, res, next) => {
            next(new Error("middlware failed"));
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            assert.strictEqual(request.testDecorator, "testDecoratorVal");
            assert.strictEqual(reply.testDecorator, "testDecoratorVal");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send("hello");
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            expect(true).to.be.ok.mark();
        });
    });

    it("onSend hook should receive valid request and reply objects if a custom content type parser fails", (done) => {
        const fastify = server();
        expect(2).checks(done);

        fastify.decorateRequest("testDecorator", "testDecoratorVal");
        fastify.decorateReply("testDecorator", "testDecoratorVal");

        fastify.addContentTypeParser("*", (req, done) => {
            done(new Error("content type parser failed"));
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            assert.strictEqual(request.testDecorator, "testDecoratorVal");
            assert.strictEqual(reply.testDecorator, "testDecoratorVal");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send("hello");
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: "body"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            expect(true).to.be.ok.mark();
        });
    });

    it("cannot add hook after binding", (done) => {
        const instance = server();

        instance.get("/", (request, reply) => {
            reply.send({ hello: "world" });
        });

        instance.listen(0, (err) => {
            assert.notExists(err);

            try {
                instance.addHook("onRequest", () => { });
                assert.fail();
            } catch (e) {
                instance.server.close();
                done();
            }
        });
    });

    it("onRequest hooks should be able to block a request", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.addHook("onRequest", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("onRequest", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation hooks should be able to block a request", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.addHook("preValidation", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("preValidation", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it("preParsing hooks should be able to block a request", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.addHook("preParsing", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("preParsing", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler hooks should be able to block a request", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.addHook("preHandler", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.equal(payload, "hello");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it("onRequest hooks should be able to block a request (last hook)", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.addHook("onRequest", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler hooks should be able to block a request (last hook)", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.addHook("preHandler", (req, reply, next) => {
            reply.send("hello");
            next();
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.equal(payload, "hello");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.equal(res.payload, "hello");
            expect(true).to.be.ok.mark();
        });
    });

    it.todo("onRequest respond with a stream", (done) => {
        const fastify = server();
        expect(10).checks(done);

        fastify.addHook("onRequest", (req, reply, next) => {
            const stream = fs.createReadStream(`${process.cwd()}/test/stream.test.js`, "utf8");
            // stream.pipe(res)
            // res.once('finish', next)
            reply.send(stream);
        });

        fastify.addHook("onRequest", (req, res, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it.todo("preHandler respond with a stream", (done) => {
        const fastify = server();

        expect(6).checks(done);

        fastify.addHook("onRequest", (req, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        // we are calling `reply.send` inside the `preHandler` hook with a stream,
        // this triggers the `onSend` hook event if `preHanlder` has not yet finished
        const order = [1, 2];

        fastify.addHook("preHandler", (req, reply, next) => {
            const stream = fs.createReadStream(`${process.cwd()}/test/stream.test.js`, "utf8");
            reply.send(stream);
            reply.res.once("finish", () => {
                assert.equal(order.shift(), 2);
                expect(true).to.be.ok.mark();
                next();
            });
        });

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.fail("this should not be called");
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.equal(order.shift(), 1);
            assert.equal(typeof payload.pipe, "function");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.fail("we should not be here");
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("Register an hook after a plugin inside a plugin", (done) => {
        const fastify = server();

        expect(4).checks(done);

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        }));

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }));

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Register an hook after a plugin inside a plugin (with preHandler option)", (done) => {
        const fastify = server();
        expect(5).checks(done);

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/", {
                preHandler: (req, reply, next) => {
                    assert.ok("called");
                    expect(true).to.be.ok.mark();
                    next();
                }
            }, (request, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        }));

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.addHook("preHandler", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }));

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Register hooks inside a plugin after an encapsulated plugin", (done) => {
        const fastify = server();
        expect(5).checks(done);

        fastify.register((instance, opts, next) => {
            instance.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        });

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("onRequest", (req, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.addHook("preHandler", (request, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.addHook("onResponse", (request, reply, next) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }));

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("onRequest hooks should run in the order in which they are defined", (done) => {
        const fastify = server();
        expect(7).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onRequest", (req, reply, next) => {
                assert.strictEqual(req.previous, undefined);
                expect(true).to.be.ok.mark();
                req.previous = 1;
                next();
            });

            instance.get("/", (request, reply) => {
                assert.strictEqual(request.previous, 5);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onRequest", (req, reply, next) => {
                    assert.strictEqual(req.previous, 1);
                    expect(true).to.be.ok.mark();
                    req.previous = 2;
                    next();
                });
                next();
            }));

            next();
        });

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("onRequest", (req, reply, next) => {
                assert.strictEqual(req.previous, 2);
                expect(true).to.be.ok.mark();
                req.previous = 3;
                next();
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onRequest", (req, reply, next) => {
                    assert.strictEqual(req.previous, 3);
                    expect(true).to.be.ok.mark();
                    req.previous = 4;
                    next();
                });
                next();
            }));

            instance.addHook("onRequest", (req, reply, next) => {
                assert.strictEqual(req.previous, 4);
                expect(true).to.be.ok.mark();
                req.previous = 5;
                next();
            });

            next();
        }));

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler hooks should run in the order in which they are defined", (done) => {
        const fastify = server();
        expect(7).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("preHandler", (request, reply, next) => {
                assert.strictEqual(request.previous, undefined);
                expect(true).to.be.ok.mark();
                request.previous = 1;
                next();
            });

            instance.get("/", (request, reply) => {
                assert.strictEqual(request.previous, 5);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("preHandler", (request, reply, next) => {
                    assert.strictEqual(request.previous, 1);
                    expect(true).to.be.ok.mark();
                    request.previous = 2;
                    next();
                });
                next();
            }));

            next();
        });

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("preHandler", (request, reply, next) => {
                assert.strictEqual(request.previous, 2);
                expect(true).to.be.ok.mark();
                request.previous = 3;
                next();
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("preHandler", (request, reply, next) => {
                    assert.strictEqual(request.previous, 3);
                    expect(true).to.be.ok.mark();
                    request.previous = 4;
                    next();
                });
                next();
            }));

            instance.addHook("preHandler", (request, reply, next) => {
                assert.strictEqual(request.previous, 4);
                expect(true).to.be.ok.mark();
                request.previous = 5;
                next();
            });

            next();
        }));

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("onSend hooks should run in the order in which they are defined", (done) => {
        const fastify = server();
        expect(6).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(request.previous, undefined);
                expect(true).to.be.ok.mark();
                request.previous = 1;
                next();
            });

            instance.get("/", (request, reply) => {
                reply.send({});
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onSend", (request, reply, payload, next) => {
                    assert.strictEqual(request.previous, 1);
                    expect(true).to.be.ok.mark();
                    request.previous = 2;
                    next();
                });
                next();
            }));

            next();
        });

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(request.previous, 2);
                expect(true).to.be.ok.mark();
                request.previous = 3;
                next();
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onSend", (request, reply, payload, next) => {
                    assert.strictEqual(request.previous, 3);
                    expect(true).to.be.ok.mark();
                    request.previous = 4;
                    next();
                });
                next();
            }));

            instance.addHook("onSend", (request, reply, payload, next) => {
                assert.strictEqual(request.previous, 4);
                expect(true).to.be.ok.mark();
                next(null, "5");
            });

            next();
        }));

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), 5);
            expect(true).to.be.ok.mark();
        });
    });

    it("onResponse hooks should run in the order in which they are defined", (done) => {
        const fastify = server();

        expect(6).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("onResponse", (request, reply, next) => {
                assert.strictEqual(reply.previous, undefined);
                expect(true).to.be.ok.mark();
                reply.previous = 1;
                next();
            });

            instance.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onResponse", (request, reply, next) => {
                    assert.strictEqual(reply.previous, 1);
                    expect(true).to.be.ok.mark();
                    reply.previous = 2;
                    next();
                });
                next();
            }));

            next();
        });

        fastify.register(fp((instance, opts, next) => {
            instance.addHook("onResponse", (request, reply, next) => {
                assert.strictEqual(reply.previous, 2);
                expect(true).to.be.ok.mark();
                reply.previous = 3;
                next();
            });

            instance.register(fp((i, opts, next) => {
                i.addHook("onResponse", (request, reply, next) => {
                    assert.strictEqual(reply.previous, 3);
                    expect(true).to.be.ok.mark();
                    reply.previous = 4;
                    next();
                });
                next();
            }));

            instance.addHook("onResponse", (request, reply, next) => {
                assert.strictEqual(reply.previous, 4);
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }));

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("onRequest, preHandler, and onResponse hooks that resolve to a value do not cause an error", (done) => {
        const fastify = server();

        fastify
            .addHook("onRequest", () => Promise.resolve(1))
            .addHook("onRequest", () => Promise.resolve(true))
            .addHook("preValidation", () => Promise.resolve(null))
            .addHook("preValidation", () => Promise.resolve("a"))
            .addHook("preHandler", () => Promise.resolve(null))
            .addHook("preHandler", () => Promise.resolve("a"))
            .addHook("onResponse", () => Promise.resolve({}))
            .addHook("onResponse", () => Promise.resolve([]));

        fastify.get("/", (request, reply) => {
            reply.send("hello");
        });

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload, "hello");
            done();
        });
    });

    it("If a response header has been set inside an hook it shoulod not be overwritten by the final response handler", (done) => {
        const fastify = server();

        fastify.addHook("onRequest", (req, reply, next) => {
            reply.header("X-Custom-Header", "hello");
            next();
        });

        fastify.get("/", (request, reply) => {
            reply.send("hello");
        });

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.headers["x-custom-header"], "hello");
            assert.strictEqual(res.headers["content-type"], "text/plain; charset=utf-8");
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload, "hello");
            done();
        });
    });

    it("If the content type has been set inside an hook it should not be changed", (done) => {
        const fastify = server();

        fastify.addHook("onRequest", (req, reply, next) => {
            reply.header("content-type", "text/html");
            next();
        });

        fastify.get("/", (request, reply) => {
            assert.ok(reply[symbols.kReplyHeaders]["content-type"]);
            reply.send("hello");
        });

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.headers["content-type"], "text/html");
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.payload, "hello");
            done();
        });
    });

    it("request in onRequest, preParsing, preValidation and onResponse", (done) => {
        const fastify = server();

        expect(5).checks(done);

        fastify.addHook("onRequest", (request, reply, next) => {
            assert.deepEqual(request.body, null);
            assert.deepEqual(request.query, { key: "value" });
            assert.deepEqual(request.params, { greeting: "hello" });
            assert.deepEqual(request.headers, {
                "content-length": "17",
                "content-type": "application/json",
                host: "localhost:80",
                "user-agent": "lightMyRequest",
                "x-custom": "hello"
            });
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("preParsing", (request, reply, next) => {
            assert.deepEqual(request.body, null);
            assert.deepEqual(request.query, { key: "value" });
            assert.deepEqual(request.params, { greeting: "hello" });
            assert.deepEqual(request.headers, {
                "content-length": "17",
                "content-type": "application/json",
                host: "localhost:80",
                "user-agent": "lightMyRequest",
                "x-custom": "hello"
            });
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("preValidation", (request, reply, next) => {
            assert.deepEqual(request.body, { hello: "world" });
            assert.deepEqual(request.query, { key: "value" });
            assert.deepEqual(request.params, { greeting: "hello" });
            assert.deepEqual(request.headers, {
                "content-length": "17",
                "content-type": "application/json",
                host: "localhost:80",
                "user-agent": "lightMyRequest",
                "x-custom": "hello"
            });
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            assert.deepEqual(request.body, { hello: "world" });
            assert.deepEqual(request.query, { key: "value" });
            assert.deepEqual(request.params, { greeting: "hello" });
            assert.deepEqual(request.headers, {
                "content-length": "17",
                "content-type": "application/json",
                host: "localhost:80",
                "user-agent": "lightMyRequest",
                "x-custom": "hello"
            });
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.post("/:greeting", (req, reply) => {
            reply.send("ok");
        });

        fastify.inject({
            method: "POST",
            url: "/hello?key=value",
            headers: { "x-custom": "hello" },
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation hook should support encapsulation / 1", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("preValidation", (req, reply, next) => {
                assert.strictEqual(req.raw.url, "/plugin");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/plugin", (request, reply) => {
                reply.send();
            });

            next();
        });

        fastify.get("/root", (request, reply) => {
            reply.send();
        });

        fastify.inject("/root", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject("/plugin", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation hook should support encapsulation / 2", (done) => {
        const fastify = server();
        let pluginInstance;

        fastify.addHook("preValidation", () => { });

        fastify.register((instance, opts, next) => {
            instance.addHook("preValidation", () => { });
            pluginInstance = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.equal(fastify[symbols.kHooks].preValidation.length, 1);
            assert.equal(pluginInstance[symbols.kHooks].preValidation.length, 2);
            done();
        });
    });

    it("preValidation hook should support encapsulation / 3", (done) => {
        const fastify = server();
        expect(7).checks(done);
        fastify.decorate("hello", "world");

        fastify.addHook("preValidation", function (req, reply, next) {
            assert.ok(this.hello);
            assert.ok(this.hello2);
            expect(true).to.be.ok.mark();
            req.first = true;
            next();
        });

        fastify.decorate("hello2", "world");

        fastify.get("/first", (req, reply) => {
            assert.ok(req.first);
            assert.notOk(req.second);
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello3", "world");
            instance.addHook("preValidation", function (req, reply, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                assert.ok(this.hello3);
                expect(true).to.be.ok.mark();
                req.second = true;
                next();
            });

            instance.get("/second", (req, reply) => {
                assert.ok(req.first);
                assert.ok(req.second);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onError hook", (done) => {
        const fastify = server();
        expect(2).checks(done);

        const err = new Error("kaboom");

        fastify.addHook("onError", (request, reply, error, next) => {
            assert.strictEqual(error, err);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send(err);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Internal Server Error",
                message: "kaboom",
                statusCode: 500
            });
            expect(true).to.be.ok.mark();
        });
    });

    it("reply.send should throw if called inside the onError hook", (done) => {
        const fastify = server();

        expect(2).checks(done);

        const err = new Error("kaboom");

        fastify.addHook("onError", (request, reply, error, next) => {
            try {
                reply.send();
                assert.fail("Should throw");
            } catch (err) {
                assert.equal(err.code, "FST_ERR_SEND_INSIDE_ONERR");

                expect(true).to.be.ok.mark();
            }
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send(err);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Internal Server Error",
                message: "kaboom",
                statusCode: 500
            });
            expect(true).to.be.ok.mark();
        });
    });

    describe("onError hook with setErrorHandler", () => {
        it("Send error", (done) => {
            const fastify = server();
            expect(2).checks(done);

            const err = new Error("ouch");

            fastify.setErrorHandler((_, req, reply) => {
                reply.send(err);
            });

            fastify.addHook("onError", (request, reply, error, next) => {
                assert.strictEqual(error, err);
                expect(true).to.be.ok.mark();
                next();
            });

            fastify.get("/", (req, reply) => {
                reply.send(new Error("kaboom"));
            });

            fastify.inject({
                method: "GET",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), {
                    error: "Internal Server Error",
                    message: "ouch",
                    statusCode: 500
                });
                expect(true).to.be.ok.mark();
            });
        });

        it("Hide error", (done) => {
            const fastify = server();

            fastify.setErrorHandler((_, req, reply) => {
                reply.send({ hello: "world" });
            });

            fastify.addHook("onError", (request, reply, error, next) => {
                assert.fail("Should not be called");
            });

            fastify.get("/", (req, reply) => {
                reply.send(new Error("kaboom"));
            });

            fastify.inject({
                method: "GET",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(
                    JSON.parse(res.payload),
                    { hello: "world" }
                );
                done();
            });
        });
    });

    it("preParsing hook should support encapsulation / 1", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            instance.addHook("preParsing", (req, reply, next) => {
                assert.strictEqual(req.raw.url, "/plugin");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/plugin", (request, reply) => {
                reply.send();
            });

            next();
        });

        fastify.get("/root", (request, reply) => {
            reply.send();
        });

        fastify.inject("/root", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject("/plugin", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });
    });

    it("preParsing hook should support encapsulation / 2", (done) => {
        const fastify = server();
        let pluginInstance;

        fastify.addHook("preParsing", function a() { });

        fastify.register((instance, opts, next) => {
            instance.addHook("preParsing", function b() { });
            pluginInstance = instance;
            next();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            assert.equal(fastify[symbols.kHooks].preParsing.length, 1);
            assert.equal(pluginInstance[symbols.kHooks].preParsing.length, 2);
            done();
        });
    });

    it("preParsing hook should support encapsulation / 3", (done) => {
        const fastify = server();
        expect(7).checks(done);
        fastify.decorate("hello", "world");

        fastify.addHook("preParsing", function (req, reply, next) {
            assert.ok(this.hello);
            assert.ok(this.hello2);
            expect(true).to.be.ok.mark();
            req.first = true;
            next();
        });

        fastify.decorate("hello2", "world");

        fastify.get("/first", (req, reply) => {
            assert.ok(req.first);
            assert.notOk(req.second);
            expect(true).to.be.ok.mark();
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("hello3", "world");
            instance.addHook("preParsing", function (req, reply, next) {
                assert.ok(this.hello);
                assert.ok(this.hello2);
                assert.ok(this.hello3);
                expect(true).to.be.ok.mark();
                req.second = true;
                next();
            });

            instance.get("/second", (req, reply) => {
                assert.ok(req.first);
                assert.ok(req.second);
                expect(true).to.be.ok.mark();
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("preSerialization hook should run before serialization and be able to modify the payload", (done) => {
        const fastify = server();

        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            payload.hello += "1";
            payload.world = "ok";

            next(null, payload);
        });

        fastify.route({
            method: "GET",
            url: "/first",
            handler(req, reply) {
                reply.send({ hello: "world" });
            },
            schema: {
                response: {
                    200: {
                        type: "object",
                        properties: {
                            hello: {
                                type: "string"
                            },
                            world: {
                                type: "string"
                            }
                        },
                        required: ["world"],
                        additionalProperties: false
                    }
                }
            }
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
                assert.deepEqual(JSON.parse(body), { hello: "world1", world: "ok" });
                done();
            });
        });
    });

    it("preSerialization hook should be able to throw errors which are not validated against schema response", (done) => {
        const fastify = server();

        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            next(new Error("preSerialization aborted"));
        });

        fastify.route({
            method: "GET",
            url: "/first",
            handler(req, reply) {
                reply.send({ hello: "world" });
            },
            schema: {
                response: {
                    500: {
                        type: "object",
                        properties: {
                            world: {
                                type: "string"
                            }
                        },
                        required: ["world"],
                        additionalProperties: false
                    }
                }
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/first`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { error: "Internal Server Error", message: "preSerialization aborted", statusCode: 500 });
                done();
            });
        });
    });

    it("preSerialization hook which returned error should still run onError hooks", (done) => {
        const fastify = server();

        expect(2).checks(done);
        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            next(new Error("preSerialization aborted"));
        });

        fastify.addHook("onError", (req, reply, payload, next) => {
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.get("/first", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/first`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 500);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("preSerialization hooks should run in the order in which they are defined", (done) => {
        const fastify = server();

        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            payload.hello += "2";

            next(null, payload);
        });

        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            payload.hello += "1";

            next(null, payload);
        });

        fastify.get("/first", (req, reply) => {
            reply.send(payload);
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
                assert.deepEqual(JSON.parse(body), { hello: "world21" });
                done();
            });
        });
    });

    it("preSerialization hooks should support encapsulation", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addHook("preSerialization", (req, reply, payload, next) => {
            payload.hello += "1";

            next(null, payload);
        });

        fastify.get("/first", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.register((instance, opts, next) => {
            instance.addHook("preSerialization", (req, reply, payload, next) => {
                payload.hello += "2";

                next(null, payload);
            });

            instance.get("/second", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
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
                assert.deepEqual(JSON.parse(body), { hello: "world1" });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/second`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world12" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("onRegister hook should be called / 1", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.register((instance, opts, next) => {
            next();
        });

        fastify.addHook("onRegister", (instance) => {
            // duck typing for the win!
            assert.ok(instance.addHook);
            expect(true).to.be.ok.mark();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRegister hook should be called / 2", (done) => {
        const fastify = server();
        expect(5).checks(done);

        fastify.register((instance, opts, next) => {
            instance.register((instance, opts, next) => {
                next();
            });
            next();
        });

        fastify.register((instance, opts, next) => {
            next();
        });

        fastify.addHook("onRegister", (instance) => {
            // duck typing for the win!
            assert.ok(instance.addHook);
            expect(true).to.be.ok.mark();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRegister hook should be called / 3", (done) => {
        const fastify = server();
        expect(3).checks(done);

        fastify.decorate("data", []);

        fastify.register((instance, opts, next) => {
            instance.data.push(1);
            instance.register((instance, opts, next) => {
                instance.data.push(2);
                assert.deepEqual(instance.data, [1, 2]);
                expect(true).to.be.ok.mark();
                next();
            });
            assert.deepEqual(instance.data, [1]);
            next();
        });

        fastify.register((instance, opts, next) => {
            assert.deepEqual(instance.data, []);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.addHook("onRegister", (instance) => {
            instance.data = instance.data.slice();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onRegister hook should be called / 4", (done) => {
        const fastify = server();
        expect(2).checks(done);

        function plugin(instance, opts, next) {
            next();
        }
        plugin[Symbol.for("skip-override")] = true;

        fastify.register(plugin);

        fastify.addHook("onRegister", (instance) => {
            // duck typing for the win!
            assert.ok(instance.addHook);
            expect(true).to.be.ok.mark();
        });

        fastify.ready((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    describe("async", () => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        it("async hooks", (done) => {
            const fastify = server();
            expect(12).checks(done);

            fastify.addHook("onRequest", async (request, reply) => {
                await sleep(1);
                request.test = "the request is coming";
                reply.test = "the reply has come";
                if (request.raw.method === "DELETE") {
                    throw new Error("some error");
                }
            });

            fastify.addHook("preHandler", async (request, reply) => {
                await sleep(1);
                assert.equal(request.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                expect(true).to.be.ok.mark();
                if (request.raw.method === "HEAD") {
                    throw new Error("some error");
                }
            });

            fastify.addHook("onSend", async (request, reply, payload) => {
                await sleep(1);
                assert.ok("onSend called");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                await sleep(1);
                assert.ok("onResponse called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.equal(request.test, "the request is coming");
                assert.equal(reply.test, "the reply has come");
                expect(true).to.be.ok.mark();
                reply.code(200).send({ hello: "world" });
            });

            fastify.head("/", (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });

            fastify.delete("/", (req, reply) => {
                reply.code(200).send({ hello: "world" });
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

                sget({
                    method: "HEAD",
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 500);
                    expect(true).to.be.ok.mark();
                });

                sget({
                    method: "DELETE",
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 500);
                    expect(true).to.be.ok.mark();
                });
            });
        });

        it("modify payload", (done) => {
            const fastify = server();
            expect(4).checks(done);
            const payload = { hello: "world" };
            const modifiedPayload = { hello: "modified" };
            const anotherPayload = '"winter is coming"';

            fastify.addHook("onSend", async (request, reply, thePayload) => {
                assert.ok("onSend called");
                assert.deepEqual(JSON.parse(thePayload), payload);
                expect(true).to.be.ok.mark();
                return thePayload.replace("world", "modified");
            });

            fastify.addHook("onSend", async (request, reply, thePayload) => {
                assert.ok("onSend called");
                assert.deepEqual(JSON.parse(thePayload), modifiedPayload);
                expect(true).to.be.ok.mark();
                return anotherPayload;
            });

            fastify.addHook("onSend", async (request, reply, thePayload) => {
                assert.ok("onSend called");
                assert.strictEqual(thePayload, anotherPayload);
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (req, reply) => {
                reply.send(payload);
            });

            fastify.inject({
                method: "GET",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.strictEqual(res.payload, anotherPayload);
                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(res.headers["content-length"], "18");
                expect(true).to.be.ok.mark();
            });
        });

        it("onRequest hooks should be able to block a request", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("onRequest", async (req, reply) => {
                reply.send("hello");
            });

            fastify.addHook("onRequest", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("preHandler", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.payload, "hello");
                expect(true).to.be.ok.mark();
            });
        });

        it("preHandler hooks should be able to block a request", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("preHandler", async (req, reply) => {
                reply.send("hello");
            });

            fastify.addHook("preHandler", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.equal(payload, "hello");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.payload, "hello");
                expect(true).to.be.ok.mark();
            });
        });

        it("preValidation hooks should be able to block a request", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("preValidation", async (req, reply) => {
                reply.send("hello");
            });

            fastify.addHook("preValidation", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.equal(payload, "hello");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.payload, "hello");
                expect(true).to.be.ok.mark();
            });
        });

        it("preSerialization hooks should be able to modify the payload", (done) => {
            const fastify = server();

            fastify.addHook("preSerialization", async (req, reply, payload) => {
                return { hello: "another world" };
            });

            fastify.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.deepEqual(JSON.parse(res.payload), { hello: "another world" });
                done();
            });
        });

        it("preSerialization hooks should handle errors", (done) => {
            const fastify = server();

            fastify.addHook("preSerialization", async (req, reply, payload) => {
                throw new Error("kaboom");
            });

            fastify.get("/", (request, reply) => {
                reply.send({ hello: "world" });
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 500);
                assert.deepEqual(JSON.parse(res.payload), { error: "Internal Server Error", message: "kaboom", statusCode: 500 });
                done();
            });
        });

        it("onRequest hooks should be able to block a request (last hook)", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("onRequest", async (req, reply) => {
                reply.send("hello");
            });

            fastify.addHook("preHandler", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.payload, "hello");
                expect(true).to.be.ok.mark();
            });
        });

        it("preHandler hooks should be able to block a request (last hook)", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("preHandler", async (req, reply) => {
                reply.send("hello");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.equal(payload, "hello");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(res.payload, "hello");
                expect(true).to.be.ok.mark();
            });
        });

        it.todo("onRequest respond with a stream", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("onRequest", async (req, reply) => {
                return new Promise((resolve, reject) => {
                    const stream = fs.createReadStream(`${process.cwd()}/test/stream.test.js`, "utf8");
                    // stream.pipe(res)
                    // res.once('finish', resolve)
                    reply.send(stream);
                    reply.res.once("finish", () => resolve());
                });
            });

            fastify.addHook("onRequest", async (req, res) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("preHandler", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });

        it.todo("preHandler respond with a stream", (done) => {
            const fastify = server();
            expect(3).checks(done);

            fastify.addHook("onRequest", async (req, res) => {
                assert.ok("called");
            });

            // we are calling `reply.send` inside the `preHandler` hook with a stream,
            // this triggers the `onSend` hook event if `preHanlder` has not yet finished
            const order = [1, 2];

            fastify.addHook("preHandler", async (req, reply) => {
                return new Promise((resolve, reject) => {
                    const stream = fs.createReadStream(`${process.cwd()}/test/stream.test.js`, "utf8");
                    reply.send(stream);
                    reply.res.once("finish", () => {
                        assert.equal(order.shift(), 2);
                        resolve();
                    });
                });
            });

            fastify.addHook("preHandler", async (req, reply) => {
                assert.fail("this should not be called");
            });

            fastify.addHook("onSend", async (req, reply, payload) => {
                assert.equal(order.shift(), 1);
                assert.equal(typeof payload.pipe, "function");
                expect(true).to.be.ok.mark();
            });

            fastify.addHook("onResponse", async (request, reply) => {
                assert.ok("called");
                expect(true).to.be.ok.mark();
            });

            fastify.get("/", (request, reply) => {
                assert.fail("we should not be here");
            });

            fastify.inject({
                url: "/",
                method: "GET"
            }, (err, res) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });
    });
});
