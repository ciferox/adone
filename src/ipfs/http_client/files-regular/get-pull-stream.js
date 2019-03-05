const cleanCID = require('../utils/clean-cid')
const TarStreamToObjects = require('../utils/tar-stream-to-objects')

const {
    p2p: { stream: { pull, defer, streamToPullStream } },
    ipfs: { isIPFS }
} = adone;

module.exports = (send) => {
    return (path, opts) => {
        opts = opts || {}

        const p = defer.source()

        try {
            path = cleanCID(path)
        } catch (err) {
            if (!isIPFS.ipfsPath(path)) {
                return p.end(err)
            }
        }

        const request = { path: 'get', args: path, qs: opts }

        // Convert the response stream to TarStream objects
        send.andTransform(request, TarStreamToObjects, (err, stream) => {
            if (err) { return p.end(err) }

            p.resolve(
                pull(
                    streamToPullStream.source(stream),
                    pull.map(file => {
                        const { path, content } = file
                        return content ? { path, content: streamToPullStream.source(content) } : file
                    })
                )
            )
        })

        return p
    }
}
