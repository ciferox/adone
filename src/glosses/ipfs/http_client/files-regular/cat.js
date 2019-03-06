const promisify = require('promisify-es6')
const cleanCID = require('../utils/clean-cid')
const bl = require('bl')

const {
    ipfs: { isIPFS }
} = adone;

module.exports = (send) => {
    return promisify((hash, opts, callback) => {
        if (typeof opts === 'function') {
            callback = opts
            opts = {}
        }

        try {
            hash = cleanCID(hash)
        } catch (err) {
            if (!isIPFS.ipfsPath(hash)) {
                return callback(err)
            }
        }

        const query = {
            offset: opts.offset,
            length: opts.length
        }

        send({ path: 'cat', args: hash, buffer: opts.buffer, qs: query }, (err, stream) => {
            if (err) { return callback(err) }

            stream.pipe(bl((err, data) => {
                if (err) { return callback(err) }

                callback(null, data)
            }))
        })
    })
}
