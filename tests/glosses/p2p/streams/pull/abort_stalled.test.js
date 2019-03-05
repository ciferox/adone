const {
    p2p: { stream: { pull } }
} = adone;

//var abortable = require('pull-abortable')

const hang = function (values, onAbort) {
    let i = 0;
    let _cb;
    return function (abort, cb) {
        if (i < values.length) {
            cb(null, values[i++]);
        } else if (!abort) {
            _cb = cb;
        } else {
            _cb(abort);
            cb(abort); //??
            onAbort && onAbort();
        }
    };
};

const abortable = function () {
    let _read; let aborted;
    const reader = function (read) {
        _read = read;
        return function (abort, cb) {
            if (abort) {
                aborted = abort;
            }
            read(abort, cb);
        };
    };

    reader.abort = function (cb) {
        cb = cb || function (err) {
            if (err && err !== true) {
                throw err;
            }
        };
        if (aborted) {
            cb(aborted);
        } else {
            _read(true, cb);
        }
    };

    return reader;
};

const test = function (name, trx) {
    it(`test abort:${name}`, (done) => {
        const a = abortable();

        pull(
            hang([1, 2, 3], () => {
                done();
            }),
            trx,
            a,
            pull.drain((e) => {
                if (e === 3) {
                    setImmediate(() => {
                        a.abort();
                    });
                }
            }, (err) => {
            })
        );
    });
};

test("through", pull.through());
test("map", pull.map((e) => {
    return e;
}));
test("take", pull.take(Boolean));

