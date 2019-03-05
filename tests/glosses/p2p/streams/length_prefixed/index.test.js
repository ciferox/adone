const {
    p2p: { stream: { pull, block, pushable: Pushable, lengthPrefixed: lp, reader: Reader } }
} = adone;

const varint = require("varint");

const delay = function (time) {
    return pull.asyncMap((val, cb) => {
        setTimeout(() => {
            cb(null, val);
        }, time);
    });
};

describe("pull", "lengthPrefixed", () => {
    it("basics", (done) => {
        const input = [
            Buffer.from("hello "),
            Buffer.from("world")
        ];

        pull(
            pull.values(input),
            lp.encode(),
            pull.collect((err, encoded) => {
                if (err) {
                    throw err;
                }

                const helloLen = varint.encode("hello ".length);
                const worldLen = varint.encode("world".length);
                expect(
                    encoded
                ).to.be.eql([
                    Buffer.concat([
                        Buffer.alloc(helloLen.length, helloLen, "utf8"),
                        Buffer.alloc("hello ".length, "hello ", "utf8")
                    ]),
                    Buffer.concat([
                        Buffer.alloc(worldLen.length, worldLen, "utf8"),
                        Buffer.alloc("world".length, "world", "utf8")
                    ])
                ]);
                pull(
                    pull.values(encoded),
                    lp.decode(),
                    pull.collect((err, output) => {
                        if (err) {
                            throw err;
                        }
                        expect(
                            input
                        ).to.be.eql(
                            output
                        );
                        done();
                    })
                );
            })
        );
    });

    it("max length", (done) => {
        const input = [
            Buffer.from("hello "),
            Buffer.from("world")
        ];

        pull(
            pull.values(input),
            lp.encode(),
            pull.collect((err, encoded) => {
                if (err) {
                    throw err;
                }

                const helloLen = varint.encode("hello ".length);
                const worldLen = varint.encode("world".length);
                expect(
                    encoded
                ).to.be.eql([
                    Buffer.concat([
                        Buffer.alloc(helloLen.length, helloLen, "utf8"),
                        Buffer.alloc("hello ".length, "hello ", "utf8")
                    ]),
                    Buffer.concat([
                        Buffer.alloc(worldLen.length, worldLen, "utf8"),
                        Buffer.alloc("world".length, "world", "utf8")
                    ])
                ]);

                pull(
                    pull.values(encoded),
                    lp.decode({ maxLength: 1 }),
                    pull.collect((err) => {
                        expect(err).to.include({
                            message: "size longer than max permitted length of 1!"
                        });
                        done();
                    })
                );
            })
        );
    });

    it("push time based", (done) => {
        const p = new Pushable();
        const input = [];
        let i = 0;

        const push = function () {
            setTimeout(() => {
                const val = Buffer.from(`hello ${i}`);
                p.push(val);
                input.push(val);
                i++;

                if (i < 20) {
                    push();
                } else {
                    p.end();
                }
            }, 10);
        };
        push();

        pull(
            p,
            lp.encode(),
            lp.decode(),
            pull.collect((err, output) => {
                if (err) {
                    throw err;
                }
                expect(
                    input
                ).to.be.eql(
                    output
                );
                done();
            })
        );
    });

    it("invalid prefix", (done) => {
        const input = [
            Buffer.from("br34k mai h34rt")
        ];

        pull(
            // encode valid input
            pull.values(input),
            lp.encode(),
            // corrupt data
            pull.map((data) => data.slice(0, -6)),
            // attempt decode
            lp.decode(),
            pull.collect((err, output) => {
                expect(err).to.be.instanceof(Error);
                expect(output).to.deep.equal([]);
                done();
            })
        );
    });

    const sizes = [1, 2, 4, 6, 10, 100, 1000];

    sizes.forEach((size) => {
        it(`split packages to blocks: ${size}`, (done) => {
            const longBuffer = Buffer.alloc(size * 10);
            longBuffer.fill("a");

            const input = [
                Buffer.from("hello "),
                Buffer.from("world"),
                longBuffer
            ];

            pull(
                pull.values(input),
                lp.encode(),
                block(size, { nopad: true }),
                lp.decode(),
                pull.collect((err, res) => {
                    if (err) {
                        throw err;
                    }

                    expect(
                        res
                    ).to.be.eql([
                        Buffer.from("hello "),
                        Buffer.from("world"),
                        longBuffer
                    ]);
                    done();
                })
            );
        });
    });

    describe("back pressure", () => {
        const input = [];

        before(() => {
            for (let j = 0; j < 200; j++) {
                const a = [];
                for (let i = 0; i < 200; i++) {
                    a[i] = String(i);
                }

                input.push(Buffer.from(a.join("")));
            }
        });

        it("encode - slow in - fast out", (done) => {
            pull(
                pull.values(input),
                delay(10),
                lp.encode(),
                lp.decode(),
                pull.collect((err, res) => {
                    if (err) {
                        throw err;
                    }

                    expect(res).to.be.eql(input);

                    done();
                })
            );
        });

        it("decode - slow in - fast out", (done) => {
            pull(
                pull.values(input),
                lp.encode(),
                delay(10),
                lp.decode(),
                pull.collect((err, res) => {
                    if (err) {
                        throw err;
                    }

                    expect(res).to.be.eql(input);

                    done();
                })
            );
        });
    });

    describe("fixed", () => {
        describe("pull-length-prefixed", () => {
            it("basics", (done) => {
                const input = [
                    Buffer.from("hello "),
                    Buffer.from("world")
                ];
                const bytes = 4;

                pull(
                    pull.values(input),
                    lp.encode({ fixed: true, bytes }),
                    pull.collect((err, encoded) => {
                        if (err) {
                            throw err;
                        }

                        expect(
                            encoded
                        ).to.be.eql([
                            Buffer.concat([
                                Buffer.alloc(bytes, "00000006", "hex"),
                                Buffer.from("hello ")
                            ]),
                            Buffer.concat([
                                Buffer.alloc(bytes, "00000005", "hex"),
                                Buffer.from("world")
                            ])
                        ]);

                        pull(
                            pull.values(encoded),
                            lp.decode({ fixed: true, bytes }),
                            pull.collect((err, output) => {
                                if (err) {
                                    throw err;
                                }
                                expect(
                                    input
                                ).to.be.eql(
                                    output
                                );
                                done();
                            })
                        );
                    })
                );
            });

            it("max length", (done) => {
                const input = [
                    Buffer.from("hello "),
                    Buffer.from("world")
                ];

                const bytes = 4;

                pull(
                    pull.values(input),
                    lp.encode({ fixed: true, bytes }),
                    pull.collect((err, encoded) => {
                        if (err) {
                            throw err;
                        }

                        expect(
                            encoded
                        ).to.be.eql([
                            Buffer.concat([
                                Buffer.alloc(bytes, "00000006", "hex"),
                                Buffer.from("hello ")
                            ]),
                            Buffer.concat([
                                Buffer.alloc(bytes, "00000005", "hex"),
                                Buffer.from("world")
                            ])
                        ]);

                        pull(
                            pull.values(encoded),
                            lp.decode({ fixed: true, maxLength: 1 }),
                            pull.collect((err) => {
                                expect(err).to.include({
                                    message: "size longer than max permitted length of 1!"
                                });
                                done();
                            })
                        );
                    })
                );
            });
        });
    });

    describe("fromReader", () => {
        describe("pull-length-prefixed decodeFromReader", () => {
            it("basic", (done) => {
                const input = [
                    Buffer.from("haay wuurl!")
                ];

                const reader = Reader(1e3);

                // length-prefix encode input
                pull(
                    pull.values(input),
                    lp.encode(),
                    reader
                );

                // decode from reader
                lp.decodeFromReader(reader, (err, output) => {
                    if (err) {
                        throw err;
                    }
                    expect(
                        output
                    ).to.be.eql(
                        input[0]
                    );
                    done();
                });
            });

            it("empty input", (done) => {
                const input = [];

                const reader = Reader(1e3);

                // length-prefix encode input
                pull(
                    pull.values(input),
                    lp.encode(),
                    reader
                );

                // decode from reader
                lp.decodeFromReader(reader, (err, output) => {
                    expect(err).to.be.instanceof(Error);
                    expect(output).to.equal(undefined);
                    done();
                });
            });
        });
    });
});
