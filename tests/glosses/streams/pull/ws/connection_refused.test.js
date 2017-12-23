describe("stream", "pull", "ws", "connection refused", () => {
    const { stream: { pull } } = adone;
    const { ws } = pull;

    it("error when connecting to nowhere", (done) => {

        ws.connect("ws://localhost:34059", (err, stream) => {
            assert.ok(err);
            assert.notOk(stream);
            done();
        });

    });

});
