describe("stream", "pull", "ws", "read", () => {
    const WebSocket = require("ws");
    const endpoint = `${require("./wsurl")}/read`;

    const { stream: { pull } } = adone;
    const { ws } = pull;
    let socket;

    const server = require("./server")();

    before((done) => {
        socket = new WebSocket(endpoint);
        socket.onopen = () => {
            done();
        };
    });

    after((done) => {
        server.close(done);
    });

    it("read values from the socket and end normally", (done) => {
        pull(
            ws.source(socket),
            pull.collect((err, values) => {
                if (err) {
                    return done(err);
                }
                assert.deepEqual(values, ["a", "b", "c", "d"]);
                done();
            })
        );
    });

    it("read values from a new socket and end normally", (done) => {
        pull(
            ws.source(new WebSocket(endpoint)),
            pull.collect((err, values) => {
                if (err) {
                    return done(err);
                }
                assert.deepEqual(values, ["a", "b", "c", "d"]);
                done();
            })
        );
    });
});
