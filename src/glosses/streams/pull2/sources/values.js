const {
    is
} = adone;

const abortCb = require("../util/abort-cb");

module.exports = function values(array, onAbort) {
    if (!array) {
        return function (abort, cb) {
            if (abort) {
                return abortCb(cb, abort, onAbort); 
            }
            return cb(true);
        }; 
    }
    if (!is.array(array)) {
        array = Object.keys(array).map((k) => {
            return array[k];
        }); 
    }
    let i = 0;
    return function (abort, cb) {
        if (abort) {
            return abortCb(cb, abort, onAbort); 
        }
        if (i >= array.length) {
            cb(true); 
        } else {
            cb(null, array[i++]); 
        }
    };
};