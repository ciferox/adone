describe("stream", "pull", "defer", "sink", () => {
    const { stream: { pull } } = adone;
    const { defer } = pull;

    it("simple", (done) => {
        const feed = [];
        let l;

        pull(
            pull.values(feed),
            l = defer.sink(pull.collect((err, ary) => {
                if (err) {
                    throw err
                    ;
                }
                assert.deepEqual(ary, [1, 2, 3]);
                done();
            }))
        );

        setTimeout(() => {
            feed.push(1, 2, 3);
            l.start();
        });
    });

    it("simple - set late", (done) => {

        const feed = [];
        let l;

        pull(pull.values(feed), l = defer.sink());

        setTimeout(() => {
            feed.push(1, 2, 3);

            l.start(pull.collect((err, ary) => {
                if (err) {
                    throw err
                    ;
                }
                assert.deepEqual(ary, [1, 2, 3]);
                done();
            }));
        });
    });
});
