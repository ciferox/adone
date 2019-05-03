const {
    is,
    stream: { pull },
    std: { crypto }
} = adone;
const { hang, reader: Reader } = pull;

const randomlySplit = function (min, max) {
    min = min || 1;
    max = max || Infinity;
    let buffer = Buffer.alloc(0);
    let ended;
    const bite = function () {
        const offset = min + ~~(Math.random() * Math.min(max - min, buffer.length));
        const data = buffer.slice(0, offset);
        buffer = buffer.slice(offset);
        return data;
    };

    return function (read) {
        return function (abort, cb) {
            if (abort) {
                return read(abort, cb);
            }
            if (buffer.length) {
                return cb(null, bite());
            }
            if (ended) {
                return cb(ended);
            }

            read(null, (end, data) => {
                if (is.string(data)) {
                    data = Buffer.from(data);
                }

                if (end) {
                    ended = end;
                    if (buffer.length) {
                        return cb(null, bite());
                    }
                    return cb(ended);
                }
                //copy twice, this isn't efficient,
                //but this is just for testing.
                if (buffer) {
                    buffer = Buffer.concat([buffer, data]);
                } else {
                    buffer = data;
                }

                cb(null, bite());
            });
        };
    };
};

const bytes = crypto.randomBytes(64);

describe("stream", "pull", "reader", () => {
    it("read once a stream", (done) => {

        const reader = Reader();

        pull(
            pull.values([bytes]),
            randomlySplit(),
            reader
        );

        reader.read(32, (err, data) => {
            assert.notOk(err);
            assert.deepEqual(data, bytes.slice(0, 32));
            done();
        });

    });

    it("read twice from a stream", (done) => {

        const reader = Reader();

        pull(
            pull.values([bytes]),
            randomlySplit(),
            reader
        );

        reader.read(32, (err, data) => {

            // console.log("read1", err, data);
            assert.notOk(err);
            assert.deepEqual(data, bytes.slice(0, 32));

            reader.read(16, (err, data) => {
                // console.log("read2");
                assert.notOk(err);
                assert.deepEqual(data, bytes.slice(32, 48));
                done();
            });
        });

    });

    it("read whatever is there", (done) => {

        const reader = Reader();

        pull(
            pull.values([bytes]),
            randomlySplit(),
            reader
        );

        reader.read(null, (err, data) => {
            assert.notOk(err);
            // console.log(data);
            assert.ok(data.length > 0);
            done();
        });

    });

    it("read a stream", (done) => {

        const reader = Reader();

        pull(
            pull.values([bytes]),
            randomlySplit(),
            reader
        );

        pull(
            reader.read(),
            pull.collect((err, data) => {
                assert.notOk(err);
                const _data = Buffer.concat(data);
                assert.equal(_data.length, bytes.length);
                assert.deepEqual(_data, bytes);
                done();
            })
        );

    });

    it("async read", (done) => {

        const reader = Reader();

        pull(
            pull.values([Buffer.from("hello there")]),
            reader
        );

        setTimeout(() => {
            reader.read(6, (err, hello_) => {
                setTimeout(() => {
                    reader.read(5, (err, there) => {
                        if (err) {
                            throw new Error("unexpected end");
                        }
                        assert.deepEqual(Buffer.concat([hello_, there]).toString(), "hello there");
                        done();
                    });
                });
            });
        });

    });

    it("abort the stream", (done) => {

        const reader = Reader();

        pull(
            hang((err) => {
                done();
            }),
            reader
        );

        reader.abort();

    });


    it("abort the stream and a read", (done) => {
        const reader = Reader();
        const err = new Error("intended");

        pull(
            hang((err) => {
                done();
            }),
            reader
        );

        reader.read(32, (_err) => {
            assert.equal(_err, err);
        });
        reader.read(32, (_err) => {
            assert.equal(_err, err);
        });
        reader.read(32, (_err) => {
            assert.equal(_err, err);
        });

        reader.abort(err, (_err) => {
            assert.equal(_err, err);
        });

    });

    it("if streaming, the stream should abort", (done) => {

        const reader = Reader();
        const err = new Error("intended");

        pull(hang(), reader);

        pull(
            reader.read(),
            pull.collect((_err) => {
                assert.equal(_err, err);
                done();
            })
        );

        reader.abort(err);

    });

    it("abort stream once in streaming mode", (done) => {

        const reader = Reader();

        pull(hang(), reader);

        const read = reader.read();

        read(true, (err) => {
            assert.ok(err);
            done();
        });

    });


    it("configurable timeout", (done) => {

        const reader = Reader(100);
        const start = Date.now();
        pull(hang(), reader);

        pull(
            reader.read(),
            pull.collect((err) => {
                assert.ok(err);
                assert.ok(Date.now() < start + 300);
                done();
            })
        );

    });


    it("timeout does not apply to the rest of the stream", (done) => {
        const reader = Reader(100);
        let once = false;
        pull(
            (abort, cb) => {
                if (!once) {
                    setTimeout(() => {
                        once = true;
                        cb(null, Buffer.from("hello world"));
                    }, 200);
                } else {
                    cb(true);
                }
            },
            reader
        );

        pull(
            reader.read(),
            pull.collect((err, ary) => {
                assert.notOk(err);
                assert.equal(Buffer.concat(ary).toString(), "hello world");
                done();
            })
        );
    });


    it("overreading results in an error", (done) => {
        const corruptedBytes = crypto.randomBytes(10);
        const reader = Reader(20e3);
        pull(
            pull.values([corruptedBytes]),
            reader
        );

        reader.read(11, (_err) => {
            assert.ok(_err);
            done();
        });
    });


    it("overreading with multiple reads results in an error", (done) => {
        const corruptedBytes = crypto.randomBytes(10);
        const reader = Reader();
        pull(
            pull.values([corruptedBytes]),
            reader
        );

        reader.read(1, (err) => {
            assert.notOk(err);
            reader.read(100, (_err) => {
                assert.ok(_err);
                done();
            });
        });
    });

    describe("state", () => {
        const srcPath = (...args) => adone.getPath("lib", "glosses", "streams", "pull", ...args);
        const State = require(srcPath("reader", "state"));

        it("read everything", (done) => {

            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes.slice(0, 32));
            assert.ok(state.has(1));
            assert.ok(state.has(32));
            assert.notOk(state.has(33));
            state.add(bytes.slice(32, 64));

            assert.deepEqual(state.get(64), bytes);
            done();
        });


        it("read overlapping sections", (done) => {
            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes);
            assert.ok(state.has(1));

            assert.deepEqual(state.get(48), bytes.slice(0, 48));
            assert.deepEqual(state.get(16), bytes.slice(48, 64));
            done();

        });

        it("read multiple sections", (done) => {
            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes);
            assert.ok(state.has(1));

            assert.deepEqual(state.get(20), bytes.slice(0, 20));
            assert.deepEqual(state.get(16), bytes.slice(20, 36));
            assert.deepEqual(state.get(28), bytes.slice(36, 64));
            done();
        });

        it("read overlaping sections", (done) => {
            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes.slice(0, 32));
            state.add(bytes.slice(32, 64));
            assert.ok(state.has(1));

            assert.deepEqual(state.get(31), bytes.slice(0, 31));
            assert.deepEqual(state.get(33), bytes.slice(31, 64));
            done();
        });

        it("read overlaping sections", (done) => {
            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes.slice(0, 32));
            state.add(bytes.slice(32, 64));
            assert.ok(state.has(1));

            assert.deepEqual(state.get(33), bytes.slice(0, 33));
            assert.deepEqual(state.get(31), bytes.slice(33, 64));
            done();
        });




        it("get whatever is left", (done) => {
            const state = State();
            assert.notOk(state.has(1));
            state.add(bytes);
            assert.ok(state.has(bytes.length));
            const b = state.get();
            assert.deepEqual(b, bytes);
            done();
        });
    });
});

