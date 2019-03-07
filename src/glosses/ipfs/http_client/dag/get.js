const promisify = require('promisify-es6')
const waterfall = require('async/waterfall')
const block = require('../block')

const {
    ipfs: { ipld: { dagPb, dagCbor } },
    multiformat: { CID }
} = adone;

const resolvers = {
    'dag-cbor': dagCbor.resolver,
    'dag-pb': dagPb.resolver
}

module.exports = (send) => {
    return promisify((cid, path, options, callback) => {
        if (typeof path === 'function') {
            callback = path
            path = undefined
        }

        if (typeof options === 'function') {
            callback = options
            options = {}
        }

        options = options || {}
        path = path || ''

        if (CID.isCID(cid)) {
            cid = cid.toBaseEncodedString()
        }

        waterfall([
            cb => {
                send({
                    path: 'dag/resolve',
                    args: cid + '/' + path,
                    qs: options
                }, cb)
            },
            (resolved, cb) => {
                block(send).get(new CID(resolved['Cid']['/']), (err, ipfsBlock) => {
                    cb(err, ipfsBlock, resolved['RemPath'])
                })
            },
            (ipfsBlock, path, cb) => {
                const dagResolver = resolvers[ipfsBlock.cid.codec]
                if (!dagResolver) {
                    const error = new Error('ipfs-http-client is missing DAG resolver for "' + ipfsBlock.cid.codec + '" multicodec')
                    error.missingMulticodec = ipfsBlock.cid.codec
                    cb(error)
                    return
                }
                dagResolver.resolve(ipfsBlock.data, path, cb)
            }
        ], callback)
    })
}
