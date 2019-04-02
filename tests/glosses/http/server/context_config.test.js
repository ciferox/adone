const {
    http: { server }
} = adone;

const schema = {
    schema: {},
    config: {
        value1: "foo",
        value2: true
    }
};

function handler(req, reply) {
    reply.send(reply.context.config);
}

it("config", (done) => {
    const fastify = server();

    expect(3).checks(done);

    fastify.get("/get", {
        schema: schema.schema,
        config: Object.assign({}, schema.config)
    }, handler);

    fastify.route({
        method: "GET",
        url: "/route",
        schema: schema.schema,
        handler,
        config: Object.assign({}, schema.config)
    });

    fastify.route({
        method: "GET",
        url: "/no-config",
        schema: schema.schema,
        handler
    });

    fastify.inject({
        method: "GET",
        url: "/get"
    }, (err, response) => {
        assert.notExists(err);
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(JSON.parse(response.payload), Object.assign({ url: "/get" }, schema.config));
        expect(true).to.be.ok.mark();
    });

    fastify.inject({
        method: "GET",
        url: "/route"
    }, (err, response) => {
        assert.notExists(err);
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(JSON.parse(response.payload), Object.assign({ url: "/route" }, schema.config));
        expect(true).to.be.ok.mark();
    });

    fastify.inject({
        method: "GET",
        url: "/no-config"
    }, (err, response) => {
        assert.notExists(err);
        assert.strictEqual(response.statusCode, 200);
        assert.deepEqual(JSON.parse(response.payload), { url: "/no-config" });
        expect(true).to.be.ok.mark();
    });
});
