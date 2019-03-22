const {
    web: { server }
} = adone;

describe("emit warning", () => {
    it("should emit warning using genReqId prop in logger options", (done) => {
        process.once("warning", (warning) => {
            assert.strictEqual(warning.message, "Using 'genReqId' in logger options is deprecated. Use fastify options instead. See: https://www.fastify.io/docs/latest/Server/#gen-request-id");
            done();
        });
    
        server({ logger: { genReqId: "test" } });
    });
    
    it("should emit warning if basePath prop is used", (done) => {    
        process.once("warning", (warning) => {
            assert.strictEqual(warning.message, "basePath is deprecated. Use prefix instead. See: https://www.fastify.io/docs/latest/Server/#prefix");
            done();
        });
    
        const fastify = server({ basePath: "/test" });
        return fastify.basePath;
    });
    
    it("should emit warning if preHandler is used", (done) => {
        process.once("warning", (warning) => {
            assert.strictEqual(warning.message, "The route option `beforeHandler` has been deprecated, use `preHandler` instead");
            done();
        });
    
        const fastify = server();
    
        fastify.setNotFoundHandler({
            beforeHandler: (req, reply, done) => done()
        }, () => { });
    });    
});
