const {
    p2p: { stream: { pull, abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("async3", (done) => {
        require("../interleavings").test((async) => {
            const err = new Error("intentional");

            let i = 2;

            const abrt = abortable((_err) => {
                assert.equal(_err, err, "abortable ended correctly");
                if (--i === 0) {
                    async.done();
                }
            });
            const o = [];

            pull(
                pull.values([1, 2, 3, 4, 5]),
                async.through("pre"),
                abrt,
                async.through("post"),
                pull.asyncMap((data, cb) => {
                    async(() => {
                        if (data == 3) {
                            abrt.abort(err);
                            async(() => {
                                o.push(data);
                                cb(err, data);
                            })();
                        } else {
                            o.push(data);
                            cb(null, data);
                        }
                    })();
                }),
                pull.drain(null, (_err) => {
                    if (o.length === 3) {
                        assert.deepEqual(o, [1, 2, 3]);
                    } else {
                        assert.deepEqual(o, [1, 2]);
                    }

                    assert.equal(_err, err);

                    if (--i === 0) {
                        async.done();
                        setTimeout(done, 300);
                    }
                })
            );
        });
    });
});
