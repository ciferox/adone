const {
    web: { server }
} = adone;

describe("input validation", () => {
    it("case insensitive header validation", (done) => {
        const fastify = server();
        fastify.route({
            method: "GET",
            url: "/",
            handler: (req, reply) => {
                reply.code(200).send(req.headers.foobar);
            },
            schema: {
                headers: {
                    type: "object",
                    required: ["FooBar"],
                    properties: {
                        FooBar: { type: "string" }
                    }
                }
            }
        });
        fastify.inject({
            method: "GET",
            url: "/",
            headers: {
                FooBar: "Baz"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.payload, "Baz");
            done();
        });
    });
    
    it("not evaluate json-schema $schema keyword", (done) => {
        const fastify = server();
        fastify.route({
            method: "POST",
            url: "/",
            handler: (req, reply) => {
                reply.code(200).send(req.body.hello);
            },
            schema: {
                body: {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    type: "object",
                    properties: {
                        hello: {
                            type: "string"
                        }
                    }
                }
            }
        });
        fastify.inject({
            method: "POST",
            url: "/",
            body: {
                hello: "world"
            }
        }, (err, res) => {
            assert.notExists(err);
            assert.equal(res.payload, "world");
            done();
        });
    });    
});
