const {
    web: { server }
} = adone;

describe("500s", () => {
    it("default 500", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send(new Error("kaboom"));
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Internal Server Error",
                message: "kaboom",
                statusCode: 500
            });
            done();
        });
    });

    it("custom 500", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.get("/", (req, reply) => {
            reply.send(new Error("kaboom"));
        });

        fastify.setErrorHandler((err, request, reply) => {
            assert.equal(typeof request, "object");
            assert.instanceOf(request, fastify[server.symbol.kRequest]);
            expect(true).to.be.ok.mark();
            reply
                .code(500)
                .type("text/plain")
                .send(`an error happened: ${err.message}`);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.headers["content-type"], "text/plain");
            assert.deepEqual(res.payload.toString(), "an error happened: kaboom");
            expect(true).to.be.ok.mark();
        });
    });

    it("encapsulated 500", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.get("/", (req, reply) => {
            reply.send(new Error("kaboom"));
        });

        fastify.register((f, opts, next) => {
            f.get("/", (req, reply) => {
                reply.send(new Error("kaboom"));
            });

            f.setErrorHandler((err, request, reply) => {
                assert.equal(typeof request, "object");
                assert.instanceOf(request, f[server.symbol.kRequest]);
                expect(true).to.be.ok.mark();
                reply
                    .code(500)
                    .type("text/plain")
                    .send(`an error happened: ${err.message}`);
            });

            next();
        }, { prefix: "test" });

        fastify.inject({
            method: "GET",
            url: "/test"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.headers["content-type"], "text/plain");
            assert.deepEqual(res.payload.toString(), "an error happened: kaboom");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Internal Server Error",
                message: "kaboom",
                statusCode: 500
            });
            expect(true).to.be.ok.mark();
        });
    });

    it("custom 500 with hooks", (done) => {
        expect(4).checks(done);

        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send(new Error("kaboom"));
        });

        fastify.setErrorHandler((err, request, reply) => {
            reply
                .code(500)
                .type("text/plain")
                .send(`an error happened: ${err.message}`);
        });

        fastify.addHook("onSend", (req, res, payload, next) => {
            expect(true).to.be.ok.mark();
            // t.ok("called", "onSend");
            next();
        });
        fastify.addHook("onRequest", (req, res, next) => {
            expect(true).to.be.ok.mark();
            // t.ok("called", "onRequest");
            next();
        });
        fastify.addHook("onResponse", (request, reply, next) => {
            expect(true).to.be.ok.mark();
            // t.ok("called", "onResponse");
            next();
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.headers["content-type"], "text/plain");
            assert.deepEqual(res.payload.toString(), "an error happened: kaboom");
            expect(true).to.be.ok.mark();
        });
    });

    it("cannot set errorHandler after binding", (done) => {
        const fastify = server();

        fastify.listen(0, (err) => {
            assert.notExists(err);

            try {
                fastify.setErrorHandler(() => { });
                assert.fail();
            } catch (e) {
                fastify.close();
                done();
                // t.pass();
            }
        });
    });
});
