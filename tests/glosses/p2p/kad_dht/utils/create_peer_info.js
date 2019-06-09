const {
    async: { times },
    p2p: { PeerId, PeerInfo }
} = adone;

/**
 * Creates multiple PeerInfos
 * @param {number} n The number of `PeerInfo` to create
 * @param {function(Error, Array<PeerInfo>)} callback
 */
const createPeerInfo = function (n, callback) {
    times(n, (i, cb) => PeerId.create({ bits: 512 }, cb), (err, ids) => {
        if (err) {
            return callback(err);
        }
        callback(null, ids.map((i) => new PeerInfo(i)));
    });
};

module.exports = createPeerInfo;
