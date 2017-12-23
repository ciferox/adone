describe("stream", "pull", "ws", "server address", () => {
    const { stream: { pull } } = adone;
    const { ws } = pull;

    it("server .address should return bound address", (done) => {
        const server = ws.createServer().listen(55214, () => {
            assert.equal(typeof server.address, "function");
            assert.equal(server.address().port, 55214, "return address should match");
            server.close(() => {
                done();
            });
        });
    });
});
