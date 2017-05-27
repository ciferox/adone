const through = require("through2");

module.exports.testStream = function () {
    return through(function (buf, enc, cb) {
        const that = this;
        setImmediate(() => {
            that.push(buf);
            cb();
        });
    });
};
