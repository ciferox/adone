/* eslint-disable func-style */
const {
    is,
    web: { server }
} = adone;

const net = require("net");
const semver = require("semver");
const statusCodes = require("http").STATUS_CODES;


describe("reply error", () => {
    const codes = Object.keys(statusCodes);

    function helper(code) {
        it(`Reply error handling - code: ${code}`, (done) => {
            const fastify = server();
            const err = new Error("winter is coming");

            fastify.get("/", (req, reply) => {
                reply
                    .code(Number(code))
                    .send(err);
            });

            fastify.inject({
                method: "GET",
                url: "/"
            }, (error, res) => {
                assert.notExists(error);
                assert.strictEqual(res.statusCode, Number(code));
                assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
                assert.deepEqual(
                    {
                        error: statusCodes[code],
                        message: err.message,
                        statusCode: Number(code)
                    },
                    JSON.parse(res.payload)
                );
                done();
            });
        });
    }

    codes.forEach((code) => {
        if (Number(code) >= 400) {
            helper(code);
        }
    });

    it("preHandler hook error handling with external code", (done) => {
        const fastify = server();
        const err = new Error("winter is coming");

        fastify.addHook("preHandler", (req, reply, done) => {
            reply.code(400);
            done(err);
        });

        fastify.get("/", () => { });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (error, res) => {
            assert.notExists(error);
            assert.strictEqual(res.statusCode, 400);
            assert.deepEqual(
                {
                    error: statusCodes["400"],
                    message: err.message,
                    statusCode: 400
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    it("onRequest hook error handling with external done", (done) => {
        const fastify = server();
        const err = new Error("winter is coming");

        fastify.addHook("onRequest", (req, reply, done) => {
            reply.code(400);
            done(err);
        });

        fastify.get("/", () => { });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (error, res) => {
            assert.notExists(error);
            assert.strictEqual(res.statusCode, 400);
            assert.deepEqual(
                {
                    error: statusCodes["400"],
                    message: err.message,
                    statusCode: 400
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    if (semver.gt(process.versions.node, "6.0.0")) {
        it("Should reply 400 on client error", (done) => {

            const fastify = server();
            fastify.listen(0, (err) => {
                assert.notExists(err);

                const client = net.connect(fastify.server.address().port);
                client.end("oooops!");

                let chunks = "";
                client.on("data", (chunk) => {
                    chunks += chunk;
                });

                client.once("end", () => {
                    const body = JSON.stringify({
                        error: "Bad Request",
                        message: "Client Error",
                        statusCode: 400
                    });
                    assert.equal(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`, chunks);
                    fastify.close();
                    done();
                });
            });
        });
    }

    it("Error instance sets HTTP status code", (done) => {
        const fastify = server();
        const err = new Error("winter is coming");
        err.statusCode = 418;

        fastify.get("/", () => {
            return Promise.reject(err);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (error, res) => {
            assert.notExists(error);
            assert.strictEqual(res.statusCode, 418);
            assert.deepEqual(
                {
                    error: statusCodes["418"],
                    message: err.message,
                    statusCode: 418
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    it("Error status code below 400 defaults to 500", (done) => {
        const fastify = server();
        const err = new Error("winter is coming");
        err.statusCode = 399;

        fastify.get("/", () => {
            return Promise.reject(err);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (error, res) => {
            assert.notExists(error);
            assert.strictEqual(res.statusCode, 500);
            assert.deepEqual(
                {
                    error: statusCodes["500"],
                    message: err.message,
                    statusCode: 500
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    it("Error.status property support", (done) => {
        const fastify = server();
        const err = new Error("winter is coming");
        err.status = 418;

        fastify.get("/", () => {
            return Promise.reject(err);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (error, res) => {
            assert.notExists(error);
            assert.strictEqual(res.statusCode, 418);
            assert.deepEqual(
                {
                    error: statusCodes["418"],
                    message: err.message,
                    statusCode: 418
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    describe("Support rejection with values that are not Error instances", () => {
        const objs = [
            0,
            "",
            [],
            {},
            null,
            undefined,
            123,
            "abc",
            new RegExp(),
            new Date(),
            new Uint8Array()
        ];
        for (const nonErr of objs) {
            // eslint-disable-next-line no-loop-func
            it(`Type: ${typeof nonErr}`, (done) => {
                const fastify = server();

                expect(2).checks(done);

                fastify.get("/", () => {
                    return Promise.reject(nonErr);
                });

                fastify.setErrorHandler((err, request, reply) => {
                    if (typeof err === "object") {
                        assert.deepEqual(err, nonErr);
                    } else {
                        assert.strictEqual(err, nonErr);
                    }
                    expect(true).to.be.ok.mark();
                    reply.send("error");
                });

                fastify.inject({
                    method: "GET",
                    url: "/"
                }, (error, res) => {
                    assert.notExists(error);
                    assert.strictEqual(res.statusCode, 500);
                    assert.strictEqual(res.payload, "error");
                    expect(true).to.be.ok.mark();
                });
            });
        }
    });

    it("invalid schema - ajv", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.get("/", {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        id: { type: "number" }
                    }
                }
            }
        }, (req, reply) => {
            assert.fail("we should not be here");
        });

        fastify.setErrorHandler((err, request, reply) => {
            assert.ok(is.array(err.validation));
            expect(true).to.be.ok.mark();
            reply.send("error");
        });

        fastify.inject({
            url: "/?id=abc",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.payload, "error");
            expect(true).to.be.ok.mark();
        });
    });

    it("should set the status code and the headers from the error object (from route handler)", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            const error = new Error("kaboom");
            error.headers = { hello: "world" };
            error.statusCode = 400;
            reply.send(error);
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.headers.hello, "world");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "kaboom",
                statusCode: 400
            });
            done();
        });
    });

    it("should set the status code and the headers from the error object (from custom error handler)", (done) => {
        const fastify = server();

        expect(2).checks(done);

        fastify.get("/", (req, reply) => {
            const error = new Error("ouch");
            error.statusCode = 401;
            reply.send(error);
        });

        fastify.setErrorHandler((err, request, reply) => {
            assert.equal(err.message, "ouch");
            assert.equal(reply.res.statusCode, 401);
            expect(true).to.be.ok.mark();
            const error = new Error("kaboom");
            error.headers = { hello: "world" };
            error.statusCode = 400;
            reply.send(error);
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.headers.hello, "world");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "kaboom",
                statusCode: 400
            });
            expect(true).to.be.ok.mark();
        });
    });

    // Issue 595 https://github.com/fastify/fastify/issues/595
    it("'*' should throw an error due to serializer can not handle the payload type", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.type("text/html");
            try {
                reply.send({});
            } catch (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.code, "FST_ERR_REP_INVALID_PAYLOAD_TYPE");
                assert.equal(err.message, "FST_ERR_REP_INVALID_PAYLOAD_TYPE: Attempted to send payload of invalid type 'object'. Expected a string or Buffer.");
                done();
            }
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (e, res) => {
            assert.fail("should not be called");
        });
    });

    it("should throw an error if the custom serializer does not serialize the payload to a valid type", (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            try {
                reply
                    .type("text/html")
                    .serializer((payload) => payload)
                    .send({});
            } catch (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.code, "FST_ERR_REP_INVALID_PAYLOAD_TYPE");
                assert.equal(err.message, "FST_ERR_REP_INVALID_PAYLOAD_TYPE: Attempted to send payload of invalid type 'object'. Expected a string or Buffer.");
                done();
            }
        });

        fastify.inject({
            url: "/",
            method: "GET"
        }, (e, res) => {
            assert.fail("should not be called");
        });
    });
});
