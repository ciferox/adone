const waterfall = require("async/waterfall");

const createTempRepo = require("./create_temp_repo_nodejs");
const createLibp2pNode = require("./create_node");

const {
    p2p: { ConnectionManager }
} = adone;

module.exports = (options, callback) => {
    waterfall([
        (cb) => createTempRepo(cb),
        (repo, cb) => {
            createLibp2pNode({}, (err, node) => cb(err, repo, node));
        },
        (repo, libp2pNode, cb) => {
            const connManager = new ConnectionManager(libp2pNode, options);
            connManager.start();
            cb(null, repo, libp2pNode, connManager);
        }
    ], (err, repo, libp2pNode, connManager) => {
        callback(err, {
            repo,
            libp2pNode,
            connManager
        });
    });
};
