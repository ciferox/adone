const sget = require("simple-get").concat;
const fastify = adone.http.server();

const opts = {
    schema: {
        response: {
            200: {
                type: "object",
                properties: {
                    hello: {
                        type: "string"
                    }
                }
            },
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

describe("", () => {
    it("shorthand - output string", (done) => {
        try {
            fastify.get("/string", opts, (req, reply) => {
                reply.code(200).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("shorthand - output number", (done) => {
        try {
            fastify.get("/number", opts, (req, reply) => {
                reply.code(201).send({ hello: 55 });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("wrong object for schema - output", (done) => {
        try {
            fastify.get("/wrong-object-for-schema", opts, (req, reply) => {
                // will send { }
                reply.code(201).send({ hello: "world" });
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("empty response", (done) => {
        try {
            // no checks
            fastify.get("/empty", opts, (req, reply) => {
                reply.code(204).send();
            });
            done();
        } catch (e) {
            assert.fail();
        }
    });

    it("unlisted response code", (done) => {
        try {
            fastify.get("/400", opts, (req, reply) => {
                reply.code(400).send({ hello: "DOOM" });
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
    
        it("shorthand - string get ok", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/string`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "world" });
                done();
            });
        });

        it("shorthand - number get ok", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/number`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 201);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: 55 });
                done();
            });
        });

        it("shorthand - wrong-object-for-schema", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/wrong-object-for-schema`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 201);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), {});
                done();
            });
        });

        it("shorthand - empty", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/empty`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 204);
                done();
            });
        });

        it("shorthand - 400", (done) => {
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/400`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                assert.strictEqual(response.headers["content-length"], `${body.length}`);
                assert.deepEqual(JSON.parse(body), { hello: "DOOM" });
                done();
            });
        });
    });
});
