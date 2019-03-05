const cleanCID = require('../utils/clean-cid')

const {
    p2p: { stream: { defer, streamToPullStream } },
    ipfs: { isIPFS }
} = adone;

module.exports = (send) => {
    return (hash, opts) => {
        opts = opts || {}

        const p = defer.source()

        try {
            hash = cleanCID(hash)
        } catch (err) {
            if (!isIPFS.ipfsPath(hash)) {
                return p.end(err)
            }
        }

        const query = {
            offset: opts.offset,
            length: opts.length
        }

        send({ path: 'cat', args: hash, buffer: opts.buffer, qs: query }, (err, stream) => {
            if (err) { return p.end(err) }

            p.resolve(streamToPullStream(stream))
        })

        return p
    }
}
