const {
    is
} = adone;

//read a number of items and then stop.
export default function take(test, opts) {
    opts = opts || {};
    let last = opts.last || false; // whether the first item for which !test(item) should still pass
    let ended = false;
    if (is.number(test)) {
        last = true;
        let n = test; test = function () {
            return --n;
        };
    }

    return function (read) {

        const terminate = (cb) => {
            read(true, (err) => {
                last = false; cb(err || true);
            });
        };

        return function (end, cb) {
            if (ended) {
                last ? terminate(cb) : cb(ended);
                return;
            }
            ended = end;
            if (ended) {
                read(ended, cb);
                return;
            }
            read(null, (end, data) => {
                ended = ended || end;
                if (ended) {
                    //last ? terminate(cb) :
                    cb(ended);
                } else if (!test(data)) {
                    ended = true;
                    last ? cb(null, data) : terminate(cb);
                } else {
                    cb(null, data);

                }
            });
        };
    };
}
