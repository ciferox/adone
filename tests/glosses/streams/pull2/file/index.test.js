const {
    stream: { pull2: pull },
    std: { fs, path, crypto }
} = adone;
const { file: File } = pull;

describe("stream", "pull", "file", () => {
    describe("append", () => {
        it("append to a file", (done) => {
            const filename = `/tmp/test_pull-file_append${Date.now()}`;

            let n = 10; let r = 0; let ended = false;
            (function next() {
                --n;
                fs.appendFile(filename, `${Date.now()}\n`, (err) => {
                    if (err) {
                        throw err;
                    }

                    if (n) {
                        setTimeout(next, 20);
                    } else {
                        ended = true;
                    }
                });
            })();

            pull(
                File(filename, { live: true }),
                pull.through((chunk) => {
                    r++;
                    assert.notEqual(chunk.length, 0);
                }),
                pull.take(10),
                pull.drain(null, (err) => {
                    if (err) {
                        throw err;
                    }
                    assert.equal(n, 0, "writes");
                    assert.equal(r, 10, "reads");
                    done();
                })
            );
        });
    });

    describe("fd", () => {
        const asset = (file) => path.join(__dirname, "assets", file);

        const all = function (stream, cb) {
            pull(stream, pull.collect((err, ary) => {
                cb(err, Buffer.concat(ary));
            }));
        };

        it("can read a file with a provided fd", (done) => {

            const fd = fs.openSync(asset("ipsum.txt"), "r");

            all(File(null, { fd }), (err, buf) => {
                if (err) {
                    throw err;
                }
                assert.ok(buf);
                done();
            });

        });


        it("two files can read from one fd if autoClose is disabled", (done) => {
            const fd = fs.openSync(asset("ipsum.txt"), "r");

            all(File(null, { fd, autoClose: false }), (err, buf1) => {
                if (err) {
                    throw err;
                }
                assert.ok(buf1);
                all(File(null, { fd, autoClose: false }), (err, buf2) => {
                    if (err) {
                        throw err;
                    }
                    assert.ok(buf2);
                    assert.equal(buf1.toString(), buf2.toString());
                    fs.close(fd, (err) => {
                        if (err) {
                            throw err;
                        }
                        done();
                    });
                });
            });
        });
    });

    describe("large file", () => {
        const osenv = require("osenv");

        const tmpfile = path.join(osenv.tmpdir(), "test_pull-file_big");

        const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");

        it("large file", (done) => {
            const big = crypto.pseudoRandomBytes(10 * 1024 * 1024);
            fs.writeFileSync(tmpfile, big);

            pull(
                File(tmpfile),
                pull.collect((err, items) => {
                    assert.equal(hash(big), hash(Buffer.concat(items)));
                    done();
                })
            );
        });


        it("large file as ascii strings", (done) => {
            const big = crypto.pseudoRandomBytes(10 * 1024 * 1024).toString("base64");
            fs.writeFileSync(tmpfile, big, "ascii");

            pull(
                File(tmpfile, { encoding: "ascii" }),
                pull.through((str) => {
                    assert.equal(typeof str, "string");
                }),
                pull.collect((err, items) => {
                    assert.equal(hash(big), hash(items.join("")));
                    done();
                })
            );
        });
    });

    describe("partial", () => {
        const cont = require("cont");
        const osenv = require("osenv");

        const tmpfile = path.join(osenv.tmpdir(), "test_pull-file_big");

        const big = crypto.pseudoRandomBytes(10 * 1024 * 1024);
        fs.writeFileSync(tmpfile, big);

        const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
        const asset = (file) => path.join(__dirname, "assets", file);

        const MB = 1024 * 1024;

        it("read files partially", (done) => {
            const test = function (file, start, end) {
                return function (cb) {
                    const opts = { start, end };
                    let expected;
                    const _expected = fs.readFileSync(file, opts);

                    expected = _expected
                        .slice(
                            start || 0,
                            end || _expected.length
                        );

                    pull(
                        File(file, opts),
                        pull.collect((err, ary) => {
                            const actual = Buffer.concat(ary);
                            assert.equal(actual.length, expected.length);
                            assert.equal(hash(actual), hash(expected));
                            cb();
                        })
                    );
                };
            };

            cont.para([
                test(tmpfile, 0, 9 * MB),
                test(tmpfile, 5 * MB, 10 * MB),
                test(tmpfile, 5 * MB, 6 * MB),
                test(asset("ipsum.txt")),
                test(asset("test.txt"), 1, 4)
            ])((err) => {
                done();
            });

        });
    });

    describe("small", () => {
        it("small text", (done) => {
            pull(
                File(path.resolve(__dirname, "assets", "test.txt")),
                pull.map((data) => {
                    return data.toString();
                }),
                pull.collect((err, items) => {
                    assert.equal(items.join(""), "hello");
                    done();
                })
            );
        });

        it("buffer size respected", (done) => {
            const expected = ["he", "ll", "o"];

            expect(3).checks(done);

            pull(
                File(path.resolve(__dirname, "assets", "test.txt"), { bufferSize: 2 }),
                pull.drain((data) => {
                    expect(data.toString()).to.equal(expected.shift()).mark();
                })
            );
        });
    });

    describe("terminate read", () => {
        const ipsum = path.resolve(__dirname, "assets", "ipsum.txt");
        const au = path.resolve(__dirname, "assets", "AU.txt");

        it("can terminate read process", (done) => {

            const expected = [
                "Lorem ipsum dolor sit amet, consectetur ",
                "adipiscing elit. Quisque quis tortor eli",
                "t. Donec vulputate lacus at posuere soda",
                "les. Suspendisse cursus, turpis eget dap"
            ];

            pull(
                File(ipsum, { bufferSize: 40 }),
                pull.take(expected.length),
                pull.drain((data) => {
                    assert.equal(data.toString(), expected.shift(), "line ok in drain");
                }, (err) => {
                    if (err) {
                        throw err;
                    }
                    done();
                })
            );
        });

        it("can terminate file immediately (before open)", (done) => {
            const source = File(ipsum);
            let sync = false;
            source(true, (end) => {
                sync = true;
                assert.equal(end, true);
            });
            assert.ok(sync);
            done();

        });

        it("can terminate file immediately (after open)", (done) => {

            const source = File(ipsum);
            let sync1 = false; let sync2 = false;
            expect(6).checks(done);
            source(null, (end, data) => {
                if (sync1) {
                    throw new Error("read1 called twice");
                }
                sync1 = true;
                expect(end).to.equal(true).mark();
                expect(data).to.not.ok.mark();
            });
            source(true, (end) => {
                if (sync2) {
                    throw new Error("read2 called twice");

                }
                sync2 = true;
                expect(sync1).to.be.ok.mark();
                expect(end).to.equal(true).mark();
                // done();
            });
            expect(sync1).to.not.ok.mark();
            expect(sync2).to.not.ok.mark();
        });

        it("can terminate file during a read", (done) => {

            const source = File(ipsum, { bufferSize: 1024 });
            let sync1 = false; let sync2 = false;
            source(null, (end, data) => {
                assert.equal(end, null);
                assert.ok(data);
                source(null, (end, data) => {
                    sync1 = true;
                    assert.equal(end, true);
                    assert.notOk(data, "data can't have been read");
                });
                source(true, (end) => {
                    sync2 = true;
                    assert.equal(end, true, "valid abort end");
                    assert.ok(sync1, "read called back first");
                    done();
                });
                assert.notOk(sync1);
                assert.notOk(sync2);
            });

        });

        //usually the read succeeds before the close does,
        //but not always

        it("after 10k times, cb order is always correct", (done) => {

            let C = 0; let R = 0; let T = 0;
            (function next() {
                T++;

                if (T > 10000) {
                    assert.equal(R, 10000);
                    assert.equal(C, 0);
                    assert.equal(R + C, 10000);
                    // console.log(C, R, T);
                    return done();
                }

                const fd = fs.openSync(__filename, "r+", 0o666);
                let data; let closed;

                //create a file stream with a fixed fd,
                //configured to automatically close (as by default)
                const source = File(null, { fd });

                //read.
                source(null, (err, _data) => {
                    data = true;
                    if (!closed) {
                        R++;

                    }
                    if (data && closed) {
                        next();

                    }
                });

                //abort.
                source(true, (err) => {
                    closed = true;
                    if (!data) {
                        C++;

                    }
                    if (data && closed) {
                        next();

                    }
                });
            })();
        });
    });
});
