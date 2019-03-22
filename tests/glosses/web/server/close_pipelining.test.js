const {
    web: { server }
} = adone;

const autocannon = require("autocannon");

describe("close pipelining", () => {
    it("Should return 503 while closing - pipelining", (done) => {
        const fastify = server();
    
        fastify.get("/", (req, reply) => {
            fastify.close();
            reply.send({ hello: "world" });
        });
    
        fastify.listen(0, (err) => {
            assert.notExists(err);
    
            const instance = autocannon({
                url: `http://localhost:${fastify.server.address().port}`,
                pipelining: 1,
                connections: 1,
                amount: 10
            });
    
            const codes = [200, 503];
            instance.on("response", (client, statusCode) => {
                assert.strictEqual(statusCode, codes.shift());
            });
    
            instance.on("done", () => done());
            instance.on("reqError", () => assert.isUndefined(codes.shift()));
            instance.on("error", (err) => assert.fail(err));
        });
    });    
});
