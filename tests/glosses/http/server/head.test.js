const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;
const fastify = server();

const schema = {
    schema: {
        response: {
            "2xx": {
                type: "null"
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

describe("head", () => {
    it("shorthand - head", (done) => {

        try {
            fastify.head("/", schema, (req, reply) => {
                reply.code(200).send(null);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - head params", (done) => {

        try {
            fastify.head("/params/:foo/:test", paramsSchema, (req, reply) => {
                reply.send(null);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - head, querystring schema", (done) => {

        try {
            fastify.head("/query", querySchema, (req, reply) => {
                reply.code(200).send(null);
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("missing schema - head", (done) => {

        try {
            fastify.head("/missing", (req, reply) => {
                reply.code(200).send(null);
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

        it("shorthand - request head", (done) => {
            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                done();
            });
        });

        it("shorthand - request head params schema", (done) => {

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}/params/world/123`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                done();
            });
        });

        it("shorthand - request head params schema error", (done) => {

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}/params/world/string`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                done();
            });
        });

        it("shorthand - request head querystring schema", (done) => {

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}/query?hello=123`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                done();
            });
        });

        it("shorthand - request head querystring schema error", (done) => {

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}/query?hello=world`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                done();
            });
        });

        it("shorthand - request head missing schema", (done) => {

            sget({
                method: "HEAD",
                url: `http://localhost:${fastify.server.address().port}/missing`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                done();
            });
        });
    });
});
