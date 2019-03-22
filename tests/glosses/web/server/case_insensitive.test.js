const {
    web: { server }
} = adone;

const sget = require("simple-get").concat;

describe("case insensitive", () => {
    it("case insensitive", (done) => {
        const fastify = server({
            caseSensitive: false
        });
    
        fastify.get("/foo", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/FOO`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), {
                    hello: "world"
                });

                fastify.close();
                done();
            });
        });
    });
    
    it("case insensitive inject", (done) => {
        const fastify = server({
            caseSensitive: false
        });
    
        fastify.get("/foo", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            fastify.inject({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/FOO`
            }, (err, response) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(response.payload), {
                    hello: "world"
                });

                fastify.close();
                done();
            });
        });
    });
    
    it("case insensitive (parametric)", (done) => {
        const fastify = server({
            caseSensitive: false
        });
    
        fastify.get("/foo/:param", (req, reply) => {
            assert.strictEqual(req.params.param, "bar");
            reply.send({ hello: "world" });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/FoO/bAr`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), {
                    hello: "world"
                });

                fastify.close();
                done();
            });
        });
    });
    
    it("case insensitive (wildcard)", (done) => {
        const fastify = server({
            caseSensitive: false
        });
    
        fastify.get("/foo/*", (req, reply) => {
            assert.strictEqual(req.params["*"], "bar/baz");
            reply.send({ hello: "world" });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "GET",
                url: `http://localhost:${fastify.server.address().port}/FoO/bAr/baZ`
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                assert.deepEqual(JSON.parse(body), {
                    hello: "world"
                });

                fastify.close();
                done();
            });
        });
    });
    
});