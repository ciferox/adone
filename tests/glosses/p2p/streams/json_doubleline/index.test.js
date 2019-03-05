const {
    p2p: { stream: { pull, pair, jsonDoubleline } }
} = adone;

const input = [
    1,
    2,
    { okay: true },
    "hello"
];

describe("pull", "", () => {
    it("stringify -> parse", (done) => {
        pull(
            pull.values(input),
            jsonDoubleline.stringify(),
            jsonDoubleline.parse(),
            pull.collect((err, ary) => {
                if (err) { 
                    return done(err); 
                }
                assert.deepEqual(ary, input);
                done();
            })
        );
    });

    it("stringify -> duplex -> parse", (done) => {
        pull(
            pull.values(input),
            jsonDoubleline.stringify(),
            jsonDoubleline(pair()),
            jsonDoubleline.parse(),
            pull.collect((err, ary) => {
                if (err) { 
                    return done(err);
 
}
                assert.deepEqual(ary, input);
                done();
            })
        );
    });

    it("fails to parse invalid data", (done) => {
        pull(
            pull.values([
                Buffer.from("hey")
            ]),
            jsonDoubleline.parse(),
            pull.collect((err, ary) => {
                assert.ok(err instanceof Error);
                done();
            })
        );
    });
});
