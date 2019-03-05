const transformChunk = require('./bw-util')

const {
    p2p: { stream: { pull, defer, streamToPullStream } }
} = adone;

module.exports = (send) => {
    return (opts) => {
        opts = opts || {}

        const p = defer.source()

        send({
            path: 'stats/bw',
            qs: opts
        }, (err, stream) => {
            if (err) {
                return p.end(err)
            }

            p.resolve(pull(
                streamToPullStream.source(stream),
                pull.map(transformChunk)
            ))
        })

        return p
    }
}
