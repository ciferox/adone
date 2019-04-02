const {
    http: { server }
} = adone;


it("Should accept a custom genReqId function", (done) => {
    const fastify = server({
        genReqId() {
            return "a";
        }
    });

    fastify.get("/", (req, reply) => {
        assert.ok(req.raw.id);
        reply.send({ id: req.raw.id });
    });

    fastify.listen(0, (err) => {
        assert.notExists(err);
        fastify.inject({
            method: "GET",
            url: `http://localhost:${fastify.server.address().port}`
        }, (err, res) => {
            assert.notExists(err);
            const payload = JSON.parse(res.payload);
            assert.equal(payload.id, "a");
            fastify.close();
            done();
        });
    });
});
