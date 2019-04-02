const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;

describe("proto poisoning", () => {
    it("proto-poisoning error", (done) => {
        const fastify = server();
    
        fastify.post("/", (request, reply) => {
            assert.fail("handler should not be called");
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: { "Content-Type": "application/json" },
                body: '{ "__proto__": { "a": 42 } }'
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 400);
                fastify.close();
                done();
            });
        });
    });
    
    it("proto-poisoning remove", (done) => {
        const fastify = server({ onProtoPoisoning: "remove" });
    
        fastify.post("/", (request, reply) => {
            assert.equal(undefined, Object.assign({}, request.body).a);
            reply.send({ ok: true });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: { "Content-Type": "application/json" },
                body: '{ "__proto__": { "a": 42 }, "b": 42 }'
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                fastify.close();
                done();
            });
        });
    });
    
    it("proto-poisoning ignore", (done) => {
        const fastify = server({ onProtoPoisoning: "ignore" });
    
        fastify.post("/", (request, reply) => {
            assert.equal(42, Object.assign({}, request.body).a);
            reply.send({ ok: true });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            sget({
                method: "POST",
                url: `http://localhost:${fastify.server.address().port}`,
                headers: { "Content-Type": "application/json" },
                body: '{ "__proto__": { "a": 42 }, "b": 42 }'
            }, (err, response, body) => {
                assert.notExists(err);
                assert.strictEqual(response.statusCode, 200);
                fastify.close();
                done();
            });
        });
    });    
});
