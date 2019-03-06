const waterfall = require('async/waterfall')

const {
    ipfs: { UnixFs, ipld: { dagPb } }
} = adone;

const {
    DAGNode
} = dagPb;

const createNode = (context, type, options, callback) => {
    waterfall([
        (done) => DAGNode.create(new UnixFs(type).marshal(), [], done),
        (node, done) => context.ipld.put(node, {
            version: options.cidVersion,
            format: options.format,
            hashAlg: options.hashAlg
        }, (err, cid) => done(err, {
            cid,
            node
        }))
    ], callback)
}

module.exports = createNode
