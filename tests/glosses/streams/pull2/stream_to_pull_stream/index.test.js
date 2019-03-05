const {
    stream: { pull2: pull },
    std: { fs }
} = adone;
const { streamToPullStream, cat: Cat, hang: Hang, split } = pull;

const through = require("through");

pull(
    pull.values([
        "hello\n",
        "  there\n"
    ]),
    streamToPullStream(process.stdout)
);

describe("stream", "pull", "streamToPullStream", () => {
    it("get end callback even with stdout", (done) => {

        pull(
            streamToPullStream(fs.createReadStream(__filename)),
            pull.map((e) => {
                return e.toString().toUpperCase();
            }),
            streamToPullStream.sink(process.stdout, (err) => {
                console.log("----END!");
                done();
            })
        );
    });

    describe("abort", () => {
        it("abort", (done) => {
            const ts = through();
            ts.on("close", () => {
                assert.ok(true);
            });
            pull(
                pull.values([0.1, 0.4, 0.6, 0.7, 0.94, 0.3]),
                //  pull.infinite()
                streamToPullStream(ts),
                (read) => {
                    // console.log("reader!");
                    read(null, function next(end, data) {
                        // console.log(">>>", end, data);
                        if (data > 0.9) {
                            // console.log("ABORT");
                            read(true, (end) => {
                                assert.ok(true);
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
            const ts = through(); let aborted = false; const c = 0; let _read; let ended; let closed;
            ts.on("close", () => {
                closed = true;
            });
            pull(
                Cat([
                    pull.values([0.1, 0.4, 0.6, 0.7, 0.3]),
                    Hang(() => {
                        aborted = true;
                    })
                ]),
                streamToPullStream(ts),
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
            const ts = through();

            let n = 0;
            pull(
                streamToPullStream.source(ts),
                //like pull.take(4), but abort async.
                (read) => {
                    return function (abort, cb) {
                        // console.log(n);
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

            ts.queue(1);
            ts.queue(2);
            ts.queue(3);
            ts.queue(4);

        });
    });

    describe("close", () => {
        it("propagate close back to source", (done) => {
            let i = 0;

            const ts = through((data) => {
                console.log(data);
                if (i++ > 100) {
                    ts.destroy();
                }
            });

            pull(
                pull.infinite(),
                (read) => {
                    return function (abort, cb) {
                        if (abort) {
                            assert.ok(true);
                            done();
                            return;
                        }
                        read(false, cb);
                    };
                },
                streamToPullStream(ts),
                pull.drain()
            );
        });
    });

    describe("collect", () => {
        it("collect", (done) => {

            const values = [0.1, 0.4, 0.6, 0.7, 0.94];
            pull(
                pull.values(values),
                streamToPullStream(through()),
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
                    streamToPullStream(req),
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
                        console.log(res.statusCode);
                        const _res = streamToPullStream(res);

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
            const ts = through((data) => {
                assert.equal(data, input.shift());
            }, function () {
                ended = true;
                this.queue(null);
            });

            pull(
                pull.values([1, 2, 3]),
                streamToPullStream.sink(ts, (err) => {
                    assert.notOk(err);
                    assert.ok(ended);
                    done();
                })
            );
        });


        it("error", (done) => {


            const ts = through();
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
                streamToPullStream.sink(ts, (_err) => {
                    assert.equal(_err, err);
                    done();
                })
            );
        });
    });

    describe("stack", () => {
        pull(
            pull.count(1000000),
            pull.map((e) => {
                return `${e.toString()}\n`;
            }),
            streamToPullStream.sink(through())
        );
    });

    it("streams2", () => {
        const stream = require("stream");

        if (stream.Readable) {
            it("issue-3", (done) => {
                const util = require("util");
                util.inherits(Counter, stream.Readable);

                // eslint-disable-next-line func-style
                function Counter() {
                    stream.Readable.call(this, { objectMode: true, highWaterMark: 1 });
                    this._max = 5;
                    this._index = 1;
                }

                Counter.prototype._read = function () {
                    const i = this._index++;
                    this.push(i);
                    if (i >= this._max) {
                        this.push(null);
                    }
                };

                pull(
                    streamToPullStream(new Counter()),
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
        }
    });

    it("test stdout", (done) => {
        const cp = require("child_process");


        console.log(process.execPath, [require.resolve("./stdout")]);
        const child = cp.spawn(process.execPath, [require.resolve("./stdout")]);
        child.on("exit", () => {
            console.log("ended");
        });
        pull(
            streamToPullStream.source(child.stdout),
            split("\n\n"),
            pull.filter(),
            pull.map((e) => {
                try {
                    return JSON.parse(e);
                } catch (err) {
                    console.log(JSON.stringify(e));
                    //throw err
                }

            }),
            pull.asyncMap((data, cb) => {
                setTimeout(() => {
                    cb(null, data);
                }, 10);
            }),
            pull.drain(null, (err) => {
                console.log("DONE");
                if (err) {
                    throw err;
                }
                console.log("done");
                done();
            })
        );
    });
});
