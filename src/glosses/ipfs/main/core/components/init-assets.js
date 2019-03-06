const path = require('path')
const glob = require('glob')
const CID = require('cids')

const {
    stream: { pull2: pull }
} = adone;
const { file } = pull;

// Add the default assets to the repo.
module.exports = function addDefaultAssets(self, log, callback) {
    const initDocsPath = path.join(__dirname, '../../init-files/init-docs')
    const index = initDocsPath.lastIndexOf(path.sep)

    pull(
        pull.values([initDocsPath]),
        pull.asyncMap((val, cb) =>
            glob(path.join(val, '/**/*'), { nodir: true }, cb)
        ),
        pull.flatten(),
        pull.map(element => {
            const addPath = element.substring(index + 1)
            return { path: addPath, content: file(element) }
        }),
        self.addPullStream(),
        pull.through(file => {
            if (file.path === 'init-docs') {
                const cid = new CID(file.hash)
                log('to get started, enter:\n')
                log(`\tjsipfs cat /ipfs/${cid.toBaseEncodedString()}/readme\n`)
            }
        }),
        pull.collect((err) => {
            if (err) {
                return callback(err)
            }

            callback(null, true)
        })
    )
}
