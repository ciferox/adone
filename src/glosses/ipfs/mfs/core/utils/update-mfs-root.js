const log = require('debug')('ipfs:mfs:utils:update-mfs:root')
const waterfall = require('async/waterfall')
const {
    multiformat: { CID }
} = adone;
const {
    MFS_ROOT_KEY
} = require('./constants')

const updateMfsRoot = (context, buffer, callback) => {
    const cid = new CID(buffer)

    log(`New MFS root will be ${cid.toBaseEncodedString()}`)

    waterfall([
        (cb) => context.repo.datastore.put(MFS_ROOT_KEY, cid.buffer, (error) => cb(error))
    ], (error) => callback(error, cid))
}

module.exports = updateMfsRoot
