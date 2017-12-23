describe("stream", "pull", "ws", "pass-in-server", () => {
    const { stream: { pull } } = adone;
    const { ws } = pull;

    const JSONDL = require("pull-json-doubleline");

    it("simple echo server", (done) => {
        const httpServer = require("http").createServer();

        const server = ws.createServer({ server: httpServer }, (stream) => {
            pull(stream, stream);
        });

        server.listen(5678, () => {
            ws.connect("ws://localhost:5678", (err, stream) => {
                pull(
                    pull.values([1, 2, 3]),
                    //need a delay, because otherwise ws hangs up wrong.
                    //otherwise use pull-goodbye.
                    (read) => {
                        return function (err, cb) {
                            setTimeout(() => {
                                read(null, cb);
                            }, 10);
                        };
                    },
                    JSONDL.stringify(),
                    stream,
                    JSONDL.parse(),
                    pull.collect((err, ary) => {
                        if (err) {
                            throw err;
                        }
                        assert.deepEqual(ary, [1, 2, 3]);
                        server.close(() => {
                            done();
                        });
                    })
                );
            });
        });
    });
});
