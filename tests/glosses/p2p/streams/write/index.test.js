const {
    is,
    p2p: { stream: { pull, write: createWrite, cat } }
} = adone;

describe("pull", "write", () => {
    it("simple", (done) => {
        let output = [];

        pull(
            pull.count(3),
            createWrite(function write(data, cb) {
                output = output.concat(data);
                cb();
            }, null, 10, (err) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(output, [0, 1, 2, 3]);
                done();
            })
        );
    });

    it("error", (done) => {
        const err = new Error("read error test");
        pull(
            pull.error(err),
            createWrite(() => {
                throw new Error("should never happen");
            },
                null, 10, (_err) => {
                    assert.strictEqual(_err, err);
                    done();
                })
        );
    });

    it("write error", (done) => {
        expect(2).checks(done);
        const err = new Error("write error test");
        pull(
            pull.values([1], (_err) => {
                assert.strictEqual(_err, err);
                expect(true).to.be.true.mark();
            }),
            createWrite((_, cb) => {
                cb(err);
            }, null, 10, (_err) => {
                assert.strictEqual(_err, err);
                expect(true).to.be.true.mark();
            })
        );
    });

    it("end then write error", (done) => {
        const err = new Error("write error test");
        pull(
            pull.values([1]),
            createWrite((_, cb) => {
                setImmediate(() => {
                    cb(err);
                });
            }, null, 10, (_err) => {
                assert.strictEqual(_err, err);
                done();
            })
        );
    });

    it("simple, async", (done) => {

        let output = [];

        pull(
            pull.count(3),
            createWrite(function write(data, cb) {
                setImmediate(() => {
                    output = output.concat(data); cb();
                });
            }, null, 10, (err) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(output, [0, 1, 2, 3]);
                done();
            })
        );
    });

    it("read then error", (done) => {
        const err = new Error("read test error");
        let output = [];
        pull(
            cat([pull.count(3), pull.error(err)]),
            createWrite(function write(data, cb) {
                console.log("write", data);
                setImmediate(() => {
                    output = output.concat(data); cb();
                });
            }, null, 10, (_err) => {
                console.log("ended");
                assert.strictEqual(_err, err);
                assert.deepEqual(output, [0]);
                done();
            })
        );
    });


    it("read to max", (done) => {
        let output = [];
        pull(
            pull.count(30),
            createWrite(function write(data, cb) {
                setImmediate(() => {
                    output = output.concat(data); cb();
                });
            }, null, 10, (err) => {
                assert.notOk(err);
                assert.equal(output.length, 31);
                done();
            })
        );
    });

    it("sometimes reduce to null", (done) => {
        let output = [];
        pull(
            pull.count(30),
            createWrite(function write(data, cb) {
                if (is.nil(data)) {
                    throw new Error("data cannot be null");
                }
                setImmediate(() => {
                    output = output.concat(data); cb();
                });
            }, (a, b) => {
                if (!(b % 2)) {
                    return a;
                }
                return (a || []).concat(b);
            }, 10, (err) => {
                assert.notOk(err);
                assert.deepEqual(output, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
                done();
            })
        );

    });


    it("abort", (done) => {
        let output = []; const writer = createWrite(function write(data, cb) {
            if (is.nil(data)) {
                throw new Error("data cannot be null");
            }
            setImmediate(() => {
                output = output.concat(data); cb();
            });
        }, (a, b) => {
            if (!(b % 2)) {
                return a;
            }
            return (a || []).concat(b);
        }, 10, (err) => {
            assert.ok(err);
        });
        pull(
            pull.count(30),
            writer
        );

        writer.abort((err) => {
            assert.notOk(err);
            done();
        });

    });

    it("abort", (done) => {
        let output = [];
        const writer = createWrite(function write(data, cb) {
            if (is.nil(data)) {
                throw new Error("data cannot be null");
            }
            setImmediate(() => {
                output = output.concat(data);
                cb();
            });
        }, (a, b) => {
            if (!(b % 2)) {
                return a;
            }
            return (a || []).concat(b);
        }, 10, (err) => {
            assert.ok(err);
        });

        writer.abort((err) => {
            assert.notOk(err);
            done();
        });

        pull(
            pull.count(30),
            writer
        );

    });

    it("range error", (done) => {
        let len = 0;
        pull(
            pull.count(10000),
            createWrite((data, cb) => {
                len += data.length;
                cb();
            }, (a, b) => {
                if (!a) {
                    return [b];
                }
                return a.concat(b);
            }, 100, (err) => {
                assert.equal(len, 10001);
                done();
            })
        );
    });
});
