const abortCb = (cb, abort, onAbort) => {
    cb(abort);
    onAbort && onAbort(abort === true ? null : abort);
};

export default function (initialState, expand, onAbort) {
    let state = initialState;
    let ended;

    return function (abort, cb) {
        if (ended) {
            cb(ended);
            return;
        }
        ended = abort;
        if (ended) {
            abortCb(cb, abort, onAbort);
            return;
        }
        expand(state, (err, data, newState) => {
            state = newState;
            ended = err;
            if (ended) {
                abortCb(cb, err, onAbort);
            } else {
                cb(null, data);
            }
        });
    };
}

