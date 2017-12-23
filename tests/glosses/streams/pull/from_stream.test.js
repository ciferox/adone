describe("stream", "pull", "fromStream", () => {
    const { stream: { pull, through } } = adone;

    describe("abort", () => {
        it("abort", (done) => {

            const onClose = spy();

            const ts = through.obj();
            ts.on("close", onClose);

            pull(
                pull.values([0.1, 0.4, 0.6, 0.7, 0.94, 0.3]),
                //  pull.infinite()
                pull.fromStream(ts),
                (read) => {
                    read(null, function next(end, data) {
                        if (data > 0.9) {
                            read(true, (end) => {
                                expect(onClose).to.have.been.calledOnce;
                                done();
                            });
                        } else {
                            read(null, next);
                        }
                    });
                }
            );
        });

        it("abort hang", (done) => {
            const ts = through.obj();
            let aborted = false;
            let _read;
            let ended;
            let closed;
            ts.on("close", () => {
                closed = true;
            });
            pull(
                pull.cat([
                    pull.values([0.1, 0.4, 0.6, 0.7, 0.3]),
                    pull.hang(() => {
                        aborted = true;
                    })
                ]),
                pull.fromStream(ts),
                (read) => {
                    _read = read;
                    read(null, function next(end, data) {
                        if (end) {
                            ended = true;
                        } else {
                            read(null, next);
                        }
                    });
                }
            );

            setTimeout(() => {
                _read(true, (end) => {
                    assert.ok(aborted, "aborted");
                    assert.ok(ended, "ended");
                    assert.ok(closed, "closed");
                    assert.ok(end, "abort cb end");
                    done();
                });
            }, 10);
        });

        it("abort a stream that has already ended", (done) => {

            const ts = through.obj();

            let n = 0;
            pull(
                pull.fromStream.source(ts),
                //like pull.take(4), but abort async.
                (read) => {
                    return function (abort, cb) {
                        if (n++ < 4) {
                            read(null, cb);
                        } else {
                            //this would be quite a badly behaved node stream
                            //but it can be difficult to make a node stream that behaves well.
                            ts.end();
                            setTimeout(() => {
                                read(true, cb);
                            }, 10);
                        }
                    };
                },
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, [1, 2, 3, 4]);
                    done();
                })
            );

            ts.push(1);
            ts.push(2);
            ts.push(3);
            ts.push(4);
        });
    });

    describe("close", () => {
        it("propagate close back to source", (done) => {
            let i = 0;

            const ts = through.obj((data, _, cb) => {
                if (i++ > 100) {
                    ts.end();
                }
                cb();
            });

            pull(
                pull.infinite(),
                (read) => {
                    return function (abort, cb) {
                        if (abort) {
                            done();
                        }
                        read(false, cb);
                    };
                },
                pull.fromStream(ts),
                pull.drain()
            );

        });
    });

    describe("collect", () => {
        it("collect", (done) => {

            const values = [0.1, 0.4, 0.6, 0.7, 0.94];
            pull(
                pull.values(values),
                pull.fromStream(through.obj()),
                pull.collect((err, _values) => {
                    assert.deepEqual(_values, values);
                    done();
                })
            );
        });
    });

    describe("http", () => {
        const http = require("http");
        const fs = require("fs");
        const port = ~~(Math.random() * 40000) + 1024;

        const thisFile = fs.readFileSync(__filename, "utf-8");

        it("test http", (done) => {
            const server = http.createServer((req, res) => {
                pull(
                    pull.fromStream(req),
                    pull.reduce((b, s) => {
                        return b + s;
                    }, "", (err, body) => {
                        assert.equal(body, thisFile);
                        assert.notOk(err);
                        res.end("done");
                    })
                );
            }).listen(port, () => {

                fs.createReadStream(__filename)
                    .pipe(http.request({ method: "PUT", port }, (res) => {
                        const _res = pull.fromStream(res);

                        setTimeout(() => {

                            pull(
                                _res,
                                pull.collect((err, ary) => {
                                    assert.equal(ary.map(String).join(""), "done");
                                    done();
                                })
                            );

                        }, 200);

                        server.close();
                    }));
            });
        });
    });

    describe("sink", () => {
        it("propagate close back to source", (done) => {
            let ended = false;
            const input = [1, 2, 3];
            const ts = through.obj((data, _, cb) => {
                assert.equal(data, input.shift());
                cb();
            }, function () {
                ended = true;
                this.push(null);
            });

            pull(
                pull.values([1, 2, 3]),
                pull.fromStream.sink(ts, (err) => {
                    assert.notOk(err);
                    assert.ok(ended);
                    done();
                })
            );
        });


        it("error", (done) => {
            const ts = through.obj();
            const err = new Error("wtf");
            pull(
                pull.values([1, 2, 3]),
                (read) => {
                    return function (abort, cb) {
                        read(abort, (end, data) => {
                            if (data === 3) {
                                cb(err);
                            } else {
                                cb(end, data);
                            }
                        });
                    };
                },
                pull.fromStream.sink(ts, (_err) => {
                    assert.equal(_err, err);
                    done();
                })
            );

        });
    });

    describe("stream2", () => {
        it("issue-3", (done) => {
            class Counter extends adone.std.stream.Readable {
                constructor() {
                    super({ objectMode: true, highWaterMark: 1 });
                    this._max = 5;
                    this._index = 1;
                }

                _read() {
                    const i = this._index++;
                    this.push(i);
                    if (i >= this._max) {
                        this.push(null);
                    }
                }
            }

            pull(
                pull.fromStream(new Counter()),
                pull.asyncMap((value, done) => {
                    process.nextTick(() => {
                        done(null, value);
                    });
                }),
                pull.collect((err, values) => {
                    assert.deepEqual(values, [1, 2, 3, 4, 5]);
                    done();
                })
            );
        });
    });
});
