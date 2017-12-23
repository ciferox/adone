describe("stream", "pull", "combinator", "many", () => {
    const { is, stream: { pull } } = adone;
    const { many } = pull;

    const rand = (name, n) => {
        const a = [];
        let i = 0;
        while (n--) {
            a.push({ key: name, value: i++ });
        }
        return a;
    };

    const flatten = (ary) => {
        return ary.reduce((a, b) => {
            return a.concat(b);
        }, []);
    };

    const compare = (a, b) => {
        return (a.value - b.value) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    };

    const partial = (ary) => {
        const latest = {};
        ary.forEach((v) => {
            if (!is.nil(latest[v.key])) {
                assert.ok(latest[v.key] < v.value);
            }
            latest[v.key] = v.value;
        });
    };

    const delay = (read) => {
        return function (abort, cb) {
            read(abort, (end, data) => {
                setTimeout(() => {
                    cb(end, data);
                }, Math.random() * 20);
            });
        };
    };

    const noDelay = (read) => {
        return read;
    };

    const tests = (name, all, async) => {
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

    const error = (err) => {
        return function (abort, cb) {
            cb(err);
        };
    };

    it("a stream errors", (done) => {
        const err = new Error("test-error");
        const aborted = [];
        const check = (read, i) => {
            return function (abort, cb) {
                aborted[i] = true;
                read(abort, (end, data) => {
                    if (end) {
                        aborted[i] = true;
                    }
                    cb(end, data);
                });
            };
        };

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
});
