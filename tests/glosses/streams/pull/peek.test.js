describe("stream", "pull", "peek", () => {
    const { stream: { pull } } = adone;
    const { peek } = pull;

    it("peek ahead", (done) => {
        pull(
            pull.values([1, 2, 3, 4, 5]),
            peek((end, data) => {
                assert.equal(data, 1);
                done();
            })
        );
    });

    it("peek ahead and passthrough", (done) => {
        let first;
        pull(
            pull.values([1, 2, 3, 4, 5]),
            peek((end, data) => {
                assert.equal(data, 1);
                first = data;
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;

                }
                assert.equal(first, 1);
                assert.deepEqual(ary, [1, 2, 3, 4, 5]);
                done();
            })
        );
    });
});
