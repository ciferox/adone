const streamToValueWithTransformer = require('../utils/stream-to-value-with-transformer')

const {
    p2p: { PeerId, PeerInfo },
    promise: { promisify }
} = adone;

module.exports = (send) => {
    return promisify((peerId, opts, callback) => {
        if (typeof opts === 'function' && !callback) {
            callback = opts
            opts = {}
        }

        // opts is the real callback --
        // 'callback' is being injected by promisify
        if (typeof opts === 'function' && typeof callback === 'function') {
            callback = opts
            opts = {}
        }

        const handleResult = (res, callback) => {
            const peerIds = res.map((r) => (new PeerInfo(PeerId.createFromB58String(r.ID))))

            callback(null, peerIds)
        }

        send({
            path: 'dht/query',
            args: peerId,
            qs: opts
        }, (err, result) => {
            if (err) {
                return callback(err)
            }

            streamToValueWithTransformer(result, handleResult, callback)
        })
    })
}
