const {
    p2p: { stream: { pull, abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("normal end", (done) => {
        require("../interleavings").test((async) => {
            let isDone = 0;
            const abrt = abortable(() => {
                isDone++;
            });
            const o = [];

            pull(
                pull.values([1, 2, 3, 4, 5]),
                async.through("pre"),
                abrt,
                async.through("post"),
                pull.collect((err, o) => {
                    assert.deepEqual(o, [1, 2, 3, 4, 5]);
                    assert.equal(isDone, 1);
                    async.done();
                    setTimeout(done, 300);
                })
            );
        });
    });
});
