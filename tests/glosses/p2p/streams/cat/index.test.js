const {
    p2p: { stream: { pull, cat, pushable: Pushable, abortable: Abortable } }
} = adone;

describe("pull", "cat", () => {
    it("cat", (done) => {
        pull(
            cat([pull.values([1, 2, 3]), pull.values([4, 5, 6])]),
            pull.collect((err, ary) => {
                console.log(err, ary);
                assert.notOk(err);
                assert.deepEqual(ary, [1, 2, 3, 4, 5, 6]);
                done();
            })
        );
    });

    it("cat - with empty", (done) => {
        pull(
            cat([pull.values([1, 2, 3]), null, pull.values([4, 5, 6])]),
            pull.collect((err, ary) => {
                console.log(err, ary);
                assert.notOk(err);
                assert.deepEqual(ary, [1, 2, 3, 4, 5, 6]);
                done();
            })
        );
    });

    it("cat - with empty stream", (done) => {
        let ended = false;
        const justEnd = function (err, cb) {
            ended = true; cb(true);
        };

        pull(
            cat([pull.values([1, 2, 3]), justEnd, pull.values([4, 5, 6])]),
            pull.collect((err, ary) => {
                console.log(err, ary);
                assert.ok(ended);
                assert.notOk(err);
                assert.deepEqual(ary, [1, 2, 3, 4, 5, 6]);
                done();
            })
        );
    });



    it("abort - with empty", (done) => {
        pull(
            cat([pull.values([1, 2, 3]), null, pull.values([4, 5, 6])]),
            (read) => {
                read(true, (err) => {
                    assert.equal(err, true);
                    done();
                });
            }
        );
    });

    it("error", (done) => {
        const err = new Error("test error");
        pull(
            cat([pull.values([1, 2, 3]), function (_, cb) {
                cb(err);
            }]),
            pull.collect((_err) => {
                console.log("COLLECT END", _err);
                assert.equal(_err, err);
                done();
            })
        );
    });

    it("abort stalled", (done) => {
        const err = new Error("intentional"); let n = 2;
        const abortable = Abortable();
        const pushable = Pushable((_err) => {
            assert.equal(_err, err);
            next();
        });

        pushable.push(4);

        pull(
            cat([pull.values([1, 2, 3]), undefined, pushable]),
            abortable,
            pull.drain((item) => {
                if (item == 4) {
                    process.nextTick(() => {
                        abortable.abort(err);
                    });
                }
            }, (err) => {
                next();
            })
        );

        function next() {
            if (--n) {
                return;
            }
            done();
        }
    });

    it("abort empty", (done) => {
        cat([])(true, (end) => {
            assert.equal(end, true);
            done();
        });
    });

    it("error + undefined", (done) => {
        const err = new Error("test error");
        pull(
            cat([pull.values([1, 2, 3]), function (_, cb) {
                cb(err);
            }, undefined]),
            pull.collect((_err) => {
                assert.equal(_err, err);
                done();
            })
        );
    });

    it("take cat", (done) => {
        pull(
            cat([
                pull(pull.values([1, 2, 3]), pull.take(2)),
                pull(pull.values([8, 7, 6, 5]), pull.take(3))
            ]),
            pull.collect((err, data) => {
                assert.notExists(err);
                assert.deepEqual(data, [1, 2, 8, 7, 6]);
                done();
            })
        );
    });

    it("abort streams after error", (done) => {
        const err = new Error("test error");
        let aborted = false;
        pull(
            cat([pull.values([1, 2, 3]), function (_, cb) {
                cb(err);
            }, function (_err, cb) {
                //this stream should be aborted.
                aborted = true;
                assert.strictEqual(_err, err);
                cb();
            }]),
            pull.collect((_err) => {
                assert.equal(aborted, true);
                assert.equal(_err, err);
                done();
            })
        );
    });
});
