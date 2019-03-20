module.exports = function (first) {

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
            } else if (!peeked) {
                //if it has, but we havn't called back yet.
                peeked = true;
                cb(end, data);
            } else {
                //if we are streaming as normal.
                read(_abort, cb);
            }
        };
    };
};
