const {
    web: { server }
} = adone;

const sget = require("simple-get");

describe("router options", () => {
    it("Should honor ignoreTrailingSlash option", (done) => {
        const fastify = server({
            ignoreTrailingSlash: true
        });

        expect(2).checks(done);

        fastify.get("/test", (req, res) => {
            res.send("test");
        });

        fastify.listen(0, (err) => {
            fastify.server.unref();
            assert.notExists(err);

            const baseUrl = `http://127.0.0.1:${fastify.server.address().port}`;

            sget.concat(`${baseUrl}/test`, (err, res, data) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(data.toString(), "test");
                expect(true).to.be.ok.mark();
            });

            sget.concat(`${baseUrl}/test/`, (err, res, data) => {
                assert.notExists(err);
                assert.equal(res.statusCode, 200);
                assert.equal(data.toString(), "test");
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("Should honor maxParamLength option", (done) => {
        const fastify = server({ maxParamLength: 10 });

        expect(2).checks(done);

        fastify.get("/test/:id", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/test/123456789"
        }, (error, res) => {
            assert.notExists();
            assert.strictEqual(res.statusCode, 200);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/test/123456789abcd"
        }, (error, res) => {
            assert.notExists();
            assert.strictEqual(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler", (done) => {
        const fastify = server();

        fastify.post("/", {
            preHandler: (req, reply, done) => {
                req.body.preHandler = true;
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
            assert.notExists();
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

        fastify.post("/", {
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "ab", hello: "world" });
            done();
        });
    });

    it("preHandler option should be unique per route", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", {
            preHandler: (req, reply, done) => {
                req.body.hello = "earth";
                done();
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.post("/no", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "earth" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "POST",
            url: "/no",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler option should handle errors", (done) => {
        const fastify = server();

        fastify.post("/", {
            preHandler: (req, reply, done) => {
                done(new Error("kaboom"));
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
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

        fastify.post("/", {
            preHandler: (req, reply, done) => {
                reply.code(401);
                done(new Error("go away"));
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
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

        fastify.post("/", {
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
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { preHandler: "ab", hello: "world" });
            done();
        });
    });

    it("preHandler option does not interfere with preHandler hook", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addHook("preHandler", (req, reply, next) => {
            req.body.check = "a";
            next();
        });

        fastify.post("/", {
            preHandler: (req, reply, done) => {
                req.body.check += "b";
                done();
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.post("/no", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "post",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "ab", hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "post",
            url: "/no",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "a", hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler option should keep the context", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.decorate("foo", 42);

        fastify.post("/", {
            preHandler(req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(true).to.be.ok.mark();
                this.foo += 1;
                req.body.foo = this.foo;
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { foo: 43, hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preHandler option should keep the context (array)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.decorate("foo", 42);

        fastify.post("/", {
            preHandler: [function (req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(true).to.be.ok.mark();
                this.foo += 1;
                req.body.foo = this.foo;
                done();
            }]
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { foo: 43, hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it.todo("Backwards compatibility with beforeHandler option (should emit a warning)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        process.on("warning", (warn) => {
            assert.strictEqual(
                warn.message,
                "The route option `beforeHandler` has been deprecated, use `preHandler` instead"
            );
            expect(true).to.be.ok.mark();
        });

        fastify.post("/", {
            beforeHandler: (req, reply, done) => {
                req.body.preHandler = true;
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { preHandler: true, hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", {
            preValidation: (req, reply, done) => {
                req.preValidation = true;
                done();
            }
        }, (req, reply) => {
            assert.isTrue(req.preValidation);
            expect(true).to.be.ok.mark();
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option should be called before preHandler hook", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addHook("preHandler", (req, reply, next) => {
            assert.isTrue(req.called);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.post("/", {
            preValidation: (req, reply, done) => {
                req.called = true;
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option should be unique per route", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", {
            preValidation: (req, reply, done) => {
                req.hello = { hello: "earth" };
                done();
            }
        }, (req, reply) => {
            reply.send(req.hello || req.body);
        });

        fastify.post("/no", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "earth" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "POST",
            url: "/no",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option should handle errors", (done) => {
        const fastify = server();

        fastify.post("/", {
            preValidation: (req, reply, done) => {
                done(new Error("kaboom"));
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
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

    it("preValidation option should handle errors with custom status code", (done) => {
        const fastify = server();

        fastify.post("/", {
            preValidation: (req, reply, done) => {
                reply.code(401);
                done(new Error("go away"));
            }
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
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

    it("preValidation option could accept an array of functions", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.post("/", {
            preValidation: [
                (req, reply, done) => {
                    assert.ok("called");
                    expect(true).to.be.ok.mark();
                    done();
                },
                (req, reply, done) => {
                    assert.ok("called");
                    expect(true).to.be.ok.mark();
                    done();
                }
            ]
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option should keep the context", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.decorate("foo", 42);

        fastify.post("/", {
            preValidation(req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(true).to.be.ok.mark();
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preValidation option should keep the context (array)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.decorate("foo", 42);

        fastify.post("/", {
            preValidation: [function (req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(true).to.be.ok.mark();
                done();
            }]
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preSerialization option should be able to modify the payload", (done) => {
        const fastify = server();

        fastify.get("/only", {
            preSerialization: (req, reply, payload, done) => {
                done(null, { hello: "another world" });
            }
        }, (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/only"
        }, (err, res) => {
            assert.notExists();
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "another world" });
            done();
        });
    });

    it("preSerialization option should handle errors", (done) => {
        const fastify = server();

        fastify.get("/only", {
            preSerialization: (req, reply, payload, done) => {
                reply.code(501);
                done(new Error("kaboom"));
            }
        }, (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/only"
        }, (err, res) => {
            assert.notExists();
            assert.equal(res.statusCode, 501);
            assert.deepEqual(JSON.parse(res.payload), { message: "kaboom", error: "Not Implemented", statusCode: 501 });
            done();
        });
    });

    it("preSerialization option could accept an array of functions", (done) => {
        const fastify = server();

        fastify.get("/only", {
            preSerialization: [
                (req, reply, payload, done) => {
                    done(null, { hello: "another world" });
                },
                (req, reply, payload, done) => {
                    payload.hello += ", mate";
                    done(null, payload);
                }
            ]
        }, (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/only"
        }, (err, res) => {
            assert.notExists();
            assert.equal(res.statusCode, 200);
            assert.deepEqual(JSON.parse(res.payload), { hello: "another world, mate" });
            done();
        });
    });

    it("preParsing option", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.post("/", {
            preParsing: (req, reply, done) => {
                req.preParsing = true;
                done();
            }
        }, (req, reply) => {
            assert.isTrue(req.preParsing);
            expect(true).to.be.ok.mark();
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preParsing option should be called before preValidation hook", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.addHook("preValidation", (req, reply, next) => {
            assert.isTrue(req.called);
            expect(true).to.be.ok.mark();
            next();
        });

        fastify.post("/", {
            preParsing: (req, reply, done) => {
                req.called = true;
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
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("preParsing option could accept an array of functions", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.post("/", {
            preParsing: [function (req, reply, done) {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                done();
            }, function (req, reply, done) {
                assert.ok("called");
                expect(true).to.be.ok.mark();
                done();
            }]
        }, (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists();
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });
});
