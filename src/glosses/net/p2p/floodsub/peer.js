import { rpc } from "./message";

const {
    event,
    stream: { pull }
} = adone;

/**
 * The known state of a connected peer.
 */
export default class Peer extends event.Emitter {
    /**
     * @param {PeerInfo} info
     */
    constructor(info) {
        super();

        /**
         * @type {PeerInfo}
         */
        this.info = info;
        /**
         * @type {Connection}
         */
        this.conn = null;
        /**
         * @type {Set}
         */
        this.topics = new Set();
        /**
         * @type {Pushable}
         */
        this.stream = null;

        this._references = 0;
    }

    /**
     * Is the peer connected currently?
     *
     * @type {boolean}
     */
    get isConnected() {
        return Boolean(this.conn);
    }

    /**
     * Do we have a connection to write on?
     *
     * @type {boolean}
     */
    get isWritable() {
        return Boolean(this.stream);
    }

    /**
     * Send a message to this peer.
     * Throws if there is no `stream` to write to available.
     *
     * @param {Buffer} msg
     * @returns {undefined}
     */
    write(msg) {
        if (!this.isWritable) {
            const id = this.info.id.asBase58();
            throw new Error(`No writable connection to ${id}`);
        }

        this.stream.push(msg);
    }

    /**
     * Attach the peer to a connection and setup a write stream
     *
     * @param {Connection} conn
     * @returns {undefined}
     */
    attachConnection(conn) {
        this.conn = conn;
        this.stream = pull.pushable();

        pull(
            this.stream,
            pull.lengthPrefixed.encode(),
            conn,
            pull.onEnd(() => {
                this.conn = null;
                this.stream = null;
                this.emit("close");
            })
        );

        this.emit("connection");
    }

    _sendRawSubscriptions(topics, subscribe) {
        if (topics.size === 0) {
            return;
        }

        const subs = [];
        topics.forEach((topic) => {
            subs.push({
                subscribe,
                topicCID: topic
            });
        });

        this.write(rpc.RPC.encode({
            subscriptions: subs
        }));
    }

    /**
     * Send the given subscriptions to this peer.
     * @param {Set|Array} topics
     * @returns {undefined}
     */
    sendSubscriptions(topics) {
        this._sendRawSubscriptions(topics, true);
    }

    /**
     * Send the given unsubscriptions to this peer.
     * @param {Set|Array} topics
     * @returns {undefined}
     */
    sendUnsubscriptions(topics) {
        this._sendRawSubscriptions(topics, false);
    }

    /**
     * Send messages to this peer.
     *
     * @param {Array<any>} msgs
     * @returns {undefined}
     */
    sendMessages(msgs) {
        this.write(rpc.RPC.encode({
            msgs
        }));
    }

    /**
     * Bulk process subscription updates.
     *
     * @param {Array} changes
     * @returns {undefined}
     */
    updateSubscriptions(changes) {
        changes.forEach((subopt) => {
            if (subopt.subscribe) {
                this.topics.add(subopt.topicCID);
            } else {
                this.topics.delete(subopt.topicCID);
            }
        });
    }

    /**
     * Closes the open connection to peer
     */
    close() {
        // Force removal of peer
        this._references = 1;

        // End the pushable
        if (this.stream) {
            this.stream.end();
        }

        this.conn = null;
        this.stream = null;
        this.emit("close");
    }
}
