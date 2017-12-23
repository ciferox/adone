
const JSONDL = require("pull-json-doubleline");

describe("stream", "pull", "ws", "server echo", () => {
    const { stream: { pull } } = adone;
    const { ws } = pull;

    it("simple echo server", (done) => {

        const server = ws.createServer((stream) => {
            pull(stream, stream);
        }).listen(5678, () => {

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
