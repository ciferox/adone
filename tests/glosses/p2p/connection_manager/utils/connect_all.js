const {
    async: { eachSeries },
    lodash: { without }
} = adone;

module.exports = (nodes, callback) => {
    eachSeries(
        nodes,
        (node, cb) => {
            eachSeries(
                without(nodes, node),
                (otherNode, cb) => node.dial(otherNode.peerInfo, cb),
                cb
            );
        },
        callback
    );
};
