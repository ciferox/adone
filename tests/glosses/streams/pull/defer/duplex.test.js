describe("stream", "pull", "defer", "duplex", () => {
    const { stream: { pull } } = adone;
    const { defer: { duplex } } = pull;

    it("simple", (done) => {
        const d = duplex();

        pull(
            pull.values([1, 2, 3]),
            d,
            pull.collect((err, values) => {
                assert.deepEqual(values, [1, 2, 3]);
                done();
            })
        );

        //by default, pair gives us a pass through stream as duplex.
        d.resolve(pull.pair());

    });
});
