describe("stream", "pull", "toStream", () => {
    const {
        stream: { pull },
        std: {
            stream: { Readable }
        }
    } = adone;

    const {
        toStream
    } = pull;


    describe("backpressure", () => {
        it("backpressure", (done) => {
            const s = toStream(
                pull.asyncMap((e, cb) => {
                    setTimeout(() => {
                        cb(null, `${e.toString()}\n`);
                    }, 10);
                })
            );

            const onData = spy();

            s.on("data", onData);

            const onEnd = spy();

            s.once("end", onEnd);


            let i = 0;
            const r = new Readable({
                read(size) {
                    // this stream generates 10 elements and ends
                    // with a delay of 10ms after the first read

                    const run = (j) => {
                        setTimeout(() => {
                            if (j === 10) {
                                this.push(null);
                            } else {
                                this.push(Buffer.from(`${i}-hello`));
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

            s.once("end", () => {
                expect(onData).to.have.callCount(9);
                expect(onEnd).to.have.been.calledOnce;
                done();
            });
        });

        it("backpressure with constant resume", (done) => {
            const values = [0, 1, 2, 3, 4, 5, 6, 7, 8];

            const s = toStream.source(pull(
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
        it("close", (done) => {
            let i = 10;
            const cs = toStream(null, pull(pull.infinite(), pull.through(null, () => {
                expect(i).to.been.equal(0);
                done();
            })))
                .on("data", (data) => {
                    assert.ok(data);
                    if (!--i) {
                        cs.destroy();
                    }
                });

        });


        it("end", (done) => {
            let i = 10;
            const cs = toStream(null, pull(pull.infinite(), pull.through(null, () => {
                expect(i).to.been.equal(0);
                done();
            })))
                .on("data", (data) => {
                    assert.ok(data);
                    if (!--i) {
                        cs.end();
                    }
                });

        });

        it.todo("test end async", (done) => {
            const cs = toStream(pull.asyncMap((val, cb) => {
                setTimeout(() => {
                    cb(null, val);
                }, 10);
            }));

            const s = spy();

            cs.on("data", (data) => {
                assert.ok(data);
            });

            cs.on("end", () => {
                expect(s).to.have.callCount(10);
                done();
            });

            for (let i = 0; i < 10; i++) {
                cs.write(Buffer.from("world"));
            }

            cs.end();
        });
    });
});
