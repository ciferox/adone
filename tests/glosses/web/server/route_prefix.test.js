const {
    web: { server }
} = adone;

describe("route prefix", () => {
    it("Prefix options should add a prefix for all the routes inside a register / 1", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.get("/first", (req, reply) => {
            reply.send({ route: "/first" });
        });

        fastify.register((fastify, opts, next) => {
            fastify.get("/first", (req, reply) => {
                reply.send({ route: "/v1/first" });
            });

            fastify.register((fastify, opts, next) => {
                fastify.get("/first", (req, reply) => {
                    reply.send({ route: "/v1/v2/first" });
                });
                next();
            }, { prefix: "/v2" });

            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/first"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/first" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/first"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/first" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/v2/first"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/v2/first" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Prefix options should add a prefix for all the routes inside a register / 2", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.get("/first", (req, reply) => {
                reply.send({ route: "/v1/first" });
            });

            fastify.get("/second", (req, reply) => {
                reply.send({ route: "/v1/second" });
            });
            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/v1/first"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/first" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/second"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/second" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Prefix options should add a prefix for all the chained routes inside a register / 3", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify
                .get("/first", (req, reply) => {
                    reply.send({ route: "/v1/first" });
                })
                .get("/second", (req, reply) => {
                    reply.send({ route: "/v1/second" });
                });
            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/v1/first"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/first" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/second"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/second" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Prefix should support parameters as well", (done) => {
        const fastify = server();

        fastify.register((fastify, opts, next) => {
            fastify.get("/hello", (req, reply) => {
                reply.send({ id: req.params.id });
            });
            next();
        }, { prefix: "/v1/:id" });

        fastify.inject({
            method: "GET",
            url: "/v1/param/hello"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { id: "param" });
            done();
        });
    });

    it("Prefix should support /", (done) => {
        const fastify = server();

        fastify.register((fastify, opts, next) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });
            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/v1"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            done();
        });
    });

    it("Prefix without /", (done) => {
        const fastify = server();

        fastify.register((fastify, opts, next) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });
            next();
        }, { prefix: "v1" });

        fastify.inject({
            method: "GET",
            url: "/v1"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            done();
        });
    });

    it("Prefix with trailing /", (done) => {
        const fastify = server();

        expect(3).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.get("/route1", (req, reply) => {
                reply.send({ hello: "world1" });
            });
            fastify.get("route2", (req, reply) => {
                reply.send({ hello: "world2" });
            });

            fastify.register((fastify, opts, next) => {
                fastify.get("/route3", (req, reply) => {
                    reply.send({ hello: "world3" });
                });
                next();
            }, { prefix: "/inner/" });

            next();
        }, { prefix: "/v1/" });

        fastify.inject({
            method: "GET",
            url: "/v1/route1"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world1" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/route2"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world2" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/inner/route3"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world3" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Prefix works multiple levels deep", (done) => {
        const fastify = server();

        fastify.register((fastify, opts, next) => {
            fastify.register((fastify, opts, next) => {
                fastify.register((fastify, opts, next) => {
                    fastify.register((fastify, opts, next) => {
                        fastify.get("/", (req, reply) => {
                            reply.send({ hello: "world" });
                        });
                        next();
                    }, { prefix: "/v3" });
                    next();
                }); // No prefix on this level
                next();
            }, { prefix: "v2" });
            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/v1/v2/v3"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            done();
        });
    });

    it("Different register - encapsulation check", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.get("/first", (req, reply) => {
            reply.send({ route: "/first" });
        });

        fastify.register((instance, opts, next) => {
            instance.register((f, opts, next) => {
                f.get("/", (req, reply) => {
                    reply.send({ route: "/v1/v2" });
                });
                next();
            }, { prefix: "/v2" });
            next();
        }, { prefix: "/v1" });

        fastify.register((instance, opts, next) => {
            instance.register((f, opts, next) => {
                f.get("/", (req, reply) => {
                    reply.send({ route: "/v3/v4" });
                });
                next();
            }, { prefix: "/v4" });
            next();
        }, { prefix: "/v3" });

        fastify.inject({
            method: "GET",
            url: "/v1/v2"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v1/v2" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v3/v4"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { route: "/v3/v4" });
            expect(true).to.be.ok.mark();
        });
    });

    it("Can retrieve prefix within encapsulated instances", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((instance, opts, next) => {
            instance.get("/one", (req, reply) => {
                reply.send(instance.prefix);
            });

            instance.register((instance, opts, next) => {
                instance.get("/two", (req, reply) => {
                    reply.send(instance.prefix);
                });
                next();
            }, { prefix: "/v2" });

            next();
        }, { prefix: "/v1" });

        fastify.inject({
            method: "GET",
            url: "/v1/one"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.payload, "/v1");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/v1/v2/two"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.payload, "/v1/v2");
            expect(true).to.be.ok.mark();
        });
    });

    it("matches both /prefix and /prefix/ with a / route", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        }, { prefix: "/prefix" });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it('prefix "/prefix/" does not match "/prefix" with a / route', (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        }, { prefix: "/prefix/" });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 404);
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it("matches both /prefix and /prefix/ with a / route - ignoreTrailingSlash: true", (done) => {
        const fastify = server({
            ignoreTrailingSlash: true
        });

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });

            next();
        }, { prefix: "/prefix" });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreTrailingSlash: false', (done) => {
        const fastify = server({
            ignoreTrailingSlash: false
        });

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.route({
                method: "GET",
                url: "/",
                prefixTrailingSlash: "both",
                handler: (req, reply) => {
                    reply.send({ hello: "world" });
                }
            });

            next();
        }, { prefix: "/prefix" });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });
    });

    it('matches only /prefix  with a / route - prefixTrailingSlash: "no-slash", ignoreTrailingSlash: false', (done) => {
        const fastify = server({
            ignoreTrailingSlash: false
        });

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.route({
                method: "GET",
                url: "/",
                prefixTrailingSlash: "no-slash",
                handler: (req, reply) => {
                    reply.send({ hello: "world" });
                }
            });

            next();
        }, { prefix: "/prefix" });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(JSON.parse(res.payload).statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });

    it('matches only /prefix/  with a / route - prefixTrailingSlash: "slash", ignoreTrailingSlash: false', (done) => {
        const fastify = server({
            ignoreTrailingSlash: false
        });

        expect(2).checks(done);

        fastify.register((fastify, opts, next) => {
            fastify.route({
                method: "GET",
                url: "/",
                prefixTrailingSlash: "slash",
                handler: (req, reply) => {
                    reply.send({ hello: "world" });
                }
            });

            next();
        }, { prefix: "/prefix" });

        fastify.inject({
            method: "GET",
            url: "/prefix/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(JSON.parse(res.payload), { hello: "world" });
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/prefix"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(JSON.parse(res.payload).statusCode, 404);
            expect(true).to.be.ok.mark();
        });
    });
});
