/* eslint-disable func-style */
const {
    web: { server }
} = adone;


const sget = require("simple-get").concat;
const split = require("split2");
const pino = require("pino");
const statusCodes = require("http").STATUS_CODES;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const opts = {
    schema: {
        response: {
            "2xx": {
                type: "object",
                properties: {
                    hello: {
                        type: "string"
                    }
                }
            }
        }
    }
};

describe("async/await", () => {
    it("async await", (done) => {
        expect(4).checks(done);
        const fastify = server();
        try {
            fastify.get("/", opts, async function awaitMyFunc(req, reply) {
                await sleep(200);
                return { hello: "world" };
            });
            expect(true).to.be.ok.mark();
        } catch (e) {
            assert.fail();
        }

        try {
            fastify.get("/no-await", opts, async (req, reply) => {
                return { hello: "world" };
            });
            expect(true).to.be.ok.mark();
        } catch (e) {
            assert.fail();
        }

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
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/no-await`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("ignore the result of the promise if reply.send is called beforehand (undefined)", (done) => {
        const s = server();
        const payload = { hello: "world" };

        expect(1).checks(() => {
            s.close();
            done();
        });

        s.get("/", async function awaitMyFunc(req, reply) {
            reply.send(payload);
        });

        s.listen(0, (err) => {
            assert.notExists(err);
            sget({
                method: "GET",
                url: `http://localhost:${s.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(payload, JSON.parse(body));
                assert.strictEqual(res.statusCode, 200);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("ignore the result of the promise if reply.send is called beforehand (object)", (done) => {
        const s = server();
        const payload = { hello: "world2" };

        s.get("/", async function awaitMyFunc(req, reply) {
            reply.send(payload);
            return { hello: "world" };
        });

        s.listen(0, (err) => {
            assert.notExists(err);
            sget({
                method: "GET",
                url: `http://localhost:${s.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(payload, JSON.parse(body));
                assert.strictEqual(res.statusCode, 200);

                s.close();
                done();
            });
        });
    });

    it("server logs an error if reply.send is called and a value is returned via async/await", (done) => {
        const lines = ["incoming request", "request completed", "Reply already sent"];

        expect(lines.length).checks(done);

        const splitStream = split(JSON.parse);
        splitStream.on("data", (line) => {
            assert.equal(line.msg, lines.shift());
            expect(true).to.be.ok.mark();
        });

        const logger = pino(splitStream);

        const fastify = server({
            logger
        });

        fastify.get("/", async (req, reply) => {
            reply.send({ hello: "world" });
            return { hello: "world2" };
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
        });
    });

    it("ignore the result of the promise if reply.send is called beforehand (undefined)", (done) => {
        const s = server();
        const payload = { hello: "world" };

        s.get("/", async function awaitMyFunc(req, reply) {
            reply.send(payload);
        });

        s.listen(0, (err) => {
            assert.notExists(err);
            sget({
                method: "GET",
                url: `http://localhost:${s.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(payload, JSON.parse(body));
                assert.strictEqual(res.statusCode, 200);

                s.close();
                done();
            });
        });
    });

    it("ignore the result of the promise if reply.send is called beforehand (object)", (done) => {
        const s = server();
        const payload = { hello: "world2" };

        s.get("/", async function awaitMyFunc(req, reply) {
            reply.send(payload);
            return { hello: "world" };
        });

        s.listen(0, (err) => {
            assert.notExists(err);
            sget({
                method: "GET",
                url: `http://localhost:${s.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(payload, JSON.parse(body));
                assert.strictEqual(res.statusCode, 200);

                s.close();
                done();
            });
        });
    });

    it("support reply decorators with await", (done) => {
        const fastify = server();

        fastify.decorateReply("wow", function () {
            setImmediate(() => {
                this.send({ hello: "world" });
            });
        });

        fastify.get("/", async (req, reply) => {
            await sleep(1);
            reply.wow();
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.deepEqual(payload, { hello: "world" });
            done();
        });
    });

    it("support 204", (done) => {
        const fastify = server();

        fastify.get("/", async (req, reply) => {
            reply.code(204);
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 204);
            done();
        });
    });

    it("inject async await", async (done) => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        try {
            const res = await fastify.inject({ method: "GET", url: "/" });
            assert.deepEqual({ hello: "world" }, JSON.parse(res.payload));
            done();
        } catch (err) {
            assert.fail(err);
        }
    });

    it("inject async await - when the server is up", async () => {
        const fastify = server();

        fastify.get("/", (req, reply) => {
            reply.send({ hello: "world" });
        });

        try {
            const res = await fastify.inject({ method: "GET", url: "/" });
            assert.deepEqual({ hello: "world" }, JSON.parse(res.payload));
        } catch (err) {
            assert.fail(err);
        }

        await sleep(200);

        try {
            const res2 = await fastify.inject({ method: "GET", url: "/" });
            assert.deepEqual({ hello: "world" }, JSON.parse(res2.payload));
        } catch (err) {
            assert.fail(err);
        }
    });

    it("async await plugin", async () => {
        const fastify = server();

        fastify.register(async (fastify, opts) => {
            fastify.get("/", (req, reply) => {
                reply.send({ hello: "world" });
            });

            await sleep(200);
        });

        try {
            const res = await fastify.inject({ method: "GET", url: "/" });
            assert.deepEqual({ hello: "world" }, JSON.parse(res.payload));
        } catch (err) {
            assert.fail(err);
        }
    });

    it("does not call reply.send() twice if 204 reponse is already sent", (done) => {
        const fastify = server();

        fastify.get("/", async (req, reply) => {
            reply.code(204).send();
            reply.send = () => {
                throw new Error("reply.send() was called twice");
            };
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.statusCode, 204);
            done();
        });
    });

    it("error is logged because promise was fulfilled with undefined", (done) => {
        let fastify = null;

        expect(2).checks(() => {
            fastify.close();
            done();
        })
        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "error"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/", async (req, reply) => {
            reply.code(200);
        });

        stream.once("data", (line) => {
            assert.strictEqual(line.msg, "Promise may not be fulfilled with 'undefined' when statusCode is not 204");
            expect(true).to.be.ok.mark();
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/`,
                timeout: 500
            }, (err, res, body) => {
                assert.equal(err.message, "Request timed out");
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("error is not logged because promise was fulfilled with undefined but statusCode 204 was set", (done) => {
        let fastify = null;

        expect(1).checks(() => {
            fastify.close();
            done();
        });

        const stream = split(JSON.parse);
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "error"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/", async (req, reply) => {
            reply.code(204);
        });

        stream.once("data", (line) => {
            assert.fail("should not log an error");
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 204);
                expect(true).to.be.ok.mark();
            });
        });
    });

    it("error is not logged because promise was fulfilled with undefined but response was sent before promise resolution", (done) => {
        let fastify = null;
        const stream = split(JSON.parse);
        const payload = { hello: "world" };
        try {
            fastify = server({
                logger: {
                    stream,
                    level: "error"
                }
            });
        } catch (e) {
            assert.fail();
        }

        fastify.get("/", async (req, reply) => {
            reply.send(payload);
        });

        stream.once("data", (line) => {
            assert.fail("should not log an error");
        });

        fastify.listen(0, (err) => {
            assert.notExists(err);
            fastify.server.unref();

            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/`
            }, (err, res, body) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 200);
                assert.deepEqual(
                    payload,
                    JSON.parse(body)
                );

                fastify.close();
                done();
            });
        });
    });

    it("Thrown Error instance sets HTTP status code", (done) => {
        const fastify = server();

        const err = new Error("winter is coming");
        err.statusCode = 418;

        fastify.get("/", async (req, reply) => {
            throw err;
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

    it("customErrorHandler support", (done) => {
        const fastify = server();

        fastify.get("/", async (req, reply) => {
            const error = new Error("ouch");
            error.statusCode = 400;
            throw error;
        });

        fastify.setErrorHandler(async (err) => {
            assert.equal(err.message, "ouch");
            const error = new Error("kaboom");
            error.statusCode = 401;
            throw error;
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 401);
            assert.deepEqual(
                {
                    error: statusCodes["401"],
                    message: "kaboom",
                    statusCode: 401
                },
                JSON.parse(res.payload)
            );
            done();
        });
    });

    it("customErrorHandler support without throwing", (done) => {
        const fastify = server();

        fastify.get("/", async (req, reply) => {
            const error = new Error("ouch");
            error.statusCode = 400;
            throw error;
        });

        fastify.setErrorHandler(async (err, req, reply) => {
            assert.equal(err.message, "ouch");
            reply.code(401).send("kaboom");
            reply.send = () => assert.fail("should not be called");
        });

        fastify.inject({
            method: "GET",
            url: "/"
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 401);
            assert.deepEqual(
                "kaboom",
                res.payload
            );
            done();
        });
    });
});

