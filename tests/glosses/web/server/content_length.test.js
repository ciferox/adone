const {
    web: { server }
} = adone;

describe("content length", () => {
    it("default 413 with bodyLimit option", (done) => {
        const fastify = server({
            bodyLimit: 10
        });
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            body: {
                text: "12345678901234567890123456789012345678901234567890"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 413);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Payload Too Large",
                code: "FST_ERR_CTP_BODY_TOO_LARGE",
                message: "FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large",
                statusCode: 413
            });
            done();
        });
    });
    
    it("default 413 with wrong content-length", (done) => {
        const fastify = server();
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            headers: {
                "content-length": 20
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
                code: "FST_ERR_CTP_INVALID_CONTENT_LENGTH",
                message: "FST_ERR_CTP_INVALID_CONTENT_LENGTH: Request body size did not match Content-Length",
                statusCode: 400
            });
            done();
        });
    });
    
    it("custom 413 with bodyLimit option", (done) => {
        const fastify = server({
            bodyLimit: 10
        });
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.setErrorHandler((err, request, reply) => {
            reply
                .code(err.statusCode)
                .type("application/json; charset=utf-8")
                .send(err);
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            body: {
                text: "12345678901234567890123456789012345678901234567890"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.strictEqual(res.statusCode, 413);
            assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
            assert.deepEqual(JSON.parse(res.payload), {
                error: "Payload Too Large",
                code: "FST_ERR_CTP_BODY_TOO_LARGE",
                message: "FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large",
                statusCode: 413
            });
            done();
        });
    });
    
    it("custom 413 with wrong content-length", (done) => {    
        const fastify = server();
    
        fastify.post("/", (req, reply) => {
            reply.send({ hello: "world" });
        });
    
        fastify.setErrorHandler((err, request, reply) => {
            reply
                .code(err.statusCode)
                .type("application/json; charset=utf-8")
                .send(err);
        });
    
        fastify.inject({
            method: "POST",
            url: "/",
            headers: {
                "content-length": 20
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
                code: "FST_ERR_CTP_INVALID_CONTENT_LENGTH",
                message: "FST_ERR_CTP_INVALID_CONTENT_LENGTH: Request body size did not match Content-Length",
                statusCode: 400
            });
            done();
        });
    });    
});
