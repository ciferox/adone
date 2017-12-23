export default function (first) {

    let end;
    let data;
    let waiting;
    let peeked = false;

    return function (read) {

        read(null, (_end, _data) => {
            end = _end; data = _data;
            if (first) {
                first(end, data);

            }
            if (waiting) {
                const cb = waiting;
                waiting = null;
                peeked = true;
                cb(end, data);
            }
        });

        return function (_abort, cb) {
            //if the peekahead hasn't returned key.
            if (!(end || data)) {
                // abort = _abort;
                waiting = cb;
            }
            //if it has, but we havn't called back yet.
            else if (!peeked) {
                peeked = true;
                cb(end, data);
            }
            //if we are streaming as normal.
            else {
                read(_abort, cb);

            }
        };
    };
}

