const Message = require("../../message");
const utils = require("../../utils");

const {
    async: { waterfall }
} = adone;

module.exports = (dht) => {
    const log = utils.logger(dht.peerInfo.id, "rpc:find-node");

    /**
     * Process `FindNode` DHT messages.
     *
     * @param {PeerInfo} peer
     * @param {Message} msg
     * @param {function(Error, Message)} callback
     * @returns {undefined}
     */
    return function findNode(peer, msg, callback) {
        log("start");

        waterfall([
            (cb) => {
                if (msg.key.equals(dht.peerInfo.id.id)) {
                    return cb(null, [dht.peerInfo]);
                }

                const closer = dht._betterPeersToQuery(msg, peer);
                cb(null, closer);
            },
            (closer, cb) => {
                const response = new Message(msg.type, Buffer.alloc(0), msg.clusterLevel);

                if (closer.length > 0) {
                    response.closerPeers = closer;
                } else {
                    log("handle FindNode %s: could not find anything", peer.id.asBase58());
                }

                cb(null, response);
            }
        ], callback);
    };
};
