const {
    p2p: { stream: { pull, abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("async2", (done) => {
        require("../interleavings").test((async) => {
            const abrt = abortable();
            const o = [];

            pull(
                pull.values([1, 2, 3, 4, 5]),
                async.through("pre"),
                abrt,
                async.through("post"),
                (read) => {
                    return function (abort, cb) {

                        if (o.length < 3) {
                            read(abort, (end, data) => {
                                o.push(data);
                                cb(end, data);
                            });
                        } else {
                            abrt.abort();
                            async(() => {
                                read(abort, cb);
                            })();
                        }
                    };
                },
                //    pull.asyncMap(function (data, cb) {
                //      async(function () {
                //        if(data == 3) {
                //          cb(null, data)
                //          async(function () {
                //            abortable.abort()
                //          })()
                //        }
                //        else {
                //          o.push(data)
                //          cb(null, data)
                //        }
                //      })()
                //    }),
                pull.drain(null, (err) => {
                    assert.deepEqual(o, [1, 2, 3]);
                    async.done();
                    setTimeout(done, 300);
                })
            );
        });
    });
});
