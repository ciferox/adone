const {
    stream: { pull2: pull },
    std: { net }
} = adone;
const { defer, pullStreamToStream } = pull;

describe("stream", "pull", "pullStreamToStream", () => {
    it("simple", (done) => {
        const server = net.createServer((stream) => {
            stream.pipe(
                pullStreamToStream(
                    pull(
                        pull.map((e) => {
                            return `${e}`;
                        }), pull.collect((err, ary) => {
                            // console.log(ary);
                            done();
                        })
                    ),
                    pull(
                        pull.infinite(),
                        pull.asyncMap((e, cb) => {
                            process.nextTick(() => {
                                cb(null, `${e.toString()}\n`);
                            });
                        }),
                        pull.take(10)
                    )
                )).on("end", () => {
                    // console.log("PULL -- END");
                })
                .pipe(stream).on("end", () => {
                    server.close();
                });

        }).listen(0, () => {
            const stream = net.connect(server.address().port);
            stream.write("hello");
            stream.end();
        });
    });


    it("header", (done) => {
        const a = [];

        const server = net.createServer((stream) => {
            const source = defer.source();

            stream.pipe(
                pullStreamToStream((read) => {
                    read(null, (err, len) => {
                        source.resolve(pull(
                            pull.infinite(),
                            pull.take(Number(len)),
                            pull.map((n) => {
                                a.push(n);
                                return `${n}\n`;
                            })
                        ));
                    });
                }, source)
                    .on("end", () => {
                        // console.log("PULL -- END");
                    })
            )
                .pipe(stream);

        }).listen(0, () => {
            const stream = net.connect(server.address().port);
            stream.write("10");
            let data = "";
            stream.on("data", (d) => {
                // console.log("cData", `${d}`);
                data += d;
            });
            stream.on("end", () => {
                // console.log("END !");
                stream.end();
                server.close();

                const nums = data.split("\n").map(Number);
                nums.pop();
                assert.deepEqual(nums, a);
                done();
            });
        });
    });

    describe("backpressure", () => {
        const { Readable } = require("stream");

        it("backpressure", (done) => {
            expect(10).checks(done);

            const s = pullStreamToStream(
                pull.asyncMap((e, cb) => {
                    setTimeout(() => {
                        cb(null, `${e.toString()}\n`);
                    }, 10);
                })
            );

            s.on("data", (c) => {
                expect(c).to.be.ok.mark();
            });

            s.once("end", () => {
                expect(true).to.be.true.mark();
            });


            let i = 0;
            const r = new Readable({
                read(size) {
                    // this stream generates 10 elements and ends
                    // with a delay of 10ms after the first read

                    const self = this;
                    const run = function (j) {
                        setTimeout(() => {
                            if (j === 10) {
                                self.push(null);
                            } else {
                                self.push(Buffer.from(`${i}-hello`));
                            }
                        }, 10);
                    };
                    while (i <= 10) {
                        run(i);
                        i++;
                    }
                }
            });

            r.pipe(s);
        });

        it("backpressure with constant resume", (done) => {
            const values = [0, 1, 2, 3, 4, 5, 6, 7, 8];

            const s = pullStreamToStream.source(pull(
                pull.values(values),
                pull.asyncMap((value, cb) => {
                    setTimeout(() => {
                        // pass through value with delay
                        cb(null, value);
                    }, 10);
                })
            ));

            const timer = setInterval(() => {
                s.resume();
            }, 5);

            const output = [];

            s.on("data", (c) => {
                output.push(c);
            });

            s.once("end", () => {
                clearInterval(timer);
                assert.deepEqual(output, values, "End called after all values emitted");
                done();
            });
        });
    });

    describe("close", () => {
        it("test close", (done) => {
            expect(10).checks(done);

            let i = 10;
            const cs = pullStreamToStream(null, pull(pull.infinite(), pull.through(null, () => {
                // console.log("CLOSE");
                // done();
            })))
                .on("data", (data) => {
                    expect(data).to.be.ok.mark();
                    if (!--i) {
                        cs.destroy();
                    }
                });

        });


        it("test end", (done) => {
            expect(10).checks(done);

            let i = 10;
            const cs = pullStreamToStream(null, pull(pull.infinite(), pull.through(null, () => {
                // console.log("ENDED");
                // done();
            })))
                .on("data", (data) => {
                    expect(data).to.be.ok.mark();
                    if (!--i) {
                        cs.end();
                    }
                });

        });

        it("test end async", (done) => {
            expect(10).checks(done);

            const cs = pullStreamToStream(pull.asyncMap((val, cb) => {
                setTimeout(() => {
                    cb(null, val);
                }, 10);
            }));

            cs.on("data", (data) => {
                expect(data).to.be.ok.mark();
            });

            cs.on("end", () => {
                // done();
            });

            for (let i = 0; i < 10; i++) {
                cs.write(Buffer.from("world"));
            }

            cs.end();
        });
    });

    describe("error", () => {
        it("test that error is emitted", (done) => {
            const error = new Error("error immediately!");
            const s = pullStreamToStream(null, (_, cb) => {
                cb(error);
            });

            s.on("error", (err) => {
                assert.equal(err, error);
                done();
            });
        });

        it("error when paused", (done) => {
            const error = new Error("error immediately!");
            const s = pullStreamToStream(null, (_, cb) => {
                // console.log("read");
                setTimeout(() => {
                    cb(error);
                }, 100);
            });


            s.on("error", (err) => {
                assert.equal(err, error);
                done();
            });

            process.nextTick(() => {
                s.pause();

                setTimeout(() => {
                    s.resume();
                }, 200);
            });
        });
    });

    describe("pipe", () => {
        it("pipe - resume", (done) => {

            const s = pullStreamToStream(null, pull(pull.infinite(), pull.take(10)));
            s.pause();

            s.pipe(pullStreamToStream(pull.collect((err, values) => {
                assert.equal(values.length, 10);
                done();
            }), null));
        });
    });

    describe("test2", () => {
        it("header", (done) => {
            const a = [];

            const server = net.createServer((stream) => {
                const source = defer.source();

                const d = pullStreamToStream()
                    .on("end", () => {
                        // console.log("PULL -- END");
                    });

                stream.pipe(d).pipe(stream);

                pull(source, d.sink); //pass output to source

                //pull one item "HEADER" from source.
                pull(
                    d.source,
                    (read) => {
                        read(null, (err, len) => {
                            source.resolve(pull(
                                pull.infinite(),
                                pull.take(Number(len)),
                                pull.map((n) => {
                                    a.push(n);
                                    return `${n}\n`;
                                })
                            ));
                        });
                    }
                );

            }).listen(0, () => {
                const stream = net.connect(server.address().port);
                stream.write(String(~~(Math.random() * 50)));
                let data = "";
                stream.on("data", (d) => {
                    // console.log("cData", `${d}`);
                    data += d;
                });
                stream.on("end", () => {
                    server.close();
                    // console.log("END !");
                    //stream.end()
                    //server.close()
                    const nums = data.split("\n").map(Number);
                    nums.pop();
                    assert.deepEqual(nums, a);
                    done();
                });
            });
        });
    });
});
