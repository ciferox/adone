const Message = require("../message");
const handlers = require("./handlers");
const utils = require("../utils");
const c = require("../constants");

const {
    stream: { pull }
} = adone;

module.exports = (dht) => {
    const log = utils.logger(dht.peerInfo.id, "rpc");

    const getMessageHandler = handlers(dht);
    /**
     * Process incoming DHT messages.
     *
     * @param {PeerInfo} peer
     * @param {Message} msg
     * @param {function(Error, Message)} callback
     * @returns {void}
     *
     * @private
     */
    const handleMessage = function (peer, msg, callback) {
        try {
            // update the peer
            dht._add(peer);
        } catch (err) {
            log.error("Failed to update the kbucket store");
            log.error(err);
        }
        // get handler & exectue it
        const handler = getMessageHandler(msg.type);

        if (!handler) {
            log.error(`no handler found for message type: ${msg.type}`);
            return callback();
        }

        handler(peer, msg, callback);
    };

    /**
     * Handle incoming streams from the swarm, on the dht protocol.
     *
     * @param {string} protocol
     * @param {Connection} conn
     * @returns {undefined}
     */
    return async function (protocol, conn) {
        try {
            const peer = await conn.getPeerInfo();
            log("from: %s", peer.id.asBase58());

            pull(
                conn,
                pull.lengthPrefixed.decode(),
                pull.filter((msg) => msg.length < c.maxMessageSize),
                pull.map((rawMsg) => {
                    let msg;
                    try {
                        msg = Message.deserialize(rawMsg);
                    } catch (err) {
                        log.error("failed to read incoming message", err);
                        return;
                    }

                    return msg;
                }),
                pull.filter(Boolean),
                pull.asyncMap((msg, cb) => handleMessage(peer, msg, cb)),
                // Not all handlers will return a response
                pull.filter(Boolean),
                pull.map((response) => {
                    let msg;
                    try {
                        msg = response.serialize();
                    } catch (err) {
                        log.error("failed to send message", err);
                        return;
                    }
                    return msg;
                }),
                pull.filter(Boolean),
                pull.lengthPrefixed.encode(),
                conn
            );
        } catch (err) {
            log.error("Failed to get peer info");
            log.error(err);
        }
    };
};