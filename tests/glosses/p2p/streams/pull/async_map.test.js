const {
    p2p: { stream: { pull } }
} = adone;


it("async-map", (done) => {

    pull(
        pull.count(),
        pull.take(21),
        pull.asyncMap((data, cb) => {
            return cb(null, data + 1);
        }),
        pull.collect((err, ary) => {
            // console.log(ary);
            assert.equal(ary.length, 21);
            done();
        })
    );
});

it("abort async map", (done) => {
    const err = new Error("abort");
    expect(2).checks(done);

    const read = pull(
        pull.infinite(),
        pull.asyncMap((data, cb) => {
            setImmediate(() => {
                cb(null, data);
            });
        })
    );

    read(null, (end) => {
        if (!end) {
            throw new Error("expected read to end");
        }
        expect(end).to.be.ok.mark();
    });

    read(err, (end) => {
        if (!end) {
            throw new Error("expected abort to end");
        }
        expect(end).to.be.ok.mark();
    });
});

it("abort async map (source is slow to ack abort)", (done) => {
    const err = new Error("abort");
    expect(3).checks(done);

    const source = function (end, cb) {
        if (end) {
            setTimeout(() => {
                cb(end);
            }, 20);
        } else {
            cb(null, 10);
        }
    };

    const read = pull(
        source,
        pull.asyncMap((data, cb) => {
            setImmediate(() => {
                cb(null, data);
            });
        })
    );

    let ended = false;

    read(null, (end) => {
        if (!end) {
            throw new Error("expected read to end");
        }
        ended = true;
        expect(end).to.be.ok.mark();
    });

    read(err, (end) => {
        if (!end) {
            throw new Error("expected abort to end");
        }
        expect(end).to.be.ok.mark();
        expect(ended).to.be.ok.mark();
    });
});

it("abort async map (async source)", (done) => {
    const err = new Error("abort");
    expect(2).checks(done);

    const read = pull(
        (err, cb) => {
            setImmediate(() => {
                if (err) {
                    return cb(err); 
                }
                cb(null, "x");
            });
        },
        pull.asyncMap((data, cb) => {
            setImmediate(() => {
                cb(null, data);
            });
        })
    );

    read(null, (end) => {
        if (!end) {
            throw new Error("expected read to end"); 
        }
        expect(end).to.be.ok.mark();
    });

    read(err, (end) => {
        if (!end) {
            throw new Error("expected abort to end"); 
        }
        expect(end).to.be.ok.mark();
    });
});

it("asyncMap aborts when map errors", (done) => {
    expect(2).checks(done);
    const ERR = new Error("abort");
    pull(
        pull.values([1, 2, 3], (err) => {
            // console.log("on abort");
            expect(err).to.equal(ERR).mark();
        }),
        pull.asyncMap((data, cb) => {
            cb(ERR);
        }),
        pull.collect((err) => {
            expect(err).to.equal(ERR).mark();
        })
    );
});

it("async map should pass its own error", (done) => {
    let i = 0;
    const error = new Error("error on last call");

    pull(
        (end, cb) => {
            end ? cb(true) : cb(null, i + 1);
        },
        pull.asyncMap((data, cb) => {
            setTimeout(() => {
                if (++i < 5) {
                    cb(null, data); 
                } else {
                    cb(error);
                }
            }, 100);
        }),
        pull.collect((err, five) => {
            assert.equal(err, error, "should return err");
            assert.deepEqual(five, [1, 2, 3, 4], "should skip failed item");
            done();
        })
    );
});
