const {
    stream: { pull }
} = adone;
const { pair, jsonDoubleline } = pull;

const input = [
    1,
    2,
    { okay: true },
    "hello"
];

describe("stream", "pull", "", () => {
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
