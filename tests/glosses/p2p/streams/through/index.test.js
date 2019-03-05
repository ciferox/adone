const {
    p2p: { stream: { pull, through } }
} = adone;

describe("pull", "through", () => {
    it("emit error", (done) => {
        const err = new Error("expected error");
        pull(
            pull.values([1, 2, 3]),
            through(function (data) {
                this.emit("error", err);
            }),
            pull.drain(null, (_err) => {
                assert.equal(_err, err);
                done();
            })
        );
    });

    it("through", (done) => {
        pull(
            pull.values([1, 2, 3]),
            through(function (data) {
                this.queue(data * 10);
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [10, 20, 30]);
                done();
            })
        );
    });

    it.todo("through async", (done) => {
        pull(
            pull.values([1, 2, 3]),
            through(function (data) {
                const self = this;
                setTimeout(() => {
                    self.queue(data * 10);
                }, 10);
            }),
            pull.collect((err, ary) => {
                if (err) { 
                    throw err;
                }
                assert.deepEqual(ary, [10, 20, 30]);
                done();
            })
        );
    });

    it("through + end", (done) => {
        pull(
            pull.values([1, 2, 3]),
            through(function (data) {
                this.queue(data * 10);
            }, function () {
                this.queue(40);
                this.queue(null);
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [10, 20, 30, 40]);
                done();
            })
        );
    });

    it("through + end, falsey values", (done) => {
        pull(
            pull.values([0, 1, 2, 3]),
            through(function (data) {
                this.queue(data * 10);
            }, function () {
                this.queue(40);
                this.queue(null);
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [0, 10, 20, 30, 40]);
                done();
            })
        );
    });



    it("range error", (done) => {

        let n = 0;
        pull(
            pull.count(1000000),
            through((data) => {
                n += data;
            }),
            pull.drain(null, () => {
                console.log(n);
                assert.equal(500000500000, n);
                done();
            })
        );

    });

    it("pass error through", (done) => {

        const err = new Error("testing errors");

        pull(
            pull.error(err),
            through(console.log),
            pull.drain(null, (_err) => {
                assert.equal(_err, err);
                done();
            })
        );

    });

    it("pass abort back to source", (done) => {
        pull(
            pull.values([1, 2, 3], () => {
                done();
            }),
            through(function (data) {
                this.queue(data);
            }),
            pull.take(1),
            pull.collect((err, ary) => {
                assert.deepEqual(ary, [1]);
            })
        );

    });

    it("pass abort back to source in stalled stream", (done) => {
        const read = pull(
            pull.values([1, 2, 3], () => {
                done();
            }),
            pull.asyncMap((d, cb) => {
                setImmediate(() => {
                    cb(null, d);
                });
            }),
            through((data) => {
                //do nothing. this will make through read ahead some more.
            })
        );

        let c = 0; let d = 0;

        read(null, (err, data) => {
            assert.equal(d, 1, "unsatified read cb after abort called");
            assert.equal(c++, 0, "unsatified read cb before abort cb");
        });

        d++;
        read(true, (err) => {
            assert.equal(c++, 1);
        });
    });

    it("abort source on error", (done) => {
        const err = new Error("intentional");

        const read = pull(
            pull.values([1, 2, 3], (_err) => {
                assert.equal(_err, err);
                done();
            }),
            through(function (data) {
                //do nothing. this will make through read ahead some more.
                this.emit("error", err);
            }),
            pull.drain(null, (_err) => {
                assert.equal(_err, err);
            })
        );
    });


    it("abort source on end within writer", (done) => {
        const err = new Error("intentional");

        const read = pull(
            pull.values([1, 2, 3], () => {
                done();
            }),
            through(function (data) {
                //do nothing. this will make through read ahead some more.
                this.emit("end", err);
            }),
            pull.drain(null, (_err) => {
                assert.equal(_err, null);
            })
        );
    });
});
