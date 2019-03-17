const {
    ipfs: { Bitswap }
} = adone;


const waterfall = require("async/waterfall");

const createTempRepo = require("./create_temp_repo_nodejs");
const createLibp2pNode = require("./create_libp2p_node");

module.exports = (callback) => {
    waterfall([
        (cb) => createTempRepo(cb),
        (repo, cb) => {
            createLibp2pNode({
                DHT: repo.datastore
            }, (err, node) => cb(err, repo, node));
        },
        (repo, libp2pNode, cb) => {
            const bitswap = new Bitswap(libp2pNode, repo.blocks);
            bitswap.start((err) => cb(err, {
                bitswap,
                repo,
                libp2pNode
            }));
        }
    ], callback);
};
