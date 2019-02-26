const cleanCID = require('../utils/clean-cid')
const Stream = require('readable-stream')
const pump = require('pump')

const {
    ipfs: { isIPFS }
} = adone;

module.exports = (send) => {
    return (hash, opts) => {
        opts = opts || {}

        const pt = new Stream.PassThrough()

        try {
            hash = cleanCID(hash)
        } catch (err) {
            if (!isIPFS.ipfsPath(hash)) {
                return pt.destroy(err)
            }
        }

        const query = {
            offset: opts.offset,
            length: opts.length
        }

        send({ path: 'cat', args: hash, buffer: opts.buffer, qs: query }, (err, stream) => {
            if (err) { return pt.destroy(err) }

            pump(stream, pt)
        })

        return pt
    }
}
