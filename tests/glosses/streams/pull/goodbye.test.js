const {
    stream: { pull }
} = adone;
const { goodbye, asyncIteratorToPullStream } = pull;

const mux = require("muxrpc");

const client = {
    hello: "async",
    goodbye: "async",
    stuff: "source",
    bstuff: "source",
    things: "sink",
    suchstreamwow: "duplex"
};

describe("stream", "pull", "goodbye", () => {
    it("duplex", (done) => {
        const A = mux(client, null)();
        const B = mux(null, client)({
            suchstreamwow(someParam) {
                // did the param come through?
                assert.equal(someParam, 5);

                return asyncIteratorToPullStream.duplex(goodbye({
                    source: [1, 2, 3, 4, 5],
                    sink: async (source) => {
                        const values = [];
                        for await (const value of source) {
                            values.push(value);
                        }
                        assert.deepEqual(values, [1, 2, 3, 4, 5]);
                        done();
                    }
                }, 6));
            }
        });

        const s = A.createStream();
        pull(
            s,
            pull.through(console.log.bind(console, "IN")),
            B.createStream(),
            pull.through(console.log.bind(console, "OUT")),
            s
        );
        const dup = A.suchstreamwow(5);
        pull(dup, dup);
    });

    const { pipeline, filter, collect } = require("streaming-iterables");
    const { endable } = goodbye;

    it("simple", async () => {
        const e1 = endable(-1);
        const e2 = endable(-1);

        const [ary0, ary1] = await Promise.all([
            pipeline(
                () => [1, 2, 3],
                e1,
                filter((n) => {
                    if (n !== -1) {
                        return true;
                    }
                    e2.end();
                }),
                collect
            ),
            pipeline(
                () => [1, 2, 3],
                e2,
                filter((n) => {
                    if (n !== -1) {
                        return true;
                    }
                    e1.end();
                }),
                collect
            )
        ]);

        assert.deepEqual(ary0, [1, 2, 3]);
        assert.deepEqual(ary1, [1, 2, 3]);
    });

});
