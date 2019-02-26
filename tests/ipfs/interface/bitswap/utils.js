const until = require("async/until");

const {
    is
} = adone;

const waitForWantlistKey = function (ipfs, key, opts, cb) {
    if (is.function(opts)) {
        cb = opts;
        opts = {};
    }

    opts = opts || {};
    opts.timeout = opts.timeout || 1000;

    const list = { Keys: [] };
    let timedOut = false;

    setTimeout(() => {
        timedOut = true;
    }, opts.timeout);

    const test = () => timedOut ? true : list.Keys.every((k) => k["/"] === key);
    const iteratee = (cb) => ipfs.bitswap.wantlist(opts.peerId, cb);

    until(test, iteratee, (err) => {
        if (err) {
            return cb(err);
        }
        if (timedOut) {
            return cb(new Error(`Timed out waiting for ${key} in wantlist`));
        }
        cb();
    });
}

module.exports.waitForWantlistKey = waitForWantlistKey;
