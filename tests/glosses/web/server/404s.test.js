const {
    web: { server }
} = adone;
const { plugin: fp } = server;

const httpErrors = require("http-errors");
const sget = require("simple-get").concat;
const errors = require("http-errors");
const split = require("split2");

describe("404s", () => {
    describe("default 404", () => {
        // 

        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            fastify.close();
        });

        it("unsupported method", (done) => {
            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}`,
                body: {},
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
                done();
            });
        });

        it("unsupported route", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/notSupported`,
                body: {},
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
                done();
            });
        });
    });

    describe("customized 404", () => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.get("/with-error", (req, reply) => {
            reply.send(new errors.NotFound());
        });

        fastify.get("/with-error-custom-header", (req, reply) => {
            const err = new errors.NotFound();
            err.headers = { "x-foo": "bar" };
            reply.send(err);
        });

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send("this was not found");
        });

        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            fastify.close();
        });


        it("unsupported method", (done) => {

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found");
                done();
            });
        });

        it("unsupported route", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found");
                done();
            });
        });

        it("with error object", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/with-error`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.deepEqual(JSON.parse(body), {
                    error: "Not Found",
                    message: "Not Found",
                    statusCode: 404
                });
                done();
            });
        });

        it("error object with headers property", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/with-error-custom-header`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(response.headers["x-foo"], "bar");
                assert.deepEqual(JSON.parse(body), {
                    error: "Not Found",
                    message: "Not Found",
                    statusCode: 404
                });
                done();
            });
        });
    });

    describe("custom header in notFound handler", () => {
        const fastify = server();

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).header("x-foo", "bar").send("this was not found");
        });


        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            fastify.close();
        });


        it("not found with custom header", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(response.headers["x-foo"], "bar");
                assert.strictEqual(body.toString(), "this was not found");
                done();
            });
        });
    });

    describe("setting a custom 404 handler multiple times is an error", () => {
        it("at the root level", (done) => {
            const fastify = server();

            fastify.setNotFoundHandler(() => { });

            try {
                fastify.setNotFoundHandler(() => { });
                assert.fail("setting multiple 404 handlers at the same prefix encapsulation level should throw");
            } catch (err) {
                assert.instanceOf(err, Error);
                assert.strictEqual(err.message, "Not found handler already set for Fastify instance with prefix: '/'");
                done();
            }
        });

        it("at the plugin level", (done) => {
            const fastify = server();

            fastify.register((instance, options, next) => {
                instance.setNotFoundHandler(() => { });

                try {
                    instance.setNotFoundHandler(() => { });
                    assert.fail("setting multiple 404 handlers at the same prefix encapsulation level should throw");
                } catch (err) {
                    assert.instanceOf(err, Error);
                    assert.strictEqual(err.message, "Not found handler already set for Fastify instance with prefix: '/prefix'");
                    done();
                }

                next();
            }, { prefix: "/prefix" });

            fastify.listen(0, (err) => {
                assert.notExists(err);
                fastify.close();
            });
        });

        it("at multiple levels", (done) => {
            const fastify = server();

            fastify.register((instance, options, next) => {
                try {
                    instance.setNotFoundHandler(() => { });
                    assert.fail("setting multiple 404 handlers at the same prefix encapsulation level should throw");
                } catch (err) {
                    assert.instanceOf(err, Error);
                    assert.strictEqual(err.message, "Not found handler already set for Fastify instance with prefix: '/'");
                    done();
                }
                next();
            });

            fastify.setNotFoundHandler(() => { });

            fastify.listen(0, (err) => {
                assert.notExists(err);
                fastify.close();
            });
        });

        it("at multiple levels / 2", (done) => {
            const fastify = server();

            fastify.register((instance, options, next) => {
                instance.setNotFoundHandler(() => { });

                instance.register((instance2, options, next) => {
                    try {
                        instance2.setNotFoundHandler(() => { });
                        assert.fail("setting multiple 404 handlers at the same prefix encapsulation level should throw");
                    } catch (err) {
                        assert.instanceOf(err, Error);
                        assert.strictEqual(err.message, "Not found handler already set for Fastify instance with prefix: '/prefix'");
                        done();
                    }
                    next();
                });

                next();
            }, { prefix: "/prefix" });

            fastify.setNotFoundHandler(() => { });

            fastify.listen(0, (err) => {
                assert.notExists(err);
                fastify.close();
            });
        });

        it("in separate plugins at the same level", (done) => {
            const fastify = server();

            fastify.register((instance, options, next) => {
                instance.register((instance2A, options, next) => {
                    instance2A.setNotFoundHandler(() => { });
                    next();
                });

                instance.register((instance2B, options, next) => {
                    try {
                        instance2B.setNotFoundHandler(() => { });
                        assert.fail("setting multiple 404 handlers at the same prefix encapsulation level should throw");
                    } catch (err) {
                        assert.instanceOf(err, Error);
                        assert.strictEqual(err.message, "Not found handler already set for Fastify instance with prefix: '/prefix'");
                        done();
                    }
                    next();
                });

                next();
            }, { prefix: "/prefix" });

            fastify.setNotFoundHandler(() => { });

            fastify.listen(0, (err) => {
                assert.notExists(err);
                fastify.close();
            });
        });
    });

    describe("encapsulated 404", () => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send("this was not found");
        });

        fastify.register((f, opts, next) => {
            f.setNotFoundHandler((req, reply) => {
                reply.code(404).send("this was not found 2");
            });
            next();
        }, { prefix: "/test" });

        fastify.register((f, opts, next) => {
            f.setNotFoundHandler((req, reply) => {
                reply.code(404).send("this was not found 3");
            });
            next();
        }, { prefix: "/test2" });

        fastify.register((f, opts, next) => {
            f.setNotFoundHandler((request, reply) => {
                reply.code(404).send("this was not found 4");
            });
            next();
        }, { prefix: "/test3/" });

        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                done();
            });
        });

        after(() => {
            fastify.close();
        });


        it("root unsupported method", (done) => {

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found");
                done();
            });
        });

        it("root insupported route", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found");
                done();
            });
        });

        it("unsupported method", (done) => {

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}/test`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 2");
                done();
            });
        });

        it("unsupported route", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/test/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 2");
                done();
            });
        });

        it("unsupported method bis", (done) => {

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}/test2`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 3");
                done();
            });
        });

        it("unsupported route bis", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/test2/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 3");
                done();
            });
        });

        it("unsupported method 3", (done) => {

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}/test3/`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 4");
                done();
            });
        });

        it("unsupported route 3", (done) => {

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/test3/notSupported`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body.toString(), "this was not found 4");
                done();
            });
        });
    });

    it("custom 404 hook and handler context", (done) => {
        expect(21).checks(done);

        const fastify = server();

        fastify.decorate("foo", 42);

        fastify.addHook("onRequest", function (req, res, next) {
            assert.strictEqual(this.foo, 42);
            expect(true).to.be.ok.mark();
            next();
        });
        fastify.addHook("preHandler", function (request, reply, next) {
            assert.strictEqual(this.foo, 42);
            expect(true).to.be.ok.mark();
            next();
        });
        fastify.addHook("onSend", function (request, reply, payload, next) {
            assert.strictEqual(this.foo, 42);
            expect(true).to.be.ok.mark();
            next();
        });
        fastify.addHook("onResponse", function (request, reply, next) {
            assert.strictEqual(this.foo, 42);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.setNotFoundHandler(function (req, reply) {
            assert.strictEqual(this.foo, 42);
            expect(true).to.be.ok.mark();
            reply.code(404).send("this was not found");
        });

        fastify.register((instance, opts, next) => {
            instance.decorate("bar", 84);

            instance.addHook("onRequest", function (req, res, next) {
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark();
                next();
            });
            instance.addHook("preHandler", function (request, reply, next) {
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark();
                next();
            });
            instance.addHook("onSend", function (request, reply, payload, next) {
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark();
                next();
            });
            instance.addHook("onResponse", function (request, reply, next) {
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark();
                next();
            });

            instance.setNotFoundHandler(function (req, reply) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                reply.code(404).send("encapsulated was not found");
            });

            next();
        }, { prefix: "/encapsulated" });

        fastify.inject("/not-found", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "this was not found");
            expect(true).to.be.ok.mark(3);
        });

        fastify.inject("/encapsulated/not-found", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "encapsulated was not found");
            expect(true).to.be.ok.mark(3);
        });
    });

    it("encapsulated custom 404 without - prefix hook and handler context", (done) => {
        expect(13).checks(done);

        const fastify = server();

        fastify.decorate("foo", 42);

        fastify.register((instance, opts, next) => {
            instance.decorate("bar", 84);

            instance.addHook("onRequest", function (req, res, next) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                next();
            });
            instance.addHook("preHandler", function (request, reply, next) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                next();
            });
            instance.addHook("onSend", function (request, reply, payload, next) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                next();
            });
            instance.addHook("onResponse", function (request, reply, next) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                next();
            });

            instance.setNotFoundHandler(function (request, reply) {
                assert.strictEqual(this.foo, 42);
                assert.strictEqual(this.bar, 84);
                expect(true).to.be.ok.mark(2);
                reply.code(404).send("custom not found");
            });

            next();
        });

        fastify.inject("/not-found", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "custom not found");
            expect(true).to.be.ok.mark(3);
        });
    });

    it("run hooks and middleware on default 404", (done) => {
        const fastify = server();

        expect(8).checks(() => {
            fastify.close();
            done();
        });

        fastify.addHook("onRequest", (req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onRequest called");
            next();
        });

        fastify.use((req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("middleware called");
            next();
        });

        fastify.addHook("preHandler", (request, reply, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("preHandler called");
            next();
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onSend called");
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onResponse called");
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });
        });
    });

    it("run non-encapsulated plugin hooks and middleware on default 404", (done) => {
        expect(7).checks(done);

        const fastify = server();

        fastify.register(fp((instance, options, next) => {
            instance.addHook("onRequest", (req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onRequest called");
                next();
            });

            instance.use((req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("middleware called");
                next();
            });

            instance.addHook("preHandler", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("preHandler called");
                next();
            });

            instance.addHook("onSend", (request, reply, payload, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onSend called");
                next();
            });

            instance.addHook("onResponse", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onResponse called");
                next();
            });

            next();
        }));

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark(2);
        });
    });

    it("run non-encapsulated plugin hooks and middleware on custom 404", (done) => {
        expect(13).checks(done);

        const fastify = server();

        const plugin = fp((instance, opts, next) => {
            instance.addHook("onRequest", (req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onRequest called");
                next();
            });

            instance.use((req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("middleware called");
                next();
            });

            instance.addHook("preHandler", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("preHandler called");
                next();
            });

            instance.addHook("onSend", (request, reply, payload, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onSend called");
                next();
            });

            instance.addHook("onResponse", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onResponse called");
                next();
            });

            next();
        });

        fastify.register(plugin);

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send("this was not found");
        });

        fastify.register(plugin); // Registering plugin after handler also works

        fastify.inject({ url: "/not-found" }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "this was not found");
            expect(true).to.be.ok.mark(3);
        });
    });

    it("run hooks and middleware with encapsulated 404", (done) => {
        const fastify = server();

        expect(13).checks(() => {
            fastify.close();
            done();
        });

        fastify.addHook("onRequest", (req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onRequest called");
            next();
        });

        fastify.use((req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("middleware called");
            next();
        });

        fastify.addHook("preHandler", (request, reply, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("preHandler called");
            next();
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onSend called");
            next();
        });

        fastify.addHook("onResponse", (request, reply, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("onResponse called");
            next();
        });

        fastify.register((f, opts, next) => {
            f.setNotFoundHandler((req, reply) => {
                reply.code(404).send("this was not found 2");
            });

            f.addHook("onRequest", (req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onRequest 2 called");
                next();
            });

            f.use((req, res, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("middleware 2 called");
                next();
            });

            f.addHook("preHandler", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("preHandler 2 called");
                next();
            });

            f.addHook("onSend", (request, reply, payload, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onSend 2 called");
                next();
            });

            f.addHook("onResponse", (request, reply, next) => {
                expect(true).to.be.ok.mark();
                // t.pass("onResponse 2 called");
                next();
            });

            next();
        }, { prefix: "/test" });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}/test`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });
        });
    });

    it("run middlewares on default 404", (done) => {
        const fastify = server();

        expect(3).checks(() => {
            fastify.close();
            done();
        });

        fastify.use((req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.pass("middleware called");
            next();
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });
        });
    });

    it("run middlewares with encapsulated 404", (done) => {
        const fastify = server();

        expect(4).checks(() => {
            fastify.close();
            done();
        });

        fastify.use((req, res, next) => {
            // t.pass("middleware called");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.register((f, opts, next) => {
            f.setNotFoundHandler((req, reply) => {
                reply.code(404).send("this was not found 2");
            });

            f.use((req, res, next) => {
                // t.pass("middleware 2 called");
                expect(true).to.be.ok.mark();
                next();
            });

            next();
        }, { prefix: "/test" });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}/test`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });
        });
    });

    it("hooks check 404", (done) => {
        const fastify = server();

        expect(12).checks(() => {
            fastify.close();
            done();
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.addHook("onSend", (req, reply, payload, next) => {
            assert.deepEqual(req.query, { foo: "asd" });
            assert.ok("called", "onSend");
            expect(true).to.be.ok.mark(2);
            next();
        });
        fastify.addHook("onRequest", (req, res, next) => {
            assert.ok("called", "onRequest");
            expect(true).to.be.ok.mark();
            next();
        });
        fastify.addHook("onResponse", (request, reply, next) => {
            assert.ok("called", "onResponse");
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "PUT",
                url: `http://localhost:${fastify.server.address().port}?foo=asd`,
                body: JSON.stringify({ hello: "world" }),
                headers: { "Content-Type": "application/json" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/notSupported?foo=asd`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                expect(true).to.be.ok.mark(2);
            });
        });
    });

    it("setNotFoundHandler should not suppress duplicated routes checking", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send("this was not found");
        });

        fastify.listen(0, (err) => {
            assert.ok(err);
            done();
        });
    });

    describe("log debug for 404", () => {
        const Writable = require("stream").Writable;

        const logStream = new Writable();
        logStream.logs = [];
        logStream._write = function (chunk, encoding, callback) {
            this.logs.push(chunk.toString());
            callback();
        };

        const fastify = server({
            logger: {
                level: "trace",
                stream: logStream
            }
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        it("log debug", (done) => {
            expect(7).checks(() => {
                fastify.close();
                done();
            });

            fastify.inject({
                method: "GET",
                url: "/not-found"
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);

                const INFO_LEVEL = 30;
                assert.strictEqual(JSON.parse(logStream.logs[0]).msg, "incoming request");
                assert.strictEqual(JSON.parse(logStream.logs[1]).msg, "Not Found");
                assert.strictEqual(JSON.parse(logStream.logs[1]).level, INFO_LEVEL);
                assert.strictEqual(JSON.parse(logStream.logs[2]).msg, "request completed");
                assert.strictEqual(logStream.logs.length, 3);
                expect(true).to.be.ok.mark(7);
            });
        });
    });

    it("Unknown method", (done) => {
        const fastify = server();

        expect(1).checks(() => {
            fastify.close();
            done();
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            const handler = () => { };
            // See https://github.com/fastify/light-my-request/pull/20
            assert.throws(() => fastify.inject({
                method: "UNKNWON_METHOD",
                url: "/"
            }, handler), Error);

            sget({
                method: "UNKNWON_METHOD",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(JSON.parse(body), {
                    error: "Bad Request",
                    message: "Client Error",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("recognizes errors from the http-errors module", (done) => {
        const fastify = server();

        expect(1).checks(() => {
            fastify.close();
            done();
        });

        fastify.get("/", (req, reply) => {
            reply.send(httpErrors.NotFound());
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.inject({
                method: "GET",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 404);

                sget(`http://localhost:${fastify.server.address().port}`, (err, response, body) => {
                    assert.notExists(err);
                    const obj = JSON.parse(body.toString());
                    assert.deepEqual(obj, {
                        error: "Not Found",
                        message: "Not Found",
                        statusCode: 404
                    });
                    expect(true).to.be.ok.mark();
                });
            });
        });
    });

    it("the default 404 handler can be invoked inside a prefixed plugin", (done) => {
        const fastify = server();

        fastify.register((instance, opts, next) => {
            instance.get("/path", (request, reply) => {
                reply.send(httpErrors.NotFound());
            });

            next();
        }, { prefix: "/v1" });

        fastify.inject("/v1/path", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Not Found",
                message: "Not Found",
                statusCode: 404
            });
            done();
        });
    });

    it("an inherited custom 404 handler can be invoked inside a prefixed plugin", (done) => {
        const fastify = server();

        fastify.setNotFoundHandler((request, reply) => {
            reply.code(404).send("custom handler");
        });

        fastify.register((instance, opts, next) => {
            instance.get("/path", (request, reply) => {
                reply.send(httpErrors.NotFound());
            });

            next();
        }, { prefix: "/v1" });

        fastify.inject("/v1/path", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Not Found",
                message: "Not Found",
                statusCode: 404
            });
            done();
        });
    });

    it("encapsulated custom 404 handler without a prefix is the handler for the entire 404 level", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.setNotFoundHandler((request, reply) => {
                reply.code(404).send("custom handler");
            });

            next();
        });

        fastify.register((instance, opts, next) => {
            instance.register((instance2, opts, next) => {
                instance2.setNotFoundHandler((request, reply) => {
                    reply.code(404).send("custom handler 2");
                });
                next();
            });

            next();
        }, { prefix: "prefixed" });

        fastify.inject("/not-found", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "custom handler");
            expect(true).to.be.ok.mark();
        });

        fastify.inject("/prefixed/not-found", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "custom handler 2");
            expect(true).to.be.ok.mark();
        });
    });

    it("cannot set notFoundHandler after binding", (done) => {
        const fastify = server();

        fastify.listen(0, (err) => {
            assert.notExists(err);

            try {
                fastify.setNotFoundHandler(() => { });
                assert.fail();
            } catch (e) {
                fastify.close();
                done();
            }
        });
    });

    it("404 inside onSend", (done) => {
        const fastify = server();

        let called = false;

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.addHook("onSend", (request, reply, payload, next) => {
            if (!called) {
                called = true;
                next(new errors.NotFound());
            } else {
                next();
            }
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 404);
                fastify.close();
                done();
            });
        });
    });

    it("Not found on supported method (should return a 404)", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.inject({
                method: "POST",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 404);

                sget({
                    method: "POST",
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 404);
                    fastify.close();
                    done();
                });
            });
        });
    });

    // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
    it("Not found on unsupported method (should return a 404)", (done) => {
        const fastify = server();

        fastify.all("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.inject({
                method: "PROPFIND",
                url: "/"
            }, (err, res) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 404);

                sget({
                    method: "PROPFIND",
                    url: `http://localhost:${fastify.server.address().port}`
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 404);
                    fastify.close();
                    done();
                });
            });
        });
    });

    // https://github.com/fastify/fastify/issues/868
    it("onSend hooks run when an encapsulated route invokes the notFound handler", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, options, done) => {
            instance.addHook("onSend", (request, reply, payload, next) => {
                // t.pass("onSend hook called");
                expect(true).to.be.ok.mark();
                next();
            });

            instance.get("/", (request, reply) => {
                reply.send(new errors.NotFound());
            });

            done();
        });

        fastify.inject("/", (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    // https://github.com/fastify/fastify/issues/713
    describe("preHandler option for setNotFoundHandler", () => {
        it("preHandler option", (done) => {
            const fastify = server();

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    req.body.preHandler = true;
                    done();
                }
            }, (req, reply) => {
                reply.code(404).send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { preHandler: true, hello: "world" });
                done();
            });
        });

        it("preHandler option should be called after preHandler hook", (done) => {
            const fastify = server();

            fastify.addHook("preHandler", (req, reply, next) => {
                req.body.check = "a";
                next();
            });

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    req.body.check += "b";
                    done();
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { check: "ab", hello: "world" });
                done();
            });
        });

        it("preHandler option should be unique per prefix", (done) => {
            
            const fastify = server();

            expect(2).checks(done);

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    req.body.hello = "earth";
                    done();
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.register((i, o, n) => {
                i.setNotFoundHandler((req, reply) => {
                    reply.send(req.body);
                });

                n();
            }, { prefix: "/no" });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { hello: "earth" });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: "POST",
                url: "/no/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });

        it("preHandler option should handle errors", (done) => {
            
            const fastify = server();

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    done(new Error("kaboom"));
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.equal(res.statusCode, 500);
                assert.deepEqual(payload, {
                    message: "kaboom",
                    error: "Internal Server Error",
                    statusCode: 500
                });
                done();
            });
        });

        it("preHandler option should handle errors with custom status code", (done) => {
            
            const fastify = server();

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    reply.code(401);
                    done(new Error("go away"));
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.equal(res.statusCode, 401);
                assert.deepEqual(payload, {
                    message: "go away",
                    error: "Unauthorized",
                    statusCode: 401
                });
                done();
            });
        });

        it("preHandler option could accept an array of functions", (done) => {
            const fastify = server();

            fastify.setNotFoundHandler({
                preHandler: [
                    (req, reply, done) => {
                        req.body.preHandler = "a";
                        done();
                    },
                    (req, reply, done) => {
                        req.body.preHandler += "b";
                        done();
                    }
                ]
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { preHandler: "ab", hello: "world" });
                done();
            });
        });

        it("preHandler option does not interfere with preHandler", (done) => {
            
            const fastify = server();

            expect(2).checks(done);

            fastify.addHook("preHandler", (req, reply, next) => {
                req.body.check = "a";
                next();
            });

            fastify.setNotFoundHandler({
                preHandler: (req, reply, done) => {
                    req.body.check += "b";
                    done();
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.register((i, o, n) => {
                i.setNotFoundHandler((req, reply) => {
                    reply.send(req.body);
                });

                n();
            }, { prefix: "/no" });

            fastify.inject({
                method: "post",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { check: "ab", hello: "world" });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: "post",
                url: "/no/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { check: "a", hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });

        it("preHandler option should keep the context", (done) => {
            
            const fastify = server();

            fastify.decorate("foo", 42);

            fastify.setNotFoundHandler({
                preHandler(req, reply, done) {
                    assert.strictEqual(this.foo, 42);
                    this.foo += 1;
                    req.body.foo = this.foo;
                    done();
                }
            }, (req, reply) => {
                reply.send(req.body);
            });

            fastify.inject({
                method: "POST",
                url: "/not-found",
                payload: { hello: "world" }
            }, (err, res) => {
                assert.notExists(err);
                const payload = JSON.parse(res.payload);
                assert.deepEqual(payload, { foo: 43, hello: "world" });
                done();
            });
        });
    });

    it("reply.notFound invoked the notFound handler", (done) => {
        const fastify = server();

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send(new Error("kaboom"));
        });

        fastify.get("/", (req, reply) => {
            reply.callNotFound();
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Not Found",
                message: "kaboom",
                statusCode: 404
            });
            done();
        });
    });

    it("The custom error handler should be invoked after the custom not found handler", (done) => {
        expect(3).checks(done);
        const fastify = server();
        const order = [1, 2];

        fastify.setErrorHandler((err, req, reply) => {
            assert.equal(order.shift(), 2);
            assert.instanceOf(err, Error);
            expect(true).to.be.ok.mark();
            reply.send(err);
        });

        fastify.setNotFoundHandler((req, reply) => {
            assert.equal(order.shift(), 1);
            expect(true).to.be.ok.mark();
            reply.code(404).send(new Error("kaboom"));
        });

        fastify.get("/", (req, reply) => {
            reply.callNotFound();
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Not Found",
                message: "kaboom",
                statusCode: 404
            });
            expect(true).to.be.ok.mark();
        });
    });

    it("If the custom not found handler does not use an Error, the custom error handler should not be called", (done) => {
        const fastify = server();

        fastify.setErrorHandler((_err, req, reply) => {
            assert.fail("Should not be called");
        });

        fastify.setNotFoundHandler((req, reply) => {
            reply.code(404).send("kaboom");
        });

        fastify.get("/", (req, reply) => {
            reply.callNotFound();
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.payload, "kaboom");
            done();
        });
    });

    it("preValidation option", (done) => {
        const fastify = server();

        fastify.decorate("foo", true);

        fastify.setNotFoundHandler({
            preValidation(req, reply, done) {
                assert.isTrue(this.foo);
                done();
            }
        }, (req, reply) => {
            reply.code(404).send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/not-found",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            done();
        });
    });

    it("preValidation option could accept an array of functions", (done) => {
        
        const fastify = server();

        fastify.setNotFoundHandler({
            preValidation: [
                (req, reply, done) => {
                    assert.ok("called");
                    done();
                },
                (req, reply, done) => {
                    assert.ok("called");
                    done();
                }
            ]
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/not-found",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            done();
        });
    });

    it("Should fail to invoke callNotFound inside a 404 handler", (done) => {
        expect(2).checks(done);

        let fastify = null;
        const logStream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream: logStream,
                    level: "warn"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.setNotFoundHandler((req, reply) => {
            reply.callNotFound();
        });

        fastify.get("/", (req, reply) => {
            reply.callNotFound();
        });

        logStream.once("data", (line) => {
            assert.equal(line.msg, "Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.");
            assert.equal(line.level, 40);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 404);
            assert.equal(res.payload, "404 Not Found");
            expect(true).to.be.ok.mark();
        });
    });
});
