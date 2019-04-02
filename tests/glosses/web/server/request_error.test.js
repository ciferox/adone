const {
    web: { server }
} = adone;

const { kRequest } = server.symbol;

describe("request error", () => {
    it("default 400 on request error", (done) => {    
        const fastify = server();
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            simulate: {
                error: true
            },
            body: {
                text: "12345678901234567890123456789012345678901234567890"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "Simulated",
                statusCode: 400
            });
            done();
        });
    });
    
    it("default 400 on request error with custom error handler", (done) => {
        const fastify = server();

        expect(2).checks(done);
    
        fastify.setErrorHandler((err, request, reply) => {
            assert.equal(typeof request, "object");
            assert.instanceOf(request, fastify[kRequest]);
            expect(true).to.be.ok.mark();
            reply
                .code(err.statusCode)
                .type("application/json; charset=utf-8")
                .send(err);
        });
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            simulate: {
                error: true
            },
            body: {
                text: "12345678901234567890123456789012345678901234567890"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Bad Request",
                message: "Simulated",
                statusCode: 400
            });
            expect(true).to.be.ok.mark();
        });
    });    
});
