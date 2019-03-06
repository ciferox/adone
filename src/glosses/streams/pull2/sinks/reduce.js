

const drain = require("./drain");

module.exports = function reduce(reducer, acc, cb ) {
    if (!cb) {
        cb = acc, acc = null; 
    }
    const sink = drain((data) => {
        acc = reducer(acc, data);
    }, (err) => {
        cb(err, acc);
    });
    if (arguments.length === 2) {
        return function (source) {
            source(null, (end, data) => {
                //if ended immediately, and no initial...
                if (end) {
                    return cb(end === true ? null : end); 
                }
                acc = data; sink(source);
            });
        }; 
    }
    return sink;
};