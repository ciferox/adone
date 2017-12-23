describe("stream", "pull", "ws", "echo", () => {
    const { stream: { pull } } = adone;
    const { ws } = pull;
    const WebSocket = require("ws");
    const url = `${require("./wsurl")}/echo`;
    const server = require("./server")();

    it("setup echo reading and writing", (done) => {
        const socket = new WebSocket(url);
        const expected = ["x", "y", "z"];

        let i = 0;
        const cnt = expected.length;

        pull(
            ws.source(socket),
            pull.drain((value) => {
                assert.equal(value, expected.shift());
                if (++i === cnt) {
                    done();
                }
            })
        );

        pull(
            pull.values([].concat(expected)),
            ws.sink(socket, { closeOnEnd: false })
        );
    });


    it("duplex style", (done) => {
        const expected = ["x", "y", "z"];
        const socket = new WebSocket(url);

        let i = 0;
        const cnt = expected.length;

        pull(
            pull.values([].concat(expected)),
            ws.duplex(socket, { closeOnEnd: false }),
            pull.drain((value) => {
                assert.equal(value, expected.shift());
                if (++i === cnt) {
                    done();
                }
            })
        );

    });


    it("duplex with goodbye handshake", (done) => {

        const expected = ["x", "y", "z"];
        const socket = new WebSocket(url);

        const pws = ws.duplex(socket);

        pull(
            pws,
            pull.goodbye({
                source: pull.values([].concat(expected)),
                sink: pull.drain((value) => {
                    assert.equal(value, expected.shift());
                }, () => {
                    assert.equal(expected.length, 0);
                    done();
                })
            }),
            pws
        );


    });

    after((done) => {
        server.close(done);
    });
});
