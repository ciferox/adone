const {
    p2p: { stream: { pull, pair: Pair, peek } }
} = adone;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "streams", "defer", ...args);

describe("pull", "defer", () => {
    describe("duplex", () => {
        const Duplex = require(srcPath("duplex"));

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
        const lazy = require(srcPath("sink"));

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
        const defer = require(srcPath("source"));

        it("defer", (done) => {

            const deferred = defer();

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

            const deferred = defer();

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


            const deferred = defer();

            //abort the deferred stream immediately.
            deferred(true, () => {
                console.log("ended");
                assert.ok(true);
            });

            deferred.resolve(pull.values([1, 2, 3], () => {
                console.log("aborted");
                assert.ok(true);
                done();
            }));

        });

        it("defer, read and abort before connecting", (done) => {


            const deferred = defer(); let ended = false;

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
                console.log("aborted");
                assert.ok(true);
                done();
            }));
        });
    });

    describe("through", () => {
        const gate = require(srcPath("through"));

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
                    console.log("first", end, data);
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
