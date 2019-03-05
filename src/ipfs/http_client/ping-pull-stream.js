const pump = require('pump')
const moduleConfig = require('./utils/module-config')
const PingMessageStream = require('./utils/ping-message-stream')

const {
    stream: { pull2: { defer, streamToPullStream } }
} = adone;

module.exports = (arg) => {
    const send = moduleConfig(arg)

    return (id, opts = {}) => {
        // Default number of packtes to 1
        if (!opts.n && !opts.count) {
            opts.n = 1
        }
        const request = {
            path: 'ping',
            args: id,
            qs: opts
        }
        const p = defer.source()
        const response = new PingMessageStream()

        send(request, (err, stream) => {
            if (err) { return p.abort(err) }

            pump(stream, response)
            p.resolve(streamToPullStream.source(response))
        })

        return p
    }
}
