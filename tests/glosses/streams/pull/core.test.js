const {
    stream: { pull }
} = adone;

describe("stream", "pull", "core", () => {
    const curry = function (fun) {
        return function () {
            const args = [].slice.call(arguments);
            return function (read) {
                return fun.apply(null, [read].concat(args));
            };
        };
    };

    const values = function (array) {
        let i = 0;
        return function (abort, cb) {
            if (abort) {
                i = array.length, cb(abort);
            } else if (i >= array.length) {
                cb(true);
            } else {
                cb(null, array[i++]);
            }
        };
    };

    const map = curry((read, mapper) => {
        return function (abort, cb) {
            read(abort, (end, data) => {
                if (end) {
                    cb(end);
                } else {
                    cb(null, mapper(data));
                }
            });
        };
    });

    const sum = curry((read, done) => {
        let total = 0;
        read(null, function next(end, data) {
            if (end) {
                return done(end === true ? null : end, total);
            }
            total += data;
            read(null, next);
        });
    });

    const log = curry((read) => {
        return function (abort, cb) {
            read(abort, (end, data) => {
                if (end) {
                    return cb(end);
                }
                // console.error(data);
                cb(null, data);
            });
        };
    });

    it("wrap pull streams into stream", (done) => {

        pull(
            values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            map((e) => {
                return e * e;
            }),
            log(),
            sum((err, value) => {
                // console.log(value);
                assert.equal(value, 385);
                done();
            })
        );

    });

    it("turn pull(through,...) -> Through", (done) => {

        pull(
            values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            pull(
                map((e) => {
                    return e * e;
                }),
                log()
            ),
            sum((err, value) => {
                // console.log(value);
                assert.equal(value, 385);
                done();
            })
        );

    });

    //  pull(
    //    values ([1 2 3 4 5 6 7 8 9 10])
    //    pull(
    //      map({x y;: e*e })
    //      log()
    //    )
    //    sum({
    //      err value:
    //        assert.equal(value 385)
    //        done()
    //      })
    //  )
    //

    it("writable pull() should throw when called twice", (done) => {
        expect(2).checks(done);

        const stream = pull(
            map((e) => {
                return e * e;
            }),
            sum((err, value) => {
                // console.log(value);
                expect(value).to.equal(385).mark();
            })
        );

        stream(values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));


        expect(() => {
            stream(values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
        }).to.throw(TypeError).mark();
    });

    describe("abort stalled", () => {
        const hang = function (values, onAbort) {
            let i = 0;
            let _cb;
            return function (abort, cb) {
                if (i < values.length) {
                    cb(null, values[i++]);
                } else if (!abort) {
                    _cb = cb;
                } else {
                    _cb(abort);
                    cb(abort); //??
                    onAbort && onAbort();
                }
            };
        };

        const abortable = function () {
            let _read; let aborted;
            const reader = function (read) {
                _read = read;
                return function (abort, cb) {
                    if (abort) {
                        aborted = abort;
                    }
                    read(abort, cb);
                };
            };

            reader.abort = function (cb) {
                cb = cb || function (err) {
                    if (err && err !== true) {
                        throw err;
                    }
                };
                if (aborted) {
                    cb(aborted);
                } else {
                    _read(true, cb);
                }
            };

            return reader;
        };

        const test = function (name, trx) {
            it(`test abort:${name}`, (done) => {
                const a = abortable();

                pull(
                    hang([1, 2, 3], () => {
                        done();
                    }),
                    trx,
                    a,
                    pull.drain((e) => {
                        if (e === 3) {
                            setImmediate(() => {
                                a.abort();
                            });
                        }
                    }, (err) => {
                    })
                );
            });
        };

        test("through", pull.through());
        test("map", pull.map((e) => {
            return e;
        }));
        test("take", pull.take(Boolean));
    });

    describe("async map", () => {
        it("async-map", (done) => {

            pull(
                pull.count(),
                pull.take(21),
                pull.asyncMap((data, cb) => {
                    return cb(null, data + 1);
                }),
                pull.collect((err, ary) => {
                    // console.log(ary);
                    assert.equal(ary.length, 21);
                    done();
                })
            );
        });

        it("abort async map", (done) => {
            const err = new Error("abort");
            expect(2).checks(done);

            const read = pull(
                pull.infinite(),
                pull.asyncMap((data, cb) => {
                    setImmediate(() => {
                        cb(null, data);
                    });
                })
            );

            read(null, (end) => {
                if (!end) {
                    throw new Error("expected read to end");
                }
                expect(end).to.be.ok.mark();
            });

            read(err, (end) => {
                if (!end) {
                    throw new Error("expected abort to end");
                }
                expect(end).to.be.ok.mark();
            });
        });

        it("abort async map (source is slow to ack abort)", (done) => {
            const err = new Error("abort");
            expect(3).checks(done);

            const source = function (end, cb) {
                if (end) {
                    setTimeout(() => {
                        cb(end);
                    }, 20);
                } else {
                    cb(null, 10);
                }
            };

            const read = pull(
                source,
                pull.asyncMap((data, cb) => {
                    setImmediate(() => {
                        cb(null, data);
                    });
                })
            );

            let ended = false;

            read(null, (end) => {
                if (!end) {
                    throw new Error("expected read to end");
                }
                ended = true;
                expect(end).to.be.ok.mark();
            });

            read(err, (end) => {
                if (!end) {
                    throw new Error("expected abort to end");
                }
                expect(end).to.be.ok.mark();
                expect(ended).to.be.ok.mark();
            });
        });

        it("abort async map (async source)", (done) => {
            const err = new Error("abort");
            expect(2).checks(done);

            const read = pull(
                (err, cb) => {
                    setImmediate(() => {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, "x");
                    });
                },
                pull.asyncMap((data, cb) => {
                    setImmediate(() => {
                        cb(null, data);
                    });
                })
            );

            read(null, (end) => {
                if (!end) {
                    throw new Error("expected read to end");
                }
                expect(end).to.be.ok.mark();
            });

            read(err, (end) => {
                if (!end) {
                    throw new Error("expected abort to end");
                }
                expect(end).to.be.ok.mark();
            });
        });

        it("asyncMap aborts when map errors", (done) => {
            expect(2).checks(done);
            const ERR = new Error("abort");
            pull(
                pull.values([1, 2, 3], (err) => {
                    // console.log("on abort");
                    expect(err).to.equal(ERR).mark();
                }),
                pull.asyncMap((data, cb) => {
                    cb(ERR);
                }),
                pull.collect((err) => {
                    expect(err).to.equal(ERR).mark();
                })
            );
        });

        it("async map should pass its own error", (done) => {
            let i = 0;
            const error = new Error("error on last call");

            pull(
                (end, cb) => {
                    end ? cb(true) : cb(null, i + 1);
                },
                pull.asyncMap((data, cb) => {
                    setTimeout(() => {
                        if (++i < 5) {
                            cb(null, data);
                        } else {
                            cb(error);
                        }
                    }, 100);
                }),
                pull.collect((err, five) => {
                    assert.equal(err, error, "should return err");
                    assert.deepEqual(five, [1, 2, 3, 4], "should skip failed item");
                    done();
                })
            );
        });
    });

    describe("collect", () => {
        it("collect empty", (done) => {
            pull(
                pull.empty(),
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary, []);
                    done();
                })
            );
        });
    });

    describe("compose", () => {
        it("join through streams with pipe", (done) => {

            const map = pull.map;

            const pipeline =
                pull(
                    map((d) => {
                        //make exciting!
                        return `${d}!`;
                    }),
                    map((d) => {
                        //make loud
                        return d.toUpperCase();
                    }),
                    map((d) => {
                        //add sparkles
                        return `*** ${d} ***`;
                    })
                );
            //the pipe line does not have a source stream.
            //so it should be a reader (function that accepts
            //a read function)

            assert.equal("function", typeof pipeline);
            assert.equal(1, pipeline.length);

            //if we pipe a read function to the pipeline,
            //the pipeline will become readable!

            const read =
                pull(
                    pull.values(["billy", "joe", "zeke"]),
                    pipeline
                );

            assert.equal("function", typeof read);
            //we will know it's a read function,
            //because read takes two args.
            assert.equal(2, read.length);

            pull(
                read,
                pull.collect((err, array) => {
                    // console.log(array);
                    assert.deepEqual(
                        array,
                        ["*** BILLY! ***", "*** JOE! ***", "*** ZEKE! ***"]
                    );
                    done();
                })
            );
        });
    });

    describe("concat", () => {
        it("concat", (done) => {
            let n = 0;
            pull(
                pull.values("hello there this is a test".split(/([aeiou])/)),
                pull.through(() => {
                    n++;
                }),
                pull.concat((err, mess) => {
                    assert.equal(mess, "hello there this is a test");
                    assert.equal(n, 17);
                    done();
                })
            );
        });
    });

    describe("continuable", () => {
        const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "streams", "pull", ...args);
        const count = require(srcPath("sources/count"));
        const error = require(srcPath("sources/error"));
        const map = require(srcPath("throughs/map"));

        it("continuable stream", (done) => {
            expect(2).checks(done);

            const continuable = function (read) {
                return function (cb) {
                    read(null, function next(end, data) {
                        if (end === true) {
                            return cb(null);
                        }
                        if (end) {
                            return cb(end);
                        }
                        read(end, next);
                    });
                };
            };

            // With values:
            pull(
                count(5),
                map((item) => {
                    return item * 2;
                }),
                continuable
            )((err) => {
                expect(err).not.exist.mark();
            });

            // With error:
            pull(
                error(new Error("test error")),
                continuable
            )((err) => {
                expect(err.message).to.equal("test error").mark();
            });
        });
    });

    describe("drain abort", () => {
        it("abort on drain", (done) => {

            let c = 100;
            const drain = pull.drain(() => {
                if (c < 0) {
                    throw new Error("stream should have aborted");
                }
                if (!--c) {
                    return false;
                } //drain.abort()
            }, () => {
                done();
            });

            pull(pull.infinite(), drain);

        });


        const delay = function () {
            return pull.asyncMap((e, cb) => {
                setTimeout(() => {
                    cb(null, e);
                });
            });
        };

        it("abort on drain - async", (done) => {
            let c = 100;
            const drain = pull.drain(() => {
                if (c < 0) {
                    throw new Error("stream should have aborted");
                }
                if (!--c) {
                    return drain.abort();
                }
            }, () => {
                done();
            });

            pull(pull.infinite(), delay(), drain);

        });

        it("abort on drain - sync", (done) => {
            let c = 100;
            const drain = pull.drain(() => {
                if (c < 0) {
                    throw new Error("stream should have aborted");
                }
                if (!--c) {
                    return drain.abort();
                }
            }, () => {
                done();
            });

            pull(pull.infinite(), drain);

        });


        it("abort on drain - async, out of cb", (done) => {
            let c = 0; const ERR = new Error("test ABORT");
            const drain = pull.drain(() => {
                --c;
            }, (err) => {
                assert.ok(c < 0);
                assert.equal(err, ERR);
                done();
            });

            pull(pull.infinite(), delay(), drain);

            setTimeout(() => {
                drain.abort(ERR);
            }, 100);
        });
    });

    describe("drain if", () => {
        it("reduce becomes through", (done) => {
            pull(
                pull.values([1, 2, 3]),
                pull.reduce((a, b) => {
                    return a + b;
                }, 0, (err, val) => {
                    assert.equal(val, 6);
                    done();
                })
            );
        });

        it("reduce without initial value", (done) => {
            pull(
                pull.values([1, 2, 3]),
                pull.reduce((a, b) => {
                    return a + b;
                }, (err, val) => {
                    assert.equal(val, 6);
                    done();
                })
            );
        });


        it("reduce becomes drain", (done) => {
            pull(
                pull.values([1, 2, 3]),
                pull.reduce(
                    (a, b) => {
                        return a + b;
                    },
                    0,
                    (err, acc) => {
                        assert.equal(acc, 6);
                        done();
                    }
                )
            );
        });
    });

    describe("filter", () => {
        it("filtered randomnes", (done) => {
            pull(
                pull.infinite(),
                pull.filter((d) => {
                    // console.log("f", d);
                    return d > 0.5;
                }),
                pull.take(100),
                pull.collect((err, array) => {
                    assert.equal(array.length, 100);
                    array.forEach((d) => {
                        assert.ok(d > 0.5);
                        assert.ok(d <= 1);
                    });
                    // console.log(array);
                    done();
                })
            );
        });

        it("filter with regexp", (done) => {
            pull(
                pull.infinite(),
                pull.map((d) => {
                    return Math.round(d * 1000).toString(16);
                }),
                pull.filter(/^[^e]+$/i), //no E
                pull.take(37),
                pull.collect((err, array) => {
                    assert.equal(array.length, 37);
                    // console.log(array);
                    array.forEach((d) => {
                        assert.equal(d.indexOf("e"), -1);
                    });
                    done();
                })
            );
        });

        it("inverse filter with regexp", (done) => {
            pull(
                pull.infinite(),
                pull.map((d) => {
                    return Math.round(d * 1000).toString(16);
                }),
                pull.filterNot(/^[^e]+$/i), //no E
                pull.take(37),
                pull.collect((err, array) => {
                    assert.equal(array.length, 37);
                    array.forEach((d) => {
                        assert.notEqual(d.indexOf("e"), -1);
                    });
                    done();
                })
            );
        });
    });

    describe("find", () => {
        it("find 7", (done) => {
            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.find((d) => {
                    return d == 7;
                }, (err, seven) => {
                    assert.equal(seven, 7);
                    assert.notOk(err);
                    done();
                })
            );
        });

        const target = Math.random();
        it(`find ${target}`, (done) => {
            const f = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(Math.random);

            f.push(target);
            pull(
                pull.values(f.sort()),
                pull.find((d) => {
                    return d == target;
                }, (err, found) => {
                    assert.equal(found, target);
                    assert.notOk(err);
                    done();
                })
            );
        });

        it("find missing", (done) => {
            const f = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            pull(
                pull.values(f.sort()),
                pull.find((d) => {
                    return d == target;
                }, (err, found) => {
                    assert.equal(found, null);
                    assert.notOk(err);
                    done();
                })
            );
        });


        it("there can only be one", (done) => {

            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.asyncMap((e, cb) => {
                    process.nextTick(() => {
                        cb(null, e);
                    });
                }),
                pull.find((d) => {
                    return d >= 7;
                }, (err, seven) => {
                    assert.equal(seven, 7);
                    assert.notOk(err);
                    done();
                })
            );

        });

        it("find null", (done) => {
            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.find(null, (err, first) => {
                    assert.equal(first, 1);
                    assert.notOk(err);
                    done();
                })
            );
        });
    });

    describe("flatten", () => {
        it("flatten arrays", (done) => {
            pull(
                pull.values([
                    [1, 2, 3],
                    [4, 5, 6],
                    [7, 8, 9]
                ]),
                pull.flatten(),
                pull.collect((err, numbers) => {
                    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], numbers);
                    done();
                })
            );
        });

        it("flatten - number of reads", (done) => {
            let reads = 0;
            pull(
                pull.values([
                    pull.values([1, 2, 3])
                ]),
                pull.flatten(),
                pull.through(() => {
                    reads++;
                    // console.log("READ", reads);
                }),
                pull.take(2),
                pull.collect((err, numbers) => {
                    assert.deepEqual([1, 2], numbers);
                    assert.equal(reads, 2);
                    done();
                })
            );

        });
        it("flatten stream of streams", (done) => {

            pull(
                pull.values([
                    pull.values([1, 2, 3]),
                    pull.values([4, 5, 6]),
                    pull.values([7, 8, 9])
                ]),
                pull.flatten(),
                pull.collect((err, numbers) => {
                    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], numbers);
                    done();
                })
            );

        });

        it("flatten stream of broken streams", (done) => {
            const _err = new Error("I am broken"); let sosEnded;
            pull(
                pull.values([
                    pull.error(_err)
                ], (err) => {
                    sosEnded = err;
                }),
                pull.flatten(),
                pull.onEnd((err) => {
                    assert.equal(err, _err);
                    process.nextTick(() => {
                        assert.equal(sosEnded, null, "should abort stream of streams");
                        done();
                    });
                })
            );
        });

        it("abort flatten", (done) => {
            let sosEnded; let s1Ended; let s2Ended;
            const read = pull(
                pull.values([
                    pull.values([1, 2], (err) => {
                        s1Ended = err;
                    }),
                    pull.values([3, 4], (err) => {
                        s2Ended = err;
                    })
                ], (err) => {
                    sosEnded = err;
                }),
                pull.flatten()
            );

            read(null, (err, data) => {
                assert.notOk(err);
                assert.equal(data, 1);
                read(true, (err, data) => {
                    assert.equal(err, true);
                    process.nextTick(() => {
                        assert.equal(sosEnded, null, "should abort stream of streams");
                        assert.equal(s1Ended, null, "should abort current nested stream");
                        assert.equal(s2Ended, undefined, "should not abort queued nested stream");
                        done();
                    });
                });
            });
        });

        it("abort flatten before 1st read", (done) => {
            let sosEnded; let s1Ended;
            const read = pull(
                pull.values([
                    pull.values([1, 2], (err) => {
                        s1Ended = err;
                    })
                ], (err) => {
                    sosEnded = err;
                }),
                pull.flatten()
            );

            read(true, (err, data) => {
                assert.equal(err, true);
                assert.notOk(data);
                process.nextTick(() => {
                    assert.equal(sosEnded, null, "should abort stream of streams");
                    assert.equal(s1Ended, undefined, "should abort current nested stream");
                    done();
                });
            });
        });

        it("flattern handles stream with normal objects", (done) => {
            pull(
                pull.values([
                    [1, 2, 3], 4, [5, 6, 7], 8, 9, 10
                ]),
                pull.flatten(),
                pull.collect((err, ary) => {
                    assert.deepEqual(ary, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                    done();
                })
            );
        });
    });

    describe("map", () => {
        it("map throughs ends stream", (done) => {
            const err = new Error("unwholesome number");
            pull(
                pull.values([1, 2, 3, 3.4, 4]),
                pull.map((e) => {
                    if (e !== ~~e) {
                        throw err;
                    }
                }),
                pull.drain(null, (_err) => {
                    assert.equal(_err, err);
                    done();
                })
            );
        });
    });

    describe("take", () => {
        it("through - onEnd", (done) => {
            expect(2).checks(done);
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            //read values, and then just stop!
            //this is a subtle edge case for take!

            //I did have a thing that used this edge case,
            //but it broke take, actually. so removing it.
            //TODO: fix that thing - was a test for some level-db stream thing....

            //  pull.Source(function () {
            //    return function (end, cb) {
            //      if(end) cb(end)
            //      else if(values.length)
            //        cb(null, values.shift())
            //      else console.log('drop')
            //    }
            //  })()

            pull(
                pull.values(values),
                pull.take(10),
                pull.through(null, (err) => {
                    // console.log("end");
                    expect(true).to.be.true.mark();
                    // process.nextTick(() => {
                    //     done();
                    // });
                }),
                pull.collect((err, ary) => {
                    // console.log(ary);
                    expect(true).to.be.true.mark();
                })
            );
        });


        it("take - exclude last (default)", (done) => {
            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.take((n) => {
                    return n < 5;
                }),
                pull.collect((err, four) => {
                    assert.deepEqual(four, [1, 2, 3, 4]);
                    done();
                })
            );
        });
        it("take - include last", (done) => {
            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.take((n) => {
                    return n < 5;
                }, { last: true }),
                pull.collect((err, five) => {
                    assert.deepEqual(five, [1, 2, 3, 4, 5]);
                    done();
                })
            );
        });

        it("take 5 causes 5 reads upstream", (done) => {
            let reads = 0;
            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                (read) => {
                    return function (end, cb) {
                        if (end !== true) {
                            reads++;
                        }
                        // console.log(reads, end);
                        read(end, cb);
                    };
                },
                pull.take(5),
                pull.collect((err, five) => {
                    assert.deepEqual(five, [1, 2, 3, 4, 5]);
                    process.nextTick(() => {
                        assert.equal(reads, 5);
                        done();
                    });
                })
            );
        });

        it("take doesn't abort until the last read", (done) => {

            let aborted = false;

            const ary = [1, 2, 3, 4, 5]; let i = 0;

            const read = pull(
                (abort, cb) => {
                    if (abort) {
                        cb(aborted = true);
                    } else if (i > ary.length) {
                        cb(true);
                    } else {
                        cb(null, ary[i++]);
                    }
                },
                pull.take((d) => {
                    return d < 3;
                }, { last: true })
            );

            read(null, (_, d) => {
                assert.notOk(aborted, "hasn't aborted yet");
                read(null, (_, d) => {
                    assert.notOk(aborted, "hasn't aborted yet");
                    read(null, (_, d) => {
                        assert.notOk(aborted, "hasn't aborted yet");
                        read(null, (end, d) => {
                            assert.ok(end, "stream ended");
                            assert.equal(d, undefined, "data undefined");
                            assert.ok(aborted, "has aborted by now");
                            done();
                        });
                    });
                });
            });

        });

        it("take should throw error on last read", (done) => {
            let i = 0;
            const error = new Error("error on last call");

            pull(
                pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
                pull.take((n) => {
                    return n < 5;
                }, { last: true }),
                // pull.take(5),
                pull.asyncMap((data, cb) => {
                    setTimeout(() => {
                        if (++i < 5) {
                            cb(null, data);
                        } else {
                            cb(error);
                        }
                    }, 100);
                }),
                pull.collect((err, five) => {
                    assert.equal(err, error, "should return err");
                    assert.deepEqual(five, [1, 2, 3, 4], "should skip failed item");
                    done();
                })
            );
        });
    });

    describe("through", () => {
        it("through - onEnd", (done) => {
            expect(2).checks(done);
            pull(
                pull.infinite(),
                pull.through(null, (err) => {
                    // console.log("end");
                    expect(true).to.be.true.mark();
                    // process.nextTick(() => {
                    //     t.end();
                    // });
                }),
                pull.take(10),
                pull.collect((err, ary) => {
                    // console.log(ary);
                    expect(true).to.be.true.mark();
                })
            );
        });
    });

    describe("unique", () => {
        it("unique", (done) => {
            const numbers = [1, 2, 2, 3, 4, 5, 6, 4, 0, 6, 7, 8, 3, 1, 2, 9, 0];

            pull(
                pull.values(numbers),
                pull.unique(),
                pull.collect((err, ary) => {
                    assert.deepEqual(ary.sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    done();
                })
            );
        });

        it("non-unique", (done) => {
            const numbers = [1, 2, 2, 3, 4, 5, 6, 4, 0, 6, 7, 8, 3, 1, 2, 9, 0];

            pull(
                pull.values(numbers),
                pull.nonUnique(),
                pull.collect((err, ary) => {
                    assert.deepEqual(ary.sort(), [0, 1, 2, 2, 3, 4, 6]);
                    done();
                })
            );
        });
    });

    describe("values", () => {
        it("values - array", (done) => {
            pull(
                pull.values([1, 2, 3]),
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary, [1, 2, 3]);
                    done();
                })
            );
        });
        
        it("values - object", (done) => {
            pull(
                pull.values({ a: 1, b: 2, c: 3 }),
                pull.collect((err, ary) => {
                    assert.notOk(err);
                    assert.deepEqual(ary, [1, 2, 3]);
                    done();
                })
            );
        
        });
        
        it("values, abort", (done) => {
            expect(3).checks(done);
        
            const err = new Error("intentional");
        
            const read = pull.values([1, 2, 3], (err) => {
                done();
            });
        
            read(null, (_, one) => {
                expect(_).to.not.ok.mark();
                expect(one).to.equal(1).mark();
                read(err, (_err) => {
                    expect(_err).to.equal(err).mark();
                });
            });
        });        
    });
});
