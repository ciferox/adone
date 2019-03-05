const {
    p2p: { stream: { pull } }
} = adone;

it("abort on drain", (done) => {

    let c = 100;
    const drain = pull.drain(() => {
        if (c < 0) {
            throw new Error("stream should have aborted");
        }
        if (!--c) {
            return false;
        } //drain.abort()
    }, () => {
        done();
    });

    pull(pull.infinite(), drain);

});


const delay = function () {
    return pull.asyncMap((e, cb) => {
        setTimeout(() => {
            cb(null, e);
        });
    });
};

it("abort on drain - async", (done) => {
    let c = 100;
    const drain = pull.drain(() => {
        if (c < 0) {
            throw new Error("stream should have aborted");
        }
        if (!--c) {
            return drain.abort();
        }
    }, () => {
        done();
    });

    pull(pull.infinite(), delay(), drain);

});

it("abort on drain - sync", (done) => {
    let c = 100;
    const drain = pull.drain(() => {
        if (c < 0) {
            throw new Error("stream should have aborted");
        }
        if (!--c) {
            return drain.abort();
        }
    }, () => {
        done();
    });

    pull(pull.infinite(), drain);

});


it("abort on drain - async, out of cb", (done) => {
    let c = 0; const ERR = new Error("test ABORT");
    const drain = pull.drain(() => {
        --c;
    }, (err) => {
        assert.ok(c < 0);
        assert.equal(err, ERR);
        done();
    });

    pull(pull.infinite(), delay(), drain);

    setTimeout(() => {
        drain.abort(ERR);
    }, 100);

});
