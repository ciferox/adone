describe("stream", "pull", "block", () => {
    const { stream: { pull }, std: { fs }, is } = adone;
    const { block, file } = pull;

    describe("basic", () => {
        it("basic test", (done) => {
            let totalBytes = 0;
            const stat = fs.statSync(__filename);

            pull(
                file(__filename),
                block(16),
                pull.through((c) => {
                    assert.equal(c.length, 16, "chunks should be 16 bytes long");
                    assert.ok(is.buffer(c), "chunks should be buffer objects");
                    totalBytes += c.length;
                }),
                pull.onEnd((err) => {
                    if (err) {
                        done(err);
                        return;
                    }
                    const expectedBytes = stat.size + (16 - stat.size % 16);
                    assert.equal(totalBytes, expectedBytes, "Should be multiple of 16");
                    done();
                })
            );
        });
    });

    describe("empty", () => {
        it("does not emit on empty buffers", (done) => {
            pull(
                pull.values([
                    Buffer.alloc(0),
                    Buffer.alloc(0),
                    Buffer.alloc(0)
                ]),
                block(),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 0);
                    done();
                })
            );
        });

        it("respects noEmpty option and nopad on empty stream", (done) => {
            pull(
                pull.empty(),
                block({ emitEmpty: true, nopad: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 0);
                    done();
                })
            );
        });

        it("respects noEmpty option and nopad on empty buffers", (done) => {
            pull(
                pull.values([
                    Buffer.alloc(0),
                    Buffer.alloc(0),
                    Buffer.alloc(0)
                ]),
                block({ emitEmpty: true, nopad: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 0);
                    done();
                })
            );
        });

        it("respects noEmpty option on empty stream", (done) => {
            pull(
                pull.empty(),
                block({ emitEmpty: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 512);
                    assert.deepEqual(buffers[0], Buffer.alloc(512));
                    done();
                })
            );
        });

        it("respects noEmpty option on empty buffers", (done) => {
            pull(
                pull.values([
                    Buffer.alloc(0),
                    Buffer.alloc(0),
                    Buffer.alloc(0)
                ]),
                block({ emitEmpty: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 512);
                    assert.deepEqual(buffers[0], Buffer.alloc(512));
                    done();
                })
            );
        });

        it("does not emit extra buffer if noEmpty and nopad is present", (done) => {
            pull(
                pull.values([
                    Buffer.alloc(0),
                    Buffer.from("hey"),
                    Buffer.alloc(0)
                ]),
                block({ emitEmpty: true, nopad: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 3);
                    done();
                })
            );
        });

        it("does not emit extra buffer if noEmpty is present", (done) => {
            pull(
                pull.values([
                    Buffer.alloc(0),
                    Buffer.from("hey"),
                    Buffer.alloc(0)
                ]),
                block({ emitEmpty: true }),
                pull.collect((err, buffers) => {
                    assert.equal(buffers.length, 1);
                    assert.equal(buffers[0].length, 512);
                    assert.deepEqual(buffers[0], Buffer.concat([Buffer.from("hey"), Buffer.alloc(512 - 3)]));
                    done();
                })
            );
        });
    });

    describe("nopad through", () => {
        const blockSizes = [16];//, 25]//, 1024]
        const writeSizes = [4, 15, 16, 17, 64];//, 64, 100]
        const writeCounts = [1, 10];//, 100]

        writeCounts.forEach((writeCount) => {
            blockSizes.forEach((blockSize) => {
                writeSizes.forEach((writeSize) => {
                    it(`writeSize=${writeSize} blockSize=${blockSize} writeCount=${writeCount}`, (done) => {
                        let actualChunks = 0;
                        let actualBytes = 0;
                        let timeouts = 0;

                        const input = [];
                        for (let i = 0; i < writeCount; i++) {
                            const a = Buffer.alloc(writeSize);
                            let j;
                            for (j = 0; j < writeSize; j++) {
                                a[j] = "a".charCodeAt(0);
                            }
                            const b = Buffer.alloc(writeSize);
                            for (j = 0; j < writeSize; j++) {
                                b[j] = "b".charCodeAt(0);

                            }

                            input.push(a);
                            input.push(b);
                        }

                        pull(
                            pull.values(input),
                            block(blockSize, { nopad: true }),
                            pull.through((c) => {
                                timeouts++;

                                actualChunks++;
                                actualBytes += c.length;

                                // make sure that no data gets corrupted, and basic sanity
                                const before = c.toString();
                                // simulate a slow write operation
                                setTimeout(() => {
                                    timeouts--;

                                    const after = c.toString();
                                    assert.equal(after, before, "should not change data");

                                    // now corrupt it, to find leaks.
                                    for (let i = 0; i < c.length; i++) {
                                        c[i] = "x".charCodeAt(0);
                                    }
                                }, 100);
                            }),
                            pull.onEnd((err) => {
                                if (err) {
                                    return done(err);
                                }
                                // round up to the nearest block size
                                const expectChunks = Math.ceil(writeSize * writeCount * 2 / blockSize);
                                const expectBytes = writeSize * writeCount * 2;
                                assert.equal(actualBytes, expectBytes, `bytes=${expectBytes} writeSize=${writeSize}`);
                                assert.equal(actualChunks, expectChunks, `chunks=${expectChunks} writeSize=${writeSize}`);

                                // wait for all the timeout checks to finish, then end the test
                                setTimeout(function WAIT() {
                                    if (timeouts > 0) {
                                        return setTimeout(WAIT);

                                    }
                                    done();
                                }, 100);
                            })
                        );
                    });
                });
            });
        });
    });

    describe("nopad", () => {
        it("don't pad, small writes", (done) => {
            pull(
                pull.values([
                    Buffer.from("a"),
                    Buffer.from("b"),
                    Buffer.from("c")
                ]),
                block(16, { nopad: true }),
                pull.through((c) => {
                    assert.equal(c.toString(), "abc", "should get 'abc'");
                }),
                pull.onEnd((err) => {
                    done();
                })
            );
        });

        it("don't pad, exact write", (done) => {
            let first = true;

            pull(
                pull.values([
                    Buffer.from("abcdefghijklmnop")
                ]),
                block(16, { nopad: true }),
                pull.through((c) => {
                    if (first) {
                        first = false;
                        assert.equal(c.toString(), "abcdefghijklmnop", "first chunk");
                    } else {
                        assert.fail();
                    }
                }),
                pull.onEnd((err) => {
                    done();
                })
            );
        });

        it("don't pad, big write", (done) => {
            let first = true;

            pull(
                pull.values([
                    Buffer.from("abcdefghijklmnopq")
                ]),
                block(16, { nopad: true }),
                pull.through((c) => {
                    if (first) {
                        first = false;
                        assert.equal(c.toString(), "abcdefghijklmnop", "first chunk");
                    } else {
                        assert.equal(c.toString(), "q");
                    }
                }),
                pull.onEnd((err) => {
                    done();
                })
            );
        });
    });

    describe("through", () => {

        const blockSizes = [16, 25, 1024];
        const writeSizes = [4, 15, 16, 17, 64, 64, 100];
        const writeCounts = [1, 10];//, 100]

        writeCounts.forEach((writeCount) => {
            blockSizes.forEach((blockSize) => {
                writeSizes.forEach((writeSize) => {
                    it(`writeSize=${writeSize} blockSize=${blockSize} writeCount=${writeCount}`, (done) => {
                        let actualChunks = 0;
                        let actualBytes = 0;
                        let timeouts = 0;

                        const input = [];
                        for (let i = 0; i < writeCount; i++) {
                            const a = Buffer.alloc(writeSize);
                            let j;
                            for (j = 0; j < writeSize; j++) {
                                a[j] = "a".charCodeAt(0);

                            }
                            const b = Buffer.alloc(writeSize);
                            for (j = 0; j < writeSize; j++) {
                                b[j] = "b".charCodeAt(0);

                            }
                            input.push(a);
                            input.push(b);
                        }

                        pull(
                            pull.values(input),
                            block(blockSize),
                            pull.through((c) => {
                                timeouts++;

                                actualChunks++;
                                actualBytes += c.length;

                                // make sure that no data gets corrupted, and basic sanity
                                const before = c.toString();
                                // simulate a slow write operation
                                setTimeout(() => {
                                    timeouts--;

                                    const after = c.toString();
                                    assert.equal(after, before, "should not change data");

                                    // now corrupt it, to find leaks.
                                    for (let i = 0; i < c.length; i++) {
                                        c[i] = "x".charCodeAt(0);
                                    }
                                }, 100);
                            }),
                            pull.onEnd((err) => {
                                if (err) {
                                    return done(err);
                                }
                                // round up to the nearest block size
                                const expectChunks = Math.ceil(writeSize * writeCount * 2 / blockSize);
                                const expectBytes = expectChunks * blockSize;
                                assert.equal(actualBytes, expectBytes, `bytes=${expectBytes} writeSize=${writeSize}`);
                                assert.equal(actualChunks, expectChunks, `chunks=${expectChunks} writeSize=${writeSize}`);

                                // wait for all the timeout checks to finish, then end the test
                                setTimeout(function WAIT() {
                                    if (timeouts > 0) {
                                        return setTimeout(WAIT);

                                    }
                                    done();
                                }, 100);
                            })
                        );
                    });
                });
            });
        });
    });
});
