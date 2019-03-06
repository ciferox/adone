const {
    is,
    stream: { pull2: pull }
} = adone;
const { many } = pull;

describe("stream", "pull", "many", () => {
    describe("common", () => {

        const rand = function (name, n) {
            const a = []; let i = 0;
            while (n--) {
                a.push({ key: name, value: i++ });
            }
            return a;
        };

        const flatten = function (ary) {
            return ary.reduce((a, b) => {
                return a.concat(b);
            }, []);
        };

        const compare = (a, b) => (a.value - b.value) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

        const partial = function (ary) {
            const latest = {};
            ary.forEach((v) => {
                if (!is.nil(latest[v.key])) {
                    assert.ok(latest[v.key] < v.value);
                }
                latest[v.key] = v.value;
            });
        };

        const delay = function (read) {
            return function (abort, cb) {
                read(abort, (end, data) => {
                    setTimeout(() => {
                        cb(end, data);
                    }, Math.random() * 20);
                });
            };
        };

        const noDelay = (read) => read;

        const tests = function (name, all, async) {
            const maybeDelay = async ? delay : noDelay;

            it(`${name} simple`, (done) => {
                pull(
                    many(all.map(pull.values).map(maybeDelay)),
                    pull.collect((err, ary) => {
                        //verify everything is there.
                        assert.deepEqual(ary.sort(compare), flatten(all).sort(compare));

                        //check that the result is in the correct partial order.
                        partial(ary);
                        done();
                    })
                );
            });

            it(`${name} abort`, (done) => {

                const aborted = [];
                pull(
                    many(all.map((ary, i) => {
                        return pull(
                            pull.values(ary),
                            (read) => {
                                return function (abort, cb) {
                                    aborted[i] = true;
                                    read(abort, (end, data) => {
                                        if (end) {
                                            aborted[i] = true;
                                        }
                                        cb(end, data);
                                    });
                                };
                            });
                    }).map(maybeDelay)),
                    pull.take(10),
                    pull.collect((err, ary) => {
                        assert.deepEqual(aborted, all.map(() => {
                            return true;
                        }));
                        partial(ary);
                        done();
                    })
                );
            });
        };

        tests("3 items", [rand("a", 7), rand("b", 5), rand("c", 5)]);
        tests("1 items", [rand("a", 7)]);
        tests("empty", []);
        tests("3 items", [rand("a", 7), rand("b", 5), rand("c", 5)], true);
        tests("1 items", [rand("a", 7)], true);
        tests("empty", [], true);

        const error = function (err) {
            return function (abort, cb) {
                cb(err);
            };
        }

        it("a stream errors", (done) => {
            const err = new Error("test-error");
            const aborted = [];
            const check = function (read, i) {
                return function (abort, cb) {
                    aborted[i] = true;
                    read(abort, (end, data) => {
                        if (end) {
                            aborted[i] = true;
                        }
                        cb(end, data);
                    });
                };
            }

            pull(
                many([
                    check(pull.values(rand("a", 5)), 0),
                    check(pull.values(rand("b", 4)), 1),
                    error(err)
                ]),
                pull.collect((err, ary) => {
                    assert.deepEqual(aborted, [true, true]);
                    done();
                })
            );
        });

        it("abort an uncapped stream on an error", (done) => {

            const err = new Error("intentional");

            const source = many();

            source.add(error(err));

            pull(
                source,
                pull.drain(null, (_err) => {
                    assert.equal(_err, err);
                    done();
                })
            );
        });
    });

    describe("add", () => {
        it("add after stream creation", (done) => {
            const m = many();

            pull(
                m,
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary.sort(), [1, 2, 3, 4, 5, 6]);
                    done();
                })
            );

            m.add(pull.values([1, 2, 3]));
            m.add(pull.values([4, 5, 6]));
            m.add();

        });

        it("add after stream creation", (done) => {

            const m = many();

            pull(
                m,
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary.sort(), []);
                    done();
                })
            );

            m.add();

        });

        it("do not close inputs until the last minute", (done) => {

            const m = many();
            const seen = [];

            pull(
                m,
                pull.through((data) => {
                    //wait until the last message to end inputs.
                    // console.log("seen", data);
                    seen.push(data);
                    if (data >= 6) {
                        m.cap();
                    }
                }),
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary.sort(), [1, 2, 3, 4, 5, 6]);
                    assert.deepEqual(seen.sort(), [1, 2, 3, 4, 5, 6]);
                    done();
                })
            );

            m.add(pull.values([1, 2, 3]));
            m.add(pull.values([4, 5, 6]));

        });
    });

    it("interleavings", (done) => {
        const async = require("./interleavings");

        async.test((async) => {


            pull(
                //pull many must return a result in the same partial order.
                //so if we have a stream of even and a stream of odd numbers
                //then those should be in the same order in the output.
                many([
                    async.through("odd")(pull.values([1, 3, 5, 7])),
                    async.through("even")(pull.values([2, 4, 6, 8]))
                ]),
                async.through("collector"),
                pull.collect((err, ary) => {
                    const odd = ary.filter((e) => {
                        return e % 2;
                    });
                    const even = ary.filter((e) => {
                        return !(e % 2);
                    });

                    assert.deepEqual(even, [2, 4, 6, 8]);
                    assert.deepEqual(odd, [1, 3, 5, 7]);
                    async.done();
                    setTimeout(done, 300);
                })
            );

        });

        //strange(async(54, console.error))        
    });

    it("add interleavings", (done) => {
        const async = require("./interleavings");

        async.test((async) => {
            const m = many();

            const n = 2; let o = 6;

            async(() => {
                m.add(async.through("odd")(pull.values([1, 3, 5])));
            }, "add-odd")();

            async(() => {
                m.add(async.through("even")(pull.values([2, 4, 6])));
            }, "add-even")();

            async(() => {

                pull(
                    m,
                    async.through("collector"),
                    pull.through((d) => {
                        // console.log("D", d);
                        if (!--o) {
                            m.add();
                        }
                    }),
                    pull.collect((err, ary) => {
                        const odd = ary.filter((e) => {
                            return e % 2;
                        });
                        const even = ary.filter((e) => {
                            return !(e % 2);
                        });

                        assert.deepEqual(even, [2, 4, 6]);
                        assert.deepEqual(odd, [1, 3, 5]);
                        async.done();
                        setTimeout(done, 300);
                    })
                );
            }, "pipe streams")();
        });

        //strange(async(54, console.error))        
    });
});
