describe("stream", "pull", "goodbye", () => {
    const { stream: { pull } } = adone;
    const { goodbye } = pull;

    const mux = require("muxrpc");

    const client = {
        async: ["hello", "goodbye"],
        source: ["stuff", "bstuff"],
        sink: ["things"],
        duplex: ["suchstreamwow"]
    };

    it("duplex", (done) => {

        const A = mux(client, null)();
        const B = mux(null, client)({
            suchstreamwow(someParam) {
                // did the param come through?
                assert.equal(someParam, 5);

                // normally, we'd use pull.values and pull.collect
                // however, pull.values sends 'end' onto the stream, which closes the muxrpc stream immediately
                // ...and we need the stream to stay open for the drain to collect
                const p = pull.pushable();
                for (let i = 0; i < 5; i++) {
                    p.push(i);

                }

                return goodbye({
                    source: pull.values([1, 2, 3, 4, 5]),
                    sink: pull.collect((err, value) => {
                        if (err) {
                            throw err;
                        }
                        assert.deepEqual(value, [1, 2, 3, 4, 5]);
                        done();
                    })
                });
            }
        });

        const s = A.createStream();
        pull(
            s,
            B.createStream(),
            s
        );
        const dup = A.suchstreamwow(5);
        pull(dup, dup);
    });
});
