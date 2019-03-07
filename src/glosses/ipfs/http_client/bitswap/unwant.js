const promisify = require('promisify-es6')
const {
    multiformat: { CID }
} = adone;

module.exports = (send) => {
    return promisify((cid, opts, callback) => {
        if (typeof (opts) === 'function') {
            callback = opts
            opts = {}
        }

        try {
            cid = new CID(cid)
        } catch (err) {
            return callback(err)
        }

        send({
            path: 'bitswap/unwant',
            args: cid.toBaseEncodedString(),
            qs: opts
        }, callback)
    })
}
