const utils = require("../../utils");

module.exports = (dht) => {
    const log = utils.logger(dht.peerInfo.id, "rpc:put-value");

    /**
     * Process `PutValue` DHT messages.
     *
     * @param {PeerInfo} peer
     * @param {Message} msg
     * @param {function(Error, Message)} callback
     * @returns {undefined}
     */
    return function putValue(peer, msg, callback) {
        const key = msg.key;
        log("key: %s", key);

        const record = msg.record;

        if (!record) {
            log.error("Got empty record from: %s", peer.id.asBase58());
            return callback(new Error("Empty record"));
        }
        try {
            dht._verifyRecordLocally(record);
            record.timeReceived = new Date();

            const key = utils.bufferToKey(record.key);

            dht.datastore.put(key, record.serialize()).catch(callback).then(() => {
                callback(null, msg);
            });
        } catch (err) {
            log.error(err.message);
            return callback(err);
        }
    };
};
