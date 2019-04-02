const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;
const fastify = server();

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

const nullSchema = {
    schema: {
        response: {
            "2xx": {
                type: "null"
            }
        }
    }
};

const numberSchema = {
    schema: {
        response: {
            "2xx": {
                type: "object",
                properties: {
                    hello: {
                        type: "number"
                    }
                }
            }
        }
    }
};

const querySchema = {
    schema: {
        querystring: {
            type: "object",
            properties: {
                hello: {
                    type: "integer"
                }
            }
        }
    }
};

const paramsSchema = {
    schema: {
        params: {
            type: "object",
            properties: {
                foo: {
                    type: "string"
                },
                test: {
                    type: "integer"
                }
            }
        }
    }
};

const headersSchema = {
    schema: {
        headers: {
            type: "object",
            properties: {
                "x-test": {
                    type: "number"
                },
                "Y-Test": {
                    type: "number"
                }
            }
        }
    }
};

describe("get", () => {
    it("shorthand - get", (done) => {
        try {
            fastify.get("/", schema, (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - get (return null)", (done) => {
        try {
            fastify.get("/null", nullSchema, (req, reply) => {
                reply.code(200).send(null);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - get params", (done) => {
        try {
            fastify.get("/params/:foo/:test", paramsSchema, (req, reply) => {
                reply.code(200).send(req.params);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - get, querystring schema", (done) => {
        try {
            fastify.get("/query", querySchema, (req, reply) => {
                reply.code(200).send(req.query);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - get, headers schema", (done) => {
        try {
            fastify.get("/headers", headersSchema, (req, reply) => {
                reply.code(200).send(req.headers);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("missing schema - get", (done) => {
        try {
            fastify.get("/missing", (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("custom serializer - get", (done) => {
        function customSerializer(data) {
            return JSON.stringify(data);
        }

        try {
            fastify.get("/custom-serializer", numberSchema, (req, reply) => {
                reply.code(200).serializer(customSerializer).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("empty response", (done) => {
        try {
            fastify.get("/empty", (req, reply) => {
                reply.code(200).send();
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("send a falsy boolean", (done) => {
        try {
            fastify.get("/boolean", (req, reply) => {
                reply.code(200).send(false);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    fastify.listen(0, (err) => {
        assert.notExists(err);
        fastify.server.unref();

        it("shorthand - request get", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - request get params schema", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/params/world/123`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { foo: "world", test: 123 });
                done();
            });
        });

        it("shorthand - request get params schema error", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/params/world/string`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(JSON.parse(body), {
                    error: "Bad Request",
                    message: "params.test should be integer",
                    statusCode: 400
                });
                done();
            });
        });

        it("shorthand - request get headers schema", (done) => {
            sget({
                method: "GET",
                headers: {
                    "x-test": "1",
                    "Y-Test": "3"
                },
                json: true,
                url: `http://localhost:${fastify.server.address().port}/headers`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body["x-test"], 1);
                assert.strictEqual(body["y-test"], 3);
                done();
            });
        });

        it("shorthand - request get headers schema error", (done) => {
            sget({
                method: "GET",
                headers: {
                    "x-test": "abc"
                },
                url: `http://localhost:${fastify.server.address().port}/headers`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(JSON.parse(body), {
                    error: "Bad Request",
                    message: "headers['x-test'] should be number",
                    statusCode: 400
                });
                done();
            });
        });

        it("shorthand - request get querystring schema", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/query?hello=123`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: 123 });
                done();
            });
        });

        it("shorthand - request get querystring schema error", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/query?hello=world`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.deepEqual(JSON.parse(body), {
                    error: "Bad Request",
                    message: "querystring.hello should be integer",
                    statusCode: 400
                });
                done();
            });
        });

        it("shorthand - request get missing schema", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/missing`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - custom serializer", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/custom-serializer`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - empty response", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/empty`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], "0");
                assert.deepEqual(body.toString(), "");
                done();
            });
        });

        it("shorthand - send a falsy boolean", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/boolean`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), "false");
                done();
            });
        });

        it("shorthand - send null value", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/null`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(body.toString(), "null");
                done();
            });
        });
    });
});
