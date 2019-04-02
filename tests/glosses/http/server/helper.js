const sget = require("simple-get").concat;
const stream = require("stream");

/**
 * @param method HTTP request method
 * @param t tap instance
 * @param isSetErrorHandler true: using setErrorHandler
 */
module.exports.payloadMethod = function (method, isSetErrorHandler = false) {
    const {
        http: { server }
    } = adone;
    const symbols = server.symbol;
    const fastify = server();

    if (isSetErrorHandler) {
        fastify.setErrorHandler((err, request, reply) => {
            assert.equal(typeof request, "object");
            assert.instanceOf(request, fastify[symbols.kRequest]);
            reply
                .code(err.statusCode)
                .type("application/json; charset=utf-8")
                .send(err);
        });
    }

    const upMethod = method.toUpperCase();
    const loMethod = method.toLowerCase();

    const schema = {
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

    it(`${upMethod} can be created`, (done) => {
        try {
            fastify[loMethod]("/", schema, (req, reply) => {
                reply.code(200).send(req.body);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it(`${upMethod} without schema can be created`, (done) => {
        try {
            fastify[loMethod]("/missing", (req, reply) => {
                reply.code(200).send(req.body);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it(`${upMethod} with body and querystring`, (done) => {
        try {
            fastify[loMethod]("/with-query", (req, reply) => {
                req.body.hello = req.body.hello + req.query.foo;
                reply.code(200).send(req.body);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it(`${upMethod} with bodyLimit option`, (done) => {
        try {
            fastify[loMethod]("/with-limit", { bodyLimit: 1 }, (req, reply) => {
                reply.send(req.body);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    describe(upMethod, () => {
        before((done) => {
            fastify.listen(0, (err) => {
                if (err) {
                    assert.notExists(err);
                    return;
                }

                fastify.server.unref();
                done();
            });
        });

        it(`${upMethod} - correctly replies`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: {
                    hello: "world"
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: "world" });
                done();
            });
        });

        it(`${upMethod} - correctly replies with very large body`, (done) => {
            const largeString = "world".repeat(13200);
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: { hello: largeString },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: largeString });
                done();
            });
        });

        it(`${upMethod} - correctly replies if the content type has the charset`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: JSON.stringify({ hello: "world" }),
                headers: {
                    "content-type": "application/json; charset=utf-8"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), JSON.stringify({ hello: "world" }));
                done();
            });
        });

        it(`${upMethod} without schema - correctly replies`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/missing`,
                body: {
                    hello: "world"
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: "world" });
                done();
            });
        });

        it(`${upMethod} with body and querystring - correctly replies`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/with-query?foo=hello`,
                body: {
                    hello: "world"
                },
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body, { hello: "worldhello" });
                done();
            });
        });

        it(`${upMethod} with no body - correctly replies`, (done) => {
            expect(2).checks(done);
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/missing`,
                headers: { "Content-Length": "0" }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(JSON.parse(body.toString()), null);
                expect(true).to.be.ok.mark();
            });

            // Must use inject to make a request without a Content-Length header
            fastify.inject({
                method: upMethod,
                url: "/missing"
            }, (err, res) => {
                assert.notExists(err);
                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(JSON.parse(res.payload), null);
                expect(true).to.be.ok.mark();
            });
        });

        it(`${upMethod} returns 415 - incorrect media type if body is not json`, (done) => {
            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/missing`,
                body: "hello world"

            }, (err, response, body) => {
                assert.notExists(err);
                if (upMethod === "OPTIONS") {
                    assert.strictEqual(response.statusCode, 200);
                } else {
                    assert.strictEqual(response.statusCode, 415);
                }
                done();
            });
        });

        if (loMethod === "options") {
            it("OPTIONS returns 415 - should return 415 if Content-Type is not json or plain text", (done) => {
                sget({
                    method: upMethod,
                    url: `http://localhost:${fastify.server.address().port}/missing`,
                    body: "hello world",
                    headers: {
                        "Content-Type": "text/xml"
                    }
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 415);
                    done();
                });
            });
        }

        it(`${upMethod} returns 400 - Bad Request`, (done) => {
            expect(2).checks(done);

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                body: "hello world",
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                expect(true).to.be.ok.mark();
            });

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": "0"
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                expect(true).to.be.ok.mark();
            });
        });

        it(`${upMethod} returns 413 - Payload Too Large`, (done) => {
            expect(upMethod === "OPTIONS" ? 2 : 3).checks(done);

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": 1024 * 1024 + 1
                }
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 413);
                expect(true).to.be.ok.mark();
            });

            // Node errors for OPTIONS requests with a stream body and no Content-Length header
            if (upMethod !== "OPTIONS") {
                let chunk = Buffer.alloc(1024 * 1024 + 1, 0);
                const largeStream = new stream.Readable({
                    read() {
                        this.push(chunk);
                        chunk = null;
                    }
                });
                sget({
                    method: upMethod,
                    url: `http://localhost:${fastify.server.address().port}`,
                    headers: { "Content-Type": "application/json" },
                    body: largeStream
                }, (err, response, body) => {
                    assert.notExists(err);
                    assert.strictEqual(response.statusCode, 413);
                    expect(true).to.be.ok.mark();
                });
            }

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}/with-limit`,
                headers: { "Content-Type": "application/json" },
                body: {},
                json: true
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 413);
                expect(true).to.be.ok.mark();
            });
        });

        it(`${upMethod} should fail with empty body and application/json content-type`, (done) => {
            if (upMethod === "OPTIONS") {
                return done();
            }

            expect(6).checks(done);

            fastify.inject({
                method: `${upMethod}`,
                url: "/",
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "application/json"
                }
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body.toString()), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: `${upMethod}`,
                url: "/",
                headers: {
                    "Content-Type": "application/json"
                },
                payload: null
            }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "application/json"
                },
                payload: null
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body.toString()), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });

            fastify.inject({
                method: `${upMethod}`,
                url: "/",
                headers: {
                    "Content-Type": "application/json"
                },
                payload: undefined
            }, (err, res) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(res.payload), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });

            sget({
                method: upMethod,
                url: `http://localhost:${fastify.server.address().port}`,
                headers: {
                    "Content-Type": "application/json"
                },
                payload: undefined
            }, (err, res, body) => {
                assert.notExists(err);
                assert.deepEqual(JSON.parse(body.toString()), {
                    error: "Bad Request",
                    code: "FST_ERR_CTP_EMPTY_JSON_BODY",
                    message: "FST_ERR_CTP_EMPTY_JSON_BODY: Body cannot be empty when content-type is set to 'application/json'",
                    statusCode: 400
                });
                expect(true).to.be.ok.mark();
            });
        });
    });
};
