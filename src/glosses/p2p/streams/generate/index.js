// jshint -W033, -W030

function abortCb(cb, abort, onAbort) {
    cb(abort);
    onAbort && onAbort(abort === true ? null : abort);
}

const generate =
module.exports = function (initialState, expand, onAbort) {
    let state = initialState; let ended;

    return function (abort, cb) {
        if (ended) {
            cb(ended); 
        } else if (ended = abort) {
            abortCb(cb, abort, onAbort); 
        } else {
            expand(state, (err, data, newState) => {
                state = newState;
                if (ended = err) {
                    abortCb(cb, err, onAbort); 
                } else {
                    cb(null, data); 
                }
            }); 
        }
    };
};
