require("./helper").payloadMethod("post");
require("./input_validation").payloadMethod("post");

it("cannot set schemaCompiler after binding", (done) => {
    const fastify = adone.http.server();

    fastify.listen(0, (err) => {
        assert.notExists(err);

        try {
            fastify.setSchemaCompiler(() => { });
            assert.fail();
        } catch (e) {
            fastify.close();
            done();
        }
    });
});
