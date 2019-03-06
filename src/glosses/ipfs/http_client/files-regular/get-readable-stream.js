const cleanCID = require('../utils/clean-cid')
const TarStreamToObjects = require('../utils/tar-stream-to-objects')
const Stream = require('readable-stream')
const pump = require('pump')

const {
    ipfs: { isIPFS }
} = adone;

module.exports = (send) => {
    return (path, opts) => {
        opts = opts || {}

        const pt = new Stream.PassThrough({ objectMode: true })

        try {
            path = cleanCID(path)
        } catch (err) {
            if (!isIPFS.ipfsPath(path)) {
                return pt.destroy(err)
            }
        }

        const request = { path: 'get', args: path, qs: opts }

        // Convert the response stream to TarStream objects
        send.andTransform(request, TarStreamToObjects, (err, stream) => {
            if (err) { return pt.destroy(err) }

            pump(stream, pt)
        })

        return pt
    }
}
