const {
    noop,
    web: { server }
} = adone;

const fastify = server();

const opts = {
    schema: {
        response: {
            "2xx": {
                type: "object",
                properties: {
                    hello: {
                        type: "string"
                    }
                }
            }
        }
    }
};

describe("chainable", () => {
    it("chainable - get", () => {
        assert.equal(typeof fastify.get("/", opts, noop), typeof fastify);
    });
    
    it("chainable - post", () => {
        assert.equal(typeof fastify.post("/", opts, noop), typeof fastify);
    });
    
    it("chainable - route", () => {
        assert.equal(typeof fastify.route({
            method: "GET",
            url: "/other",
            schema: opts.schema,
            handler: noop
        }), typeof fastify);
    });    
});
