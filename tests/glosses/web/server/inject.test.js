const {
    web: { server }
} = adone;

const Stream = require("stream");
const util = require("util");
const FormData = require("form-data");

describe("inject", () => {
    it("inject should exist", () => {
        const fastify = server();
        assert.ok(fastify.inject);
        assert.equal(typeof fastify.inject, "function");
    });

    it("should wait for the ready event", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.register((instance, opts, next) => {
            instance.get("/", (req, reply) => {
                reply.send(payload);
            });

            setTimeout(next, 500);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(payload, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.get("/", (req, reply) => {
            reply.send(payload);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(payload, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request - code check", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.get("/", (req, reply) => {
            reply.code(201).send(payload);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(payload, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 201);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request - headers check", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.header("content-type", "text/plain").send("");
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual("", res.payload);
            assert.strictEqual(res.headers["content-type"], "text/plain");
            assert.strictEqual(res.headers["content-length"], "0");
            done();
        });
    });

    it("inject get request - querystring", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send(req.query);
        });

        fastify.inject({
            method: "GET",
            url: "/?hello=world"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual({ hello: "world" }, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request - params", (done) => {
        const fastify = server();

        fastify.get("/:hello", (req, reply) => {
            reply.send(req.params);
        });

        fastify.inject({
            method: "GET",
            url: "/world"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual({ hello: "world" }, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request - wildcard", (done) => {
        const fastify = server();

        fastify.get("/test/*", (req, reply) => {
            reply.send(req.params);
        });

        fastify.inject({
            method: "GET",
            url: "/test/wildcard"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual({ "*": "wildcard" }, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "16");
            done();
        });
    });

    it("inject get request - headers", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send(req.headers);
        });

        fastify.inject({
            method: "GET",
            url: "/",
            headers: { hello: "world" }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual("world", JSON.parse(res.payload).hello);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "69");
            done();
        });
    });

    it("inject post request", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            payload
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual(payload, JSON.parse(res.payload));
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject post request - send stream", (done) => {
        const fastify = server();

        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        fastify.inject({
            method: "POST",
            url: "/",
            headers: { "content-type": "application/json" },
            payload: getStream()
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual('{"hello":"world"}', res.payload);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers["content-length"], "17");
            done();
        });
    });

    it("inject get request - reply stream", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send(getStream());
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.deepEqual('{"hello":"world"}', res.payload);
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });

    it("inject promisify - waiting for ready event", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.get("/", (req, reply) => {
            reply.send(payload);
        });

        const injectParams = {
            method: "GET",
            url: "/"
        };
        fastify.inject(injectParams).then((res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
        }).catch(assert.fail);
    });

    it("inject promisify - after the ready event", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.get("/", (req, reply) => {
            reply.send(payload);
        });

        fastify.ready((err) => {
            assert.notExists(err);

            const injectParams = {
                method: "GET",
                url: "/"
            };
            fastify.inject(injectParams).then((res) => {
                assert.strictEqual(res.statusCode, 200);
                done();
            }).catch(assert.fail);
        });
    });

    it("inject promisify - when the server is up", (done) => {
        const fastify = server();
        const payload = { hello: "world" };

        fastify.get("/", (req, reply) => {
            reply.send(payload);
        });

        fastify.ready((err) => {
            assert.notExists(err);

            // setTimeout because the ready event don't set "started" flag
            // in this iteration of the 'event loop'
            setTimeout(() => {
                const injectParams = {
                    method: "GET",
                    url: "/"
                };
                fastify.inject(injectParams).then((res) => {
                    assert.strictEqual(res.statusCode, 200);
                    done();
                }).catch(assert.fail);
            }, 10);
        });
    });

    it("should reject in error case", (done) => {
        const fastify = server();

        const error = new Error("DOOM!");
        fastify.register((instance, opts, next) => {
            setTimeout(next, 500, error);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }).catch((e) => {
            assert.strictEqual(e, error);
            done();
        });
    });

    it("inject a multipart request using form-body", (done) => {
        const fastify = server();

        fastify.addContentTypeParser("*", (req, done) => {
            let body = "";
            req.on("data", (d) => {
                body += d;
            });
            req.on("end", () => {
                done(null, body);
            });
        });
        fastify.post("/", (req, reply) => {
            reply.send(req.body);
        });

        const form = new FormData();
        form.append("my_field", "my value");

        fastify.inject({
            method: "POST",
            url: "/",
            payload: form
        }).then((response) => {
            assert.equal(response.statusCode, 200);
            assert.ok(/Content-Disposition: form-data; name="my_field"/.test(response.payload));
            done();
        });
    });

    // https://github.com/hapijs/shot/blob/master/test/index.js#L836
    function getStream() {
        const Read = function () {
            Stream.Readable.call(this);
        };
        util.inherits(Read, Stream.Readable);
        const word = '{"hello":"world"}';
        let i = 0;

        Read.prototype._read = function (size) {
            this.push(word[i] ? word[i++] : null);
        };

        return new Read();
    }

    it("should error the promise if ready errors", (done) => {
        expect(2).checks(done);
        const fastify = server();

        fastify.register((instance, opts) => {
            return Promise.reject(new Error("kaboom"));
        }).after(() => {
            // t.pass("after is called");
            expect(true).to.be.ok.mark();
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }).then(() => {
            assert.fail("this should not be called");
        }).catch((err) => {
            assert.ok(err);
            assert.strictEqual(err.message, "kaboom");
            expect(true).to.be.ok.mark();
        });
    });

    it("should throw error if callback specified and if ready errors", (done) => {
        const fastify = server();
        const error = new Error("kaboom");

        fastify.register((instance, opts) => {
            return Promise.reject(error);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err) => {
            assert.ok(err);
            assert.strictEqual(err, error);
            done();
        });
    });
});
