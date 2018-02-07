const timeout = require("async/timeout");
const rpc = require("./rpc");
const c = require("./constants");
const Message = require("./message");
const utils = require("./utils");

const {
    stream: { pull }
} = adone;

const writeReadMessage = function (conn, msg, callback) {
    pull(
        pull.values([msg]),
        pull.lengthPrefixed.encode(),
        conn,
        pull.filter((msg) => msg.length < c.maxMessageSize),
        pull.lengthPrefixed.decode(),
        pull.collect((err, res) => {
            if (err) {
                return callback(err);
            }
            if (res.length === 0) {
                return callback(new Error("No message received"));
            }

            let response;
            try {
                response = Message.deserialize(res[0]);
            } catch (err) {
                return callback(new Error(`failed to deserialize response: ${err.message}`));
            }

            callback(null, response);
        })
    );
};


/**
 * Handle network operations for the dht
 */
class Network {
    /**
     * Create a new network.
     *
     * @param {KadDHT} self
     */
    constructor(self) {
        this.dht = self;
        this.readMessageTimeout = c.READ_MESSAGE_TIMEOUT;
        this._rpc = rpc(this.dht);
        this._onPeerConnected = this._onPeerConnected.bind(this);
        this._running = false;
    }

    /**
     * Start the network.
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    start(callback) {
        const cb = (err) => setImmediate(() => callback(err));

        if (this.isOnline) {
            return cb(new Error("Network is already running"));
        }

        // TODO add a way to check if switch has started or not
        if (!this.dht.isStarted) {
            return cb(new Error("Can not start network"));
        }

        this._running = true;

        // handle incoming connections
        this.dht.switch.handle(c.PROTOCOL_DHT, this._rpc);

        // handle new connections
        this.dht.switch.on("peer:mux:established", this._onPeerConnected);

        cb();
    }

    /**
     * Stop all network activity.
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    stop(callback) {
        const cb = (err) => setImmediate(() => callback(err));

        if (!this.dht.isStarted && !this.isStarted) {
            return cb(new Error("Network is already stopped"));
        }
        this._running = false;
        this.dht.switch.removeListener("peer:mux:established", this._onPeerConnected);

        this.dht.switch.unhandle(c.PROTOCOL_DHT);
        cb();
    }

    /**
     * Is the network online?
     *
     * @type {bool}
     */
    get isStarted() {
        return this._running;
    }

    /**
     * Are all network components there?
     *
     * @type {bool}
     */
    get isConnected() {
        // TODO add a way to check if switch has started or not
        return this.dht.isStarted && this.isStarted;
    }

    /**
     * Handle new connections in the switch.
     *
     * @param {PeerInfo} peer
     * @returns {void}
     * @private
     */
    _onPeerConnected(peer) {
        if (!this.isConnected) {
            return;
        }

        this.dht.switch.connect(peer, c.PROTOCOL_DHT).catch(() => { }).then((conn) => {
            // TODO: conn.close()
            pull(pull.empty(), conn);

            try {
                this.dht._add(peer);
            } catch (err) {
                //
            }
        });
    }

    /**
     * Send a request and record RTT for latency measurements.
     *
     * @param {PeerId} to - The peer that should receive a message
     * @param {Message} msg - The message to send.
     * @param {function(Error, Message)} callback
     * @returns {void}
     */
    sendRequest(to, msg, callback) {
        // TODO: record latency
        if (!this.isConnected) {
            return callback(new Error("Network is offline"));
        }

        this.dht.switch.connect(to, c.PROTOCOL_DHT).catch(callback).then((conn) => {
            this._writeReadMessage(conn, msg.serialize(), callback);
        });
    }

    /**
     * Sends a message without expecting an answer.
     *
     * @param {PeerId} to
     * @param {Message} msg
     * @param {function(Error)} callback
     * @returns {void}
     */
    sendMessage(to, msg, callback) {
        if (!this.isConnected) {
            return setImmediate(() => callback(new Error("Network is offline")));
        }

        this.dht.switch.connect(to, c.PROTOCOL_DHT).catch(callback).then((conn) => {
            this._writeMessage(conn, msg.serialize(), callback);
        });
    }

    /**
     * Write a message and read its response.
     * If no response is received after the specified timeout
     * this will error out.
     *
     * @param {Connection} conn - the connection to use
     * @param {Buffer} msg - the message to send
     * @param {function(Error, Message)} callback
     * @returns {void}
     * @private
     */
    _writeReadMessage(conn, msg, callback) {
        timeout(
            writeReadMessage,
            this.readMessageTimeout
        )(conn, msg, callback);
    }

    /**
     * Write a message to the given connection.
     *
     * @param {Connection} conn - the connection to use
     * @param {Buffer} msg - the message to send
     * @param {function(Error)} callback
     * @returns {void}
     * @private
     */
    _writeMessage(conn, msg, callback) {
        pull(
            pull.values([msg]),
            pull.lengthPrefixed.encode(),
            conn,
            pull.lengthPrefixed.decode(),
            pull.collect((err) => callback(err))
        );
    }
}

module.exports = Network;
