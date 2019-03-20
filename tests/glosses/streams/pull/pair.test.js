const {
    stream: { pull }
} = adone;
const { pair } = pull;

describe("stream", "pull", "pair", () => {
    it("simple", (done) => {
        const p = pair();
        const input = [1, 2, 3];
        pull(pull.values(input), p.sink);
        pull(p.source, pull.collect((err, values) => {
            if (err) {
                throw err;
            }
            // console.log(values); //[1, 2, 3]
            assert.deepEqual(values, input);
            done();
        }));

    });

    it("simple - error", (done) => {
        const p = pair();
        const err = new Error("test errors");
        const input = [1, 2, 3];
        pull((abort, cb) => {
            cb(err);
        }, p.sink);
        pull(p.source, pull.collect((_err, values) => {
            // console.log(_err);
            assert.equal(_err, err);
            done();
        }));

    });
    it("echo duplex", (done) => {
        const d = pair.duplex();
        pull(
            pull.values([1, 2, 3]),
            d[0],
            pull.collect((err, ary) => {
                assert.deepEqual(ary, [1, 2, 3]);
                done();
            })
        );

        //pipe the second duplex stream back to itself.
        pull(d[1], pull.through(console.log), d[1]);
    });
});
