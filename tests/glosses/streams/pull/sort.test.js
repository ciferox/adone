const {
    stream: { pull }
} = adone;
const { sort } = pull;

describe("stream", "pull", "sort", () => {
    it("sort an array", (done) => {
        pull(
            pull.values([3, 2, 1]),
            sort(),
            pull.collect((err, values) => {
                assert.notOk(err);
                assert.deepEqual(values, [1, 2, 3]);
                done();
            })
        );
    });

    it("do not swallow errors", (done) => {
        const error = new Error("Something went wrong");

        pull(
            pull.error(error),
            sort(),
            pull.collect((err, values) => {
                assert.deepEqual(err, error);
                done();
            })
        );
    });
});
