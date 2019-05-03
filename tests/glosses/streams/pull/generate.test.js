const {
    is,
    stream: { pull }
    // std: { fs, path, crypto }
} = adone;
const { generate } = pull;

// const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "streams", "pull", ...args);

// const sources = require("pull-stream/sources");
// const sinks = require("pull-stream/sinks");

// const pipeableSource = pull.pipeableSource;
// const pipeable = pull.pipeable;
// const pipeableSink = pull.pipeableSink;

const arrayReader = function (read, cb) {
    const array = [];
    read(null, function next(end, data) {

        if (end) {
            return cb(end === true ? null : end, array);
        }

        array.push(data);
        read(null, next);
    });
};

describe("stream", "pull", "generate", () => {
    it("basics", (done) => {
        const read = generate(1, (state, cb) => {
            cb(state > 3 ? true : null, state, state + 1);
        });
        read(null, (e, d) => {
            assert.ok(is.nil(e), "nullish");
            assert.equal(d, 1);
            read(null, (e, d) => {
                assert.ok(is.nil(e), "nullish");
                assert.equal(d, 2);
                read(null, (e, d) => {
                    assert.ok(is.nil(e), "nullish");
                    assert.equal(d, 3);
                    read(null, (e, d) => {
                        assert.equal(e, true);
                        assert.ok(is.nil(d), "nullish");
                        done();
                    });
                });
            });
        });
    });

    it("generate", (done) => {
        const array = [1, 2, 3];
        const read = generate(1, (state, cb) => {
            cb(state > 3 ? true : null, state, state + 1);
        });
        arrayReader(read, (err, _array) => {
            // console.log("END?");
            assert.deepEqual(_array, array);
            done();
        });
    });

    it.todo("pipe", (done) => {
        const array = [1, 2, 3];
        const read = pipeableSource(generate)(1, (state, cb) => {
            cb(state > 3 ? true : null, state, state + 1);
        });

        assert.equal("function", typeof read);
        assert.equal("function", typeof read.pipe);

        read.pipe(pipeableSink(arrayReader)((err, _array) => {
            assert.equal(err, null);
            assert.deepEqual(_array, array);
            done();
        }));
    });

    it.todo("pipe2", (done) => {
        const array = [1, 2, 3];
        const read = pipeableSource(generate)(1, (state, cb) => {
            cb(state > 3 ? true : null, state, state + 1);
        });
        arrayWriter = pull.writeArray;

        assert.equal("function", typeof read);
        assert.equal("function", typeof read.pipe);

        read
            .pipe((read) => {
                return function (end, cb) {
                    read(end, (end, data) => {
                        // console.log(end, data);
                        cb(end, !is.nil(data) ? data * 2 : null);
                    });
                };
            })
            .pipe(arrayWriter((err, _array) => {
                // console.log(_array);
                assert.equal(err, null);
                assert.deepEqual(_array, array.map((e) => {
                    return e * 2;
                }));
                done();
            }));

    });

    it("passes expand err downstream", (done) => {
        const err = new Error("boom"); let endErr;
        let onEndCount = 0;
        const read = generate(1, (state, cb) => {
            cb(state > 3 ? err : null, state, state + 1);
        }, (endErr) => {
            // console.log("onEnd");
            onEndCount++;
            assert.equal(endErr, err);
            assert.equal(onEndCount, 1);
            process.nextTick(() => {
                done();
            });
        });
        read(null, (e, d) => {
            assert.ok(is.nil(e), "nullish");
            assert.equal(d, 1);
            read(null, (e, d) => {
                assert.ok(is.nil(e), "nullish");
                assert.equal(d, 2);
                read(null, (e, d) => {
                    assert.ok(is.nil(e), "nullish");
                    assert.equal(d, 3);
                    read(null, (e, d) => {
                        assert.equal(e, err);
                        assert.ok(is.nil(d), "nullish");
                        read(null, (e, d) => {
                            // console.log("end");
                            assert.equal(e, err);
                            assert.ok(is.nil(d), "nullish");
                        });
                    });
                });
            });
        });
    });
});
