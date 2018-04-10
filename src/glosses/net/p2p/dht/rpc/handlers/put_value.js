const utils = require("../../utils");

module.exports = (dht) => {
    /**
     * Process `PutValue` DHT messages.
     *
     * @param {PeerInfo} peer
     * @param {Message} msg
     * @param {function(Error, Message)} callback
     * @returns {undefined}
     */
    return function putValue(peer, msg, callback) {
        const record = msg.record;

        if (!record) {
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
            return callback(err);
        }
    };
};
