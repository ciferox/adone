const promisify = require("promisify-es6");

const {
    is,
    stream: { pull }
} = adone;

module.exports = function ping(self) {
    return promisify((peerId, opts, callback) => {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        pull(
            self.pingPullStream(peerId, opts),
            pull.collect(callback)
        );
    });
};
