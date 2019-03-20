const {
    stream: { pull }
} = adone;
const { zip } = pull;

describe("stream", "pull", "zip", () => {
    it("zip same length arrays", (done) => {
        pull(
            zip(
                pull.values([1, 2, 3]),
                pull.values("ABC".split(""))
            ),
            pull.collect((err, zipped) => {
                assert.deepEqual([[1, "A"], [2, "B"], [3, "C"]], zipped);
                done();
            })
        );

    });

    it("zip different length arrays", (done) => {

        pull(
            zip(
                pull.values([1, 2, 3]),
                pull.values("ABCx".split(""))
            ),
            pull.collect((err, zipped) => {
                assert.deepEqual([[1, "A"], [2, "B"], [3, "C"], [null, "x"]], zipped);
                done();
            })
        );
    });
});
