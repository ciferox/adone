

function id(e) {
    return e; 
}
const prop = require("../util/prop");
const drain = require("./drain");

module.exports = function find(test, cb) {
    let ended = false;
    if (!cb) {
        cb = test, test = id; 
    } else {
        test = prop(test) || id; 
    }

    return drain((data) => {
        if (test(data)) {
            ended = true;
            cb(null, data);
            return false;
        }
    }, (err) => {
        if (ended) {
            return; 
        } //already called back
        cb(err === true ? null : err, null);
    });
};




