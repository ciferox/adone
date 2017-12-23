describe("stream", "pull", "ws", "error", () => {
    const WebSocket = require("ws");
    const { stream: { pull } } = adone;
    const { ws } = pull;

    const server = require("./server")();

    //connect to a server that does not exist, and check that it errors.
    //should pass the error to both sides of the stream.
    it("test error", (done) => {
        let _err;
        let i = 0;
        const end = (err) => {
            if (_err) {
                assert.equal(err, _err);
            } else {
                _err = err;
            }
            if (++i === 2) {
                done();
            }
        };
        pull(
            pull.values(["x", "y", "z"]),
            pull.through(null, end),
            ws.duplex(new WebSocket(`ws://localhost:34897/${Math.random()}`)),
            pull.collect(end)
        );

    });

    //connect to a server that does not exist, and check that it errors.
    //should pass the error to both sides of the stream.
    it("test error", (done) => {
        ws.duplex(new WebSocket(`ws://localhost:34897/${Math.random()}`),
            { onConnect(err) {
                assert.ok(err);
                done();
            } });

    });

    after((done) => {
        server.close(done);
    });
});
