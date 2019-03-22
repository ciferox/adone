/* eslint-disable func-style */
const {
    web: { server }
} = adone;


describe("close", () => {
    it("close callback", (done) => {
        const fastify = server();

        expect(2).checks(done);
        fastify.addHook("onClose", onClose);
        function onClose(instance, done) {
            assert.deepEqual(fastify, instance);
            expect(true).to.be.ok.mark();
            done();
        }

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.close((err) => {
                assert.notExists(err);
                assert.ok("close callback");
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("inside register", (done) => {
        const fastify = server();

        expect(2).checks(done);
        fastify.register((f, opts, next) => {
            f.addHook("onClose", onClose);
            function onClose(instance, done) {
                assert.ok(instance.prototype === fastify.prototype);
                assert.strictEqual(instance, f);
                expect(true).to.be.ok.mark();
                done();
            }

            next();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.close((err) => {
                assert.notExists(err);
                assert.ok("close callback");
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("close order", (done) => {
        const fastify = server();
        const order = [1, 2, 3];

        expect(3).checks(done);

        fastify.register((f, opts, next) => {
            f.addHook("onClose", (instance, done) => {
                assert.equal(order.shift(), 1);
                expect(true).to.be.ok.mark();
                done();
            });

            next();
        });

        fastify.addHook("onClose", (instance, done) => {
            assert.equal(order.shift(), 2);
            expect(true).to.be.ok.mark();
            done();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);

            fastify.close((err) => {
                assert.notExists(err);
                assert.equal(order.shift(), 3);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("should not throw an error if the server is not listening", (done) => {
        const fastify = server();

        expect(2).checks(done);
        fastify.addHook("onClose", onClose);
        function onClose(instance, done) {
            assert.strictEqual(fastify, instance);
            expect(true).to.be.ok.mark();
            done();
        }

        fastify.close((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("onClose should keep the context", (done) => {
        const fastify = server();
        fastify.register(plugin);

        expect(2).checks(done);

        function plugin(instance, opts, next) {
            instance.decorate("test", true);
            instance.addHook("onClose", onClose);
            assert.ok(instance.prototype === fastify.prototype);

            function onClose(i, done) {
                assert.ok(i.test);
                assert.strictEqual(i, instance);
                expect(true).to.be.ok.mark();
                done();
            }

            next();
        }

        fastify.close((err) => {
            assert.notExists(err);
            expect(true).to.be.ok.mark();
        });
    });

    it("Should return 503 while closing - injection", (done) => {
        const fastify = server();

        fastify.addHook("onClose", (instance, done) => {
            setTimeout(done, 150);
        });

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 200);
            fastify.close();

            setTimeout(() => {
                fastify.inject({
                    method: "GET",
                    url: "/"
                }, (err, res) => {
                    assert.notExists(err);
                    assert.strictEqual(res.statusCode, 503);
                    assert.strictEqual(res.headers["content-type"], "application/json");
                    assert.strictEqual(res.headers["content-length"], "80");
                    assert.strictEqual(res.headers.connection, "close");
                    assert.deepEqual(JSON.parse(res.payload), {
                        error: "Service Unavailable",
                        message: "Service Unavailable",
                        statusCode: 503
                    });
                    done();
                });
            }, 100);
        });
    });
});
