const {
    lodash: { without }
} = adone;

const eachSeries = require("async/eachSeries");

module.exports = (nodes, callback) => {
    eachSeries(nodes, (node, cb) => {
        eachSeries(
            without(nodes, node),
            (otherNode, cb) => {
                node.libp2pNode.dial(otherNode.bitswap.peerInfo, cb);
            },
            cb);
    }, callback);
};
