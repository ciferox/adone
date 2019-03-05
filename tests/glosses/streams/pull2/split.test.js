const {
    stream: { pull2: pull }
} = adone;
const { split } = pull;

describe("stream", "pull", "split", () => {
    it("read this file", (done) => {
        const fs = require("fs");
        const file = fs.readFileSync(__filename).toString();
        const lines = file.split("\n");
        let i = 0; const block = 300;

        pull(
            (end, cb) => {
                if (i > file.length) {
                    cb(true);
                } else {
                    const _i = i;
                    i += block;
                    cb(null, file.substring(_i, _i + block));
                }
            },
            split(),
            pull.collect((err, array) => {
                assert.equal(array.length, lines.length);
                assert.deepEqual(array, lines);
                done();
            })
        );
    });

    describe("json", () => {
        const input = [
            1, 2, { okay: true }, "whatever"
        ];

        it("split into json lines", (done) => {

            pull(
                pull.values([input.map(JSON.stringify).join("\n")]
                ),
                split(null, JSON.parse),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, input);
                    done();
                })
            );

        });

        it("split into json lines", (done) => {

            pull(
                pull.values([input.map((d) => {
                    return JSON.stringify(d, null, 2);
                }).join("\n\n")]
                ),
                split("\n\n", JSON.parse),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, input);
                    done();
                })
            );
        });


        it("split into json lines", (done) => {

            pull(
                pull.values([input.map((d) => {
                    return `${JSON.stringify(d, null, 2)}\n`;
                }).join("\n")]
                ),
                split("\n\n", JSON.parse),
                pull.collect((err, ary) => {
                    if (err) {
                        throw err;
                    }
                    assert.deepEqual(ary, input);
                    done();
                })
            );
        });
    });

    describe("reverse", () => {
        it("read this file", (done) => {

            const fs = require("fs");
            const file = fs.readFileSync(__filename).toString();
            const lines = file.split("\n").reverse();
            let i = file.length; const block = 300;

            pull(
                (end, cb) => {
                    if (i <= 0) {
                        cb(true);
                    } else {
                        let _i = i;
                        i -= block;
                        _i = Math.max(_i, 0);
                        const line = file.substring(_i - block, _i);
                        cb(null, line);
                    }
                },
                split("\n", null, true),
                pull.collect((err, array) => {
                    assert.equal(array.length, lines.length);
                    assert.deepEqual(array, lines);
                    done();
                })
            );
        });
    });

    describe("skip last", () => {
        it("read this file", (done) => {

            const fs = require("fs");
            const file = fs.readFileSync(__filename).toString();
            const lines = file.split("\n");
            assert.equal(lines.pop(), "");
            let i = 0; const block = 300;

            pull(
                (end, cb) => {
                    if (i > file.length) {
                        cb(true);
                    } else {
                        const _i = i;
                        i += block;
                        cb(null, file.substring(_i, _i + block));
                    }
                },
                split(null, null, null, true),
                pull.collect((err, array) => {
                    assert.equal(array.length, lines.length);
                    assert.deepEqual(array, lines);
                    done();
                })
            );
        });
    });
});
