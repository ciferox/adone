

const drain = require("./drain");

module.exports = function log(done) {
    return drain((data) => {
        console.log(data);
    }, done);
};
