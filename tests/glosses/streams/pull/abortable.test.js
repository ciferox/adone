const {
    stream: { pull }
} = adone;
const { abortable } = pull;

const interleavings = require("./interleavings");

describe("stream", "pull", "abortable", () => {
    it("common", (done) => {
        interleavings.test((async) => {
            let isDone = false;
            const abrt = abortable(() => {
                isDone = true;
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
                            abrt.abort();
                        }
                        o.push(data);
                        cb(null, data);
                    })();
                }),
                pull.drain(null, (err) => {
                    if (o.length == 3) {
                        assert.deepEqual(o, [1, 2, 3]);
                    } else {
                        assert.deepEqual(o, [1, 2]);
                    }

                    assert.ok(isDone);
                    async.done();
                    setTimeout(done, 300);
                })
            );
        });
    });


    it("async", (done) => {
        interleavings.test((async) => {
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

    it("async2", (done) => {
        interleavings.test((async) => {
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


    it("async3", (done) => {
        interleavings.test((async) => {
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

    it("normal end", (done) => {
        interleavings.test((async) => {
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

    describe("pre abort", () => {
        it("normal end", () => {
            const _err = new Error("test error"); let ended;
            const a = abortable((err) => {
                assert.equal(err, _err);
                ended = true;
            });

            a.abort(_err);

            if (!ended) {
                throw new Error("expected onEnd to be called");
            }
        });
    });
});
