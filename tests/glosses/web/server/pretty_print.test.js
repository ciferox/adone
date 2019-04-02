const {
    web: { server }
} = adone;

describe("pretty print", () => {
    it("pretty print - static routes", (done) => {
        const fastify = server();
        fastify.get("/test", () => { });
        fastify.get("/test/hello", () => { });
        fastify.get("/hello/world", () => { });
    
        fastify.ready(() => {
            const tree = fastify.printRoutes();
    
            const expected = `└── /
    ├── test (GET)
    │   └── /hello (GET)
    └── hello/world (GET)
`;
    
            assert.equal(typeof tree, "string");
            assert.equal(tree, expected);
            done();
        });
    });
    
    it("pretty print - parametric routes", (done) => {
        const fastify = server();
        fastify.get("/test", () => { });
        fastify.get("/test/:hello", () => { });
        fastify.get("/hello/:world", () => { });
    
        fastify.ready(() => {
            const tree = fastify.printRoutes();
    
            const expected = `└── /
    ├── test (GET)
    │   └── /
    │       └── :hello (GET)
    └── hello/
        └── :world (GET)
`;
    
            assert.equal(typeof tree, "string");
            assert.equal(tree, expected);
            done();
        });
    });
    
    it("pretty print - mixed parametric routes", (done) => {
        const fastify = server();
        fastify.get("/test", () => { });
        fastify.get("/test/:hello", () => { });
        fastify.post("/test/:hello", () => { });
        fastify.get("/test/:hello/world", () => { });
    
        fastify.ready(() => {
            const tree = fastify.printRoutes();
    
            const expected = `└── /
    └── test (GET)
        └── /
            └── :hello (GET)
                :hello (POST)
                └── /world (GET)
`;
    
            assert.equal(typeof tree, "string");
            assert.equal(tree, expected);
            done();
        });
    });
    
    it("pretty print - wildcard routes", (done) => {
        const fastify = server();
        fastify.get("/test", () => { });
        fastify.get("/test/*", () => { });
        fastify.get("/hello/*", () => { });
    
        fastify.ready(() => {
            const tree = fastify.printRoutes();
    
            const expected = `└── /
    ├── test (GET)
    │   └── /
    │       └── * (GET)
    └── hello/
        └── * (GET)
`;
    
            assert.equal(typeof tree, "string");
            assert.equal(tree, expected);
            done();
        });
    });    
});
