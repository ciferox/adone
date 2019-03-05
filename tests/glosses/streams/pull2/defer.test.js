const {
    stream: { pull2: pull }
} = adone;
const { pair: Pair, peek, defer } = pull;

describe("stream", "pull", "defer", () => {
    describe("duplex", () => {
        const Duplex = defer.duplex;

        it("simple", (done) => {
            const duplex = Duplex();

            pull(
                pull.values([1, 2, 3]),
                duplex,
                pull.collect((err, values) => {
                    assert.deepEqual(values, [1, 2, 3]);
                    done();
                })
            );

            //by default, pair gives us a pass through stream as duplex.
            duplex.resolve(Pair());
        });
    });

    describe("sink", () => {
        const lazy = defer.sink;

        it("simple", (done) => {

            const feed = []; let l;

            pull(
                pull.values(feed),
                l = lazy(pull.collect((err, ary) => {
                    if (err) {
                        throw err;
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
            const feed = []; let l;

            pull(pull.values(feed), l = lazy());

            setTimeout(() => {
                feed.push(1, 2, 3);

                l.start(pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [1, 2, 3]);
                    done();
                }));
            });
        });
    });

    describe("source", () => {
        const source = defer.source;

        it("defer", (done) => {

            const deferred = source();

            pull(
                deferred,
                pull.map((e) => {
                    return e * 5;
                }),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );

            deferred.resolve(pull.values([1, 2, 3, 4, 5]));
        });

        it("defer - resolve early", (done) => {
            const deferred = source();

            deferred.resolve(pull.values([1, 2, 3, 4, 5]));

            pull(
                deferred,
                pull.map((e) => {
                    return e * 5;
                }),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );

        });

        it("defer, abort before connecting", (done) => {
            const deferred = source();

            //abort the deferred stream immediately.
            deferred(true, () => {
                // console.log("ended");
                assert.ok(true);
            });

            deferred.resolve(pull.values([1, 2, 3], () => {
                // console.log("aborted");
                assert.ok(true);
                done();
            }));

        });

        it("defer, read and abort before connecting", (done) => {
            const deferred = source();
            let ended = false;

            //queue a read immediately

            deferred(null, (end, data) => {
                assert.notOk(end);
                assert.notOk(ended);
                assert.equal(data, 1);
            });

            //abort the deferred stream immediately.
            deferred(true, () => {
                assert.ok(ended = true);
            });

            deferred.resolve(pull.values([1, 2, 3], () => {
                // console.log("aborted");
                assert.ok(true);
                done();
            }));
        });
    });

    describe("through", () => {
        const gate = defer.through;

        it("simple resolve after", (done) => {

            const g = gate();

            pull(
                pull.values([1, 2, 3, 4, 5]),
                g,
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );

            g.resolve(pull.map((e) => {
                return e * 5;
            }));

        });

        it("simple resolve before", (done) => {

            const g = gate();
            g.resolve(pull.map((e) => {
                return e * 5;
            }));

            pull(
                pull.values([1, 2, 3, 4, 5]),
                g,
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );

        });

        it("simple resolve mid", (done) => {

            const g = gate();

            const source = pull(pull.values([1, 2, 3, 4, 5]), g);

            g.resolve(pull.map((e) => {
                return e * 5;
            }));

            pull(source,
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );
        });

        it("resolve after read", (done) => {
            const g = gate(); let resolved = false;

            pull(
                pull.values([1, 2, 3, 4, 5]),
                (read) => {
                    return function (abort, cb) {
                        read(abort, (end, data) => {
                            if (!resolved) {
                                resolved = true;
                                g.resolve(pull.map((e) => {
                                    return e * 5;
                                }));
                            }
                            cb(end, data);
                        });
                    };
                },
                //peek always reads the first item, before it has been called.
                peek(),
                g,
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                    done();
                })
            );

        });

        it("peek with resume", (done) => {

            const defer = gate();
            let first;

            pull(
                pull.values([1, 2, 3, 4, 5]),
                defer,
                peek((end, data) => {
                    // console.log("first", end, data);
                    assert.equal(data, 2);
                    first = data;
                }),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.equal(first, 2);
                    assert.deepEqual(ary, [2, 4, 6, 8, 10]);
                    done();
                })
            );

            defer.resolve(pull.map((e) => {
                return e * 2;
            }));
        });
    });
});
