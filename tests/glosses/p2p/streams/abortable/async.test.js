const {
    p2p: { stream: { pull, abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("async", (done) => {
        require("../interleavings").test((async) => {
            const abrt = abortable();
            const o = [];

            pull(
                pull.values([1, 2, 3, 4, 5]),
                async.through("pre"),
                abrt,
                async.through("post"),
                pull.asyncMap((data, cb) => {
                    async(() => {
                        if (data == 3) {
                            abrt.abort();
                            async(() => {
                                o.push(data);
                                cb(null, data);
                            })();
                        } else {
                            o.push(data);
                            cb(null, data);
                        }
                    })();
                }),
                pull.drain(null, (err) => {
                    if (o.length === 3) {
                        assert.deepEqual(o, [1, 2, 3]);
                    } else {
                        assert.deepEqual(o, [1, 2]);
                    }

                    async.done();
                    setTimeout(done, 300);
                })
            );
        });
    });
});
