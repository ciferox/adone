const {
    stream: { pull2: pull }
} = adone;
const { goodbye, pushable } = pull;

const mux = require("muxrpc");

const client = {
    async: ["hello", "goodbye"],
    source: ["stuff", "bstuff"],
    sink: ["things"],
    duplex: ["suchstreamwow"]
};

describe("stream", "pull", "goosdbye", () => {
    it("duplex", (done) => {
        const A = mux(client, null)();
        const B = mux(null, client)({
            suchstreamwow(someParam) {
                // did the param come through?
                assert.equal(someParam, 5);

                // normally, we'd use pull.values and pull.collect
                // however, pull.values sends 'end' onto the stream, which closes the muxrpc stream immediately
                // ...and we need the stream to stay open for the drain to collect
                const nextValue = 0;
                const p = pushable();
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
            pull.through(console.log.bind(console, "IN")),
            B.createStream(),
            pull.through(console.log.bind(console, "OUT")),
            s
        );
        const dup = A.suchstreamwow(5);
        pull(dup, dup);
    });

    describe("enable", () => {
        const { endable } = goodbye;

        it("simple", (done) => {

            expect(2).checks(done);

            const e1 = endable(-1);
            const e2 = endable(-1);

            const onEnd = function () {
                // console.log("on end");
            };

            pull(
                pull.values([1, 2, 3]),
                e1,
                pull.filter((n) => {
                    if (n !== -1) {
                        return true;
                    }
                    e2.end();
                }),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [1, 2, 3]);
                    expect(true).to.be.true.mark();
                })
            );


            pull(
                pull.values([1, 2, 3]),
                e2,
                pull.filter((n) => {
                    if (n !== -1) {
                        return true;
                    }
                    e1.end();
                }),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [1, 2, 3]);
                    expect(true).to.be.true.mark();
                })
            );
        });
    });
});
