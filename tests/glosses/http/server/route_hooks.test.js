const {
    http: { server }
} = adone;

const testHook = function (hook) {
    it(`${hook}`, (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.post("/", {
            [hook]: (req, reply, dn) => {
                expect("hook called").to.be.ok.mark();
                dn();
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
            assert.deepEqual(payload, { hello: "world" });
            expect(1).to.be.ok.mark();
        });
    });

    it(`${hook} option should be called after ${hook} hook`, (done) => {
        const fastify = server();
        let check = "";

        fastify.addHook(hook, (req, reply, next) => {
            check = "a";
            next();
        });

        fastify.post("/", {
            [hook]: (req, reply, done) => {
                check += "b";
                done();
            }
        }, (req, reply) => {
            reply.send({ check });
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "ab" });
            done();
        });
    });

    it(`${hook} option should be unique per route`, (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.post("/", {
            [hook]: (req, reply, done) => {
                req.hello = "earth";
                done();
            }
        }, (req, reply) => {
            reply.send({ hello: req.hello });
        });

        fastify.post("/no", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "earth" });
            expect(1).to.be.ok.mark();
        });

        fastify.inject({
            method: "POST",
            url: "/no",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            expect(1).to.be.ok.mark();
        });
    });

    it(`${hook} option should handle errors`, (done) => {
        const fastify = server();

        fastify.post("/", {
            [hook]: (req, reply, done) => {
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

    it(`${hook} option should handle errors with custom status code`, (done) => {
        const fastify = server();

        fastify.post("/", {
            [hook]: (req, reply, done) => {
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

    it(`${hook} option could accept an array of functions`, (done) => {
        const fastify = server();

        fastify.post("/", {
            [hook]: [
                (req, reply, done) => {
                    req.aa = "a";
                    done();
                },
                (req, reply, done) => {
                    req.aa += "b";
                    done();
                }
            ]
        }, (req, reply) => {
            reply.send({ aa: req.aa });
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { aa: "ab" });
            done();
        });
    });

    it(`${hook} option does not interfere with ${hook} hook`, (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.addHook(hook, (req, reply, next) => {
            req.check = "a";
            next();
        });

        fastify.post("/", {
            [hook]: (req, reply, done) => {
                req.check += "b";
                done();
            }
        }, handler);

        fastify.post("/no", handler);

        function handler(req, reply) {
            reply.send({ check: req.check });
        }

        fastify.inject({
            method: "post",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "ab" });
            expect(1).to.be.ok.mark();
        });

        fastify.inject({
            method: "post",
            url: "/no",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { check: "a" });
            expect(1).to.be.ok.mark();
        });
    });

    it(`${hook} option should keep the context`, (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.decorate("foo", 42);

        fastify.post("/", {
            [hook](req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(1).to.be.ok.mark();
                this.foo += 1;
                done();
            }
        }, function (req, reply) {
            reply.send({ foo: this.foo });
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { foo: 43 });
            expect(1).to.be.ok.mark();
        });
    });

    it(`${hook} option should keep the context (array)`, (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.decorate("foo", 42);

        fastify.post("/", {
            [hook]: [function (req, reply, done) {
                assert.strictEqual(this.foo, 42);
                expect(1).to.be.ok.mark();
                this.foo += 1;
                done();
            }]
        }, function (req, reply) {
            reply.send({ foo: this.foo });
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { foo: 43 });
            expect(1).to.be.ok.mark();
        });
    });
};

// hooks that comes before the handler
testHook("preHandler");
testHook("onRequest");
testHook("preValidation");
testHook("preParsing");

it("preHandler backwards compatibility with beforeHandler option (should emit a warning)", (done) => {
    expect(2).checks(done);
    const fastify = server();

    process.on("warning", (warn) => {
        assert.strictEqual(
            warn.message,
            "The route option `beforeHandler` has been deprecated, use `preHandler` instead"
        );
        expect(1).to.be.ok.mark();
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
        assert.notExists(err);
        const payload = JSON.parse(res.payload);
        assert.deepEqual(payload, { preHandler: true, hello: "world" });
        expect(1).to.be.ok.mark();
    });
});

it("preValidation option should be called before preHandler hook", (done) => {
    expect(2).checks(done);
    const fastify = server();

    fastify.addHook("preHandler", (req, reply, next) => {
        assert.isTrue(req.called);
        expect(1).to.be.ok.mark();
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
        assert.notExists(err);
        const payload = JSON.parse(res.payload);
        assert.deepEqual(payload, { hello: "world" });
        expect(1).to.be.ok.mark();
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
        assert.notExists(err);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(JSON.parse(res.payload), { hello: "another world" });
        done();
    });
});

it("preParsing option should be called before preValidation hook", (done) => {
    expect(2).checks(done);
    const fastify = server();

    fastify.addHook("preValidation", (req, reply, next) => {
        assert.isTrue(req.called);
        expect(1).to.be.ok.mark();
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
        assert.notExists(err);
        const payload = JSON.parse(res.payload);
        assert.deepEqual(payload, { hello: "world" });
        expect(1).to.be.ok.mark();
    });
});

it("onRequest option should be called before preParsing", (done) => {
    expect(2).checks(done);
    const fastify = server();

    fastify.addHook("preParsing", (req, reply, next) => {
        assert.isTrue(req.called);
        expect(1).to.be.ok.mark();
        next();
    });

    fastify.post("/", {
        onRequest: (req, reply, done) => {
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
        assert.notExists(err);
        const payload = JSON.parse(res.payload);
        assert.deepEqual(payload, { hello: "world" });
        expect(1).to.be.ok.mark();
    });
});
