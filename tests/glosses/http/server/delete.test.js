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
                }
            }
        }
    }
};

const bodySchema = {
    schema: {
        body: {
            type: "object",
            properties: {
                hello: {
                    type: "string"
                }
            }
        },
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

describe("delete", () => {
    it("shorthand - delete", (done) => {
        try {
            fastify.delete("/", schema, (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - delete params", (done) => {
        try {
            fastify.delete("/params/:foo/:test", paramsSchema, (req, reply) => {
                reply.code(200).send(req.params);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - delete, querystring schema", (done) => {
        try {
            fastify.delete("/query", querySchema, (req, reply) => {
                reply.send(req.query);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - get, headers schema", (done) => {
        try {
            fastify.delete("/headers", headersSchema, (req, reply) => {
                reply.code(200).send(req.headers);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("missing schema - delete", (done) => {
        try {
            fastify.delete("/missing", (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("body - delete", (done) => {
        try {
            fastify.delete("/body", bodySchema, (req, reply) => {
                reply.send(req.body);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    describe("shorthand", () => {
        before((done) => {
            fastify.listen(0, (err) => {
                assert.notExists(err);
                fastify.server.unref();
                done();
            });
        });

        it("shorthand - request delete", (done) => {
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - request delete params schema", (done) => {
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}/params/world/123`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { foo: "world", test: 123 });
                done();
            });
        });

        it("shorthand - request delete params schema error", (done) => {
            sget({
                method: "DELETE",
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

        it("shorthand - request delete headers schema", (done) => {
            sget({
                method: "DELETE",
                headers: {
                    "x-test": 1
                },
                url: `http://localhost:${fastify.server.address().port}/headers`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.strictEqual(JSON.parse(body)["x-test"], 1);
                done();
            });
        });

        it("shorthand - request delete headers schema error", (done) => {
            sget({
                method: "DELETE",
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

        it("shorthand - request delete querystring schema", (done) => {
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}/query?hello=123`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: 123 });
                done();
            });
        });

        it("shorthand - request delete querystring schema error", (done) => {
            sget({
                method: "DELETE",
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

        it("shorthand - request delete missing schema", (done) => {
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}/missing`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - delete with body", (done) => {
            sget({
                method: "DELETE",
                url: `http://localhost:${fastify.server.address().port}/body`,
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
    });

    // https://github.com/fastify/fastify/issues/936
    it("shorthand - delete with application/json Content-Type header and without body", (done) => {
        const fastify = server();
        fastify.delete("/", {}, (req, reply) => {
            assert.equal(req.body, null);
            reply.send(req.body);
        });
        fastify.inject({
            method: "DELETE",
            url: "/",
            headers: { "Content-Type": "application/json" },
            body: null
        }, (err, response) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 200);
            assert.deepEqual(JSON.parse(response.payload), null);
            done();
        });
    });
});
