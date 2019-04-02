const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;

it("bodyLimit", (done) => {
    try {
        server({ bodyLimit: 1.3 });
        assert.fail("option must be an integer");
    } catch (err) {
        assert.ok(err);
    }

    try {
        server({ bodyLimit: [] });
        assert.fail("option must be an integer");
    } catch (err) {
        assert.ok(err);
    }

    const fastify = server({ bodyLimit: 1 });

    fastify.post("/", (request, reply) => {
        reply.send({ error: "handler should not be called" });
    });

    fastify.listen(0, (err) => {
        assert.notExists(err);
        fastify.server.unref();

        sget({
            method: "POST",
            url: `http://localhost:${fastify.server.address().port}`,
            headers: { "Content-Type": "application/json" },
            body: [],
            json: true
        }, (err, response, body) => {
            assert.notExists(err);
            assert.strictEqual(response.statusCode, 413);
            done();
        });
    });
});
