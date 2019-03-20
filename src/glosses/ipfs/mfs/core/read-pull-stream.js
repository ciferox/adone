const {
    toMfsPath
} = require('./utils')
const log = require('debug')('ipfs:mfs:read-pull-stream')

const {
    ipfs: { unixfsExporter: exporter }
} = adone;

const {
    stream: { pull }
} = adone;
const { defer, asyncMap, collect, once, flatten, filter } = pull;

const defaultOptions = {
    offset: 0,
    length: undefined
}

module.exports = (context) => {
    return function mfsReadPullStream(path, options = {}) {
        options = Object.assign({}, defaultOptions, options)

        // support legacy go arguments
        options.length = options.length || options.count

        log(`Reading ${path}`)

        const deferred = defer.source()

        pull(
            once(path),
            asyncMap((path, cb) => toMfsPath(context, path, cb)),
            asyncMap(({ mfsPath, root }, cb) => {
                log(`Exporting ${mfsPath}`)

                return pull(
                    exporter(mfsPath, context.ipld, {
                        offset: options.offset,
                        length: options.length
                    }),
                    collect(cb)
                )
            }),
            flatten(),
            filter(),
            collect((error, files) => {
                if (error) {
                    return deferred.abort(error)
                }

                if (!files || !files.length) {
                    return deferred.abort(new Error(`${path} does not exist`))
                }

                const file = files[0]

                if (file.type !== 'file') {
                    return deferred.abort(new Error(`${path} was not a file`))
                }

                if (!file.content) {
                    return deferred.abort(new Error(`Could not load content stream from ${path}`))
                }

                log(`Got ${path} content`)
                deferred.resolve(files[0].content)
            })
        )

        return deferred
    }
}
