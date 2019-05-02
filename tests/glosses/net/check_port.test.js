const {
    net: { checkPort },
    std: { http }
} = adone;

describe("net", "checkPort", () => {
    let server = null;
    const port = 8888;

    beforeEach((done) => {
        server = http.createServer();
        server.listen(port, done);
    });

    afterEach((done) => {
        server.close(done);
    });

    it("should return port value if it is available", async () => {
        const freePort = await checkPort(8081);
        assert.equal(freePort, 8081);
        
    });

    it("by default should return false if port is busy", async () => {
        assert.isFalse(await checkPort(port));
    });

    it("should throw when arg 'shouldThrow'=true", async () => {
        await assert.throws(async () => checkPort(port, true));
    });
});
