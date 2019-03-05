const {
    p2p: { stream: { pull, paramap, abortable: Abortable } }
} = adone;

describe("pull", "paramap", () => {
    const ordered = [];
    const unordered = [];
    const unordered2 = [];

    it("parallel, output unordered", (done) => {
        const result = [];
        pull(pull.count(100),

            paramap((i, cb) => {
                setTimeout(() => {
                    result.push(i);
                    cb(null, i);
                }, (100 - i) * 10);
            }, null, false),

            pull.collect((err, data) => {
                // console.log(err, data);
                // console.log(result);
                assert.deepEqual(data, result, "should emit events in the order they arrive");
                done();
            }));
    });

    it("paralell, but output is ordered", (done) => {
        pull(
            pull.count(100),
            pull.through((i) => {
                ordered.push(i);
            }),
            paramap((i, cb) => {
                setTimeout(() => {
                    unordered.push(i);
                    cb(null, i);
                }, Math.random() * 100);
            }),
            paramap((i, cb) => {
                setTimeout(() => {
                    unordered2.push(i);
                    cb(null, i);
                }, Math.random() * 100);
            }),
            pull.collect((err, ary) => {
                const sort = function (a) {
                    return a.slice()
                        .sort((a, b) => {
                            return a - b;
                        });
                };
                // console.log(unordered);
                assert.deepEqual(ordered, ary);
                assert.deepEqual(ordered, sort(unordered), "ordered == sort(unordered)");
                assert.deepEqual(ordered, sort(unordered2), "ordered == sort(unordered2)");
                assert.notDeepEqual(ordered, unordered);
                assert.notDeepEqual(ordered, unordered2);
                done();
            })
        );

    });


    it("paralell, but output is ordered", (done) => {
        const m = 0;
        const breaky = function (i, cb) {
            if (i !== 33) {
                setTimeout(() => {
                    unordered.push(i);
                    cb(null, i);
                }, Math.random() * 100);
            } else {
                setTimeout(() => {
                    cb(new Error("an error"));
                }, 100);
            }
        };

        pull(
            pull.count(100),
            pull.through((i) => {
                ordered.push(i);
            }),
            paramap(breaky),
            pull.collect((err, ary) => {
                // console.log(err, ary);
                assert.ok(err);
                done();
            })
        );

    });


    it("parallel, but `max` items at once", (done) => {
        let n = 0; const input = [];
        pull(
            pull.count(100),
            pull.through((i) => {
                input.push(i);
            }),
            paramap((data, cb) => {
                n++;
                assert.ok(n <= 10, "max 10 concurrent calls");
                setTimeout(() => {
                    n--;
                    assert.ok(n <= 10, "max 10 concurrent calls");
                    cb(null, data);
                });
            }, 10),
            pull.collect((err, output) => {
                assert.deepEqual(output, input);
                done();
            })
        );
    });

    it("abort a stalled stream", (done) => {

        const abortable = Abortable(); const err = new Error("intentional");
        let i = 2;
        pull(
            pull.values([1, 2, 3], (_err) => {
                assert.equal(_err, err);
                if (--i == 0) {
                    done();
                }
            }),
            paramap((data, cb) => {
                setTimeout(() => {
                    if (data === 1) {
                        cb(null, 1);
                    }
                    //else stall
                });
            }, 10),
            abortable,
            pull.drain(null, (_) => {
                if (--i == 0) {
                    done();
                }
            })
        );

        setTimeout(() => {
            abortable.abort(err);
        }, 100);

    });

    it("abort calls back", (done) => {
        const read = pull(
            pull.values([1, 2, 3]),
            paramap((data, cb) => {
                cb(null, data);
            })
        );

        read(true, (err, data) => {
            assert.equal(err, true);
            done();
        });
    });

    it("abort calls back", (done) => {
        const read = pull(
            pull.values([1, 2, 3]),
            paramap((data, cb) => {
                cb(null, data);
            }),
            pull.drain((e) => {
                if (e == 2) {
                    return false;
                }
            }, (err, data) => {
                assert.equal(err, true);
                done();
            }));
    });

    it("abort passes along errors", (done) => {
        const read = pull(
            function read(abort, cb) {
                cb(new Error("Failure"));
            },
            paramap((data, cb) => {
                cb(null, data);
            }),
            function sink(read) {
                read(null, function next(err, data) {
                    assert.equal(err.message, "Failure");
                    done();
                });
            }
        );
    });

    it("range error", (done) => {
        pull(
            pull.count(10000),
            paramap((d, cb) => {
                cb(null, d * 10000);
            }),
            pull.drain(null, (err) => {
                done();
            })
        );
    });

    it("order", (done) => {
        const interleavings = require("../interleavings");
        
        interleavings.test((async) => {
            let m = -1;
            pull(
                pull.values([0, 1, 2]),
                async.through("input"),
                paramap((i, cb) => {
                    // console.log(i);
                    assert.ok(i > m, `ordered:${i} > ${m}`);
                    m = i;
                    async(cb, "cb")(null, i);
                }, 2),
                pull.drain(null, () => {
                    async.done();
                    setTimeout(done, 300);
                })
            );
        });        
    });
});
