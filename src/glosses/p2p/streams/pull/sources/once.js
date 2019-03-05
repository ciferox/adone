const {
    is
} = adone;
const abortCb = require("../util/abort-cb");

module.exports = function once(value, onAbort) {
    return function (abort, cb) {
        if (abort) {
            return abortCb(cb, abort, onAbort); 
        }
        if (!is.nil(value)) {
            const _value = value; value = null;
            cb(null, _value);
        } else {
            cb(true); 
        }
    };
};


