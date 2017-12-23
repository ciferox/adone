describe("stream", "pull", "enable", () => {
    const { stream: { pull } } = adone;
    const { endable } = pull;

    it("simple", (done) => {
        const e1 = endable(-1);
        const e2 = endable(-1);
        let i = 0;
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
                if (++i === 2) {
                    done();
                }
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
                if (++i === 2) {
                    done();
                }
            })
        );
    });

});
