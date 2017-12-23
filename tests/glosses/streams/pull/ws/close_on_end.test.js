describe("stream", "pull", "ws", "close on end", () => {
    const WebSocket = require("ws");
    const endpoint = `${require("./wsurl")}/echo`;

    const { stream: { pull } } = adone;
    const { ws } = pull;

    const server = require("./server")();

    it("websocket closed when pull source input ends", (done) => {
        const socket = new WebSocket(endpoint);

        pull(
            ws.source(socket),
            pull.collect((err) => {
                done(err);
            })
        );

        pull(
            pull.values(["x", "y", "z"]),
            ws.sink(socket, { closeOnEnd: true })
        );
    });

    it("sink has callback for end of stream", (done) => {
        const socket = new WebSocket(endpoint);

        let i = 0;

        const end = (err) => {
            if (err) {
                return done(err);
            }
            if (++i === 2) {
                done();
            }
        };

        pull(
            ws.source(socket),
            pull.collect(end)
        );

        pull(
            pull.values(["x", "y", "z"]),
            ws.sink(socket, end)
        );
    });


    it("closeOnEnd=false, stream doesn't close", (done) => {
        const socket = new WebSocket(endpoint);

        let i = 0;

        const onItem = (item) => {
            assert.ok(item);
            if (++i === 3) {
                done();
            }
        };

        pull(
            ws.source(socket),
            pull.drain(onItem)
        );

        pull(
            pull.values(["x", "y", "z"]),
            ws.sink(socket, { closeOnEnd: false })
        );
    });

    after((done) => {
        server.close(done);
    });
});
