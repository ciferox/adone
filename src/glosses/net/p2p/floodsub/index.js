const TimeCache = require("time-cache");
const asyncEach = require("async/each");

const Peer = require("./peer");
export const utils = require("./utils");
const pb = require("./message");
const config = require("./config");

const log = config.log;
const multicodec = config.multicodec;
const ensureArray = utils.ensureArray;

const {
    event,
    stream: { pull }
} = adone;

/**
 * FloodSub (aka dumbsub is an implementation of pubsub focused on
 * delivering an API for Publish/Subscribe, but with no CastTree Forming
 * (it just floods the network).
 */
export class FloodSub extends event.Emitter {
    constructor(netCore) {
        super();

        this.netCore = netCore;
        this.started = false;

        /**
         * Time based cache for sequence numbers.
         *
         * @type {TimeCache}
         */
        this.cache = new TimeCache();

        /**
         * Map of peers.
         *
         * @type {Map<string, Peer>}
         */
        this.peers = new Map();

        /**
         * List of our subscriptions
         * @type {Set<string>}
         */
        this.subscriptions = new Set();

        this._onConnection = this._onConnection.bind(this);
        this._dialPeer = this._dialPeer.bind(this);
    }

    _addPeer(peer) {
        const id = peer.info.id.asBase58();

        /**
         * Always use an existing peer.
         *
         * What is happening here is: "If the other peer has already dialed to me, we already have
         * an establish link between the two, what might be missing is a
         * Connection specifically between me and that Peer"
         */
        let existing = this.peers.get(id);
        if (!existing) {
            log("new peer", id);
            this.peers.set(id, peer);
            existing = peer;

            peer.once("close", () => this._removePeer(peer));
        }
        ++existing._references;

        return existing;
    }

    _removePeer(peer) {
        const id = peer.info.id.asBase58();

        log("remove", id, peer._references);
        // Only delete when no one else is referencing this peer.
        if (--peer._references === 0) {
            log("delete peer", id);
            this.peers.delete(id);
        }

        return peer;
    }

    async _dialPeer(peerInfo) {
        const idB58Str = peerInfo.id.asBase58();

        // If already have a PubSub conn, ignore
        const peer = this.peers.get(idB58Str);
        if (peer && peer.isConnected) {
            return;
        }

        try {
            const conn = await this.netCore.connect(peerInfo, multicodec);
            this._onDial(peerInfo, conn);
        } catch (err) {
            //
        }
    }

    _onDial(peerInfo, conn) {
        const idB58Str = peerInfo.id.asBase58();
        log("connected", idB58Str);

        const peer = this._addPeer(new Peer(peerInfo));
        peer.attachConnection(conn);

        // Immediately send my own subscriptions to the newly established conn
        peer.sendSubscriptions(this.subscriptions);
    }

    async _onConnection(protocol, conn) {
        try {
            const peerInfo = await conn.getPeerInfo();
            const idB58Str = peerInfo.id.asBase58();
            const peer = this._addPeer(new Peer(peerInfo));
            this._processConnection(idB58Str, conn, peer);
        } catch (err) {
            log.err("Failed to identify incomming conn", err);
            return pull(pull.empty(), conn);
        }
    }

    _processConnection(idB58Str, conn, peer) {
        pull(
            conn,
            pull.lengthPrefixed.decode(),
            pull.map((data) => pb.rpc.RPC.decode(data)),
            pull.drain(
                (rpc) => this._onRpc(idB58Str, rpc),
                (err) => this._onConnectionEnd(idB58Str, peer, err)
            )
        );
    }

    _onRpc(idB58Str, rpc) {
        if (!rpc) {
            return;
        }

        log("rpc from", idB58Str);
        const subs = rpc.subscriptions;
        const msgs = rpc.msgs;

        if (msgs && msgs.length) {
            this._processRpcMessages(utils.normalizeInRpcMessages(rpc.msgs));
        }

        if (subs && subs.length) {
            const peer = this.peers.get(idB58Str);
            if (peer) {
                peer.updateSubscriptions(subs);
            }
        }
    }

    _processRpcMessages(msgs) {
        msgs.forEach((msg) => {
            const seqno = utils.msgId(msg.from, msg.seqno.toString());
            // 1. check if I've seen the message, if yes, ignore
            if (this.cache.has(seqno)) {
                return;
            }

            this.cache.put(seqno);

            // 2. emit to self
            this._emitMessages(msg.topicIDs, [msg]);

            // 3. propagate msg to others
            this._forwardMessages(msg.topicIDs, [msg]);
        });
    }

    _onConnectionEnd(idB58Str, peer, err) {
        // socket hang up, means the one side canceled
        if (err && err.message !== "socket hang up") {
            log.err(err);
        }

        log("connection ended", idB58Str, err ? err.message : "");
        this._removePeer(peer);
    }

    _emitMessages(topics, messages) {
        topics.forEach((topic) => {
            if (!this.subscriptions.has(topic)) {
                return;
            }

            messages.forEach((message) => {
                this.emit(topic, message);
            });
        });
    }

    _forwardMessages(topics, messages) {
        this.peers.forEach((peer) => {
            if (!peer.isWritable || !utils.anyMatch(peer.topics, topics)) {
                return;
            }

            peer.sendMessages(utils.normalizeOutRpcMessages(messages));

            log("publish msgs on topics", topics, peer.info.id.asBase58());
        });
    }

    /**
     * Mounts the floodsub protocol onto the netCore node and sends our
     * subscriptions to every peer conneceted
     */
    async start() {
        if (this.started) {
            throw new Error("already started");
        }

        this.netCore.handle(multicodec, this._onConnection);

        // Speed up any new peer that comes in my way
        this.netCore.on("peer:connect", (peer) => {
            this._dialPeer(peer);
        });

        // Dial already connected peers
        const peerInfos = this.netCore.peerBook.getAllAsArray();

        await Promise.all(peerInfos.map((peer) => this._dialPeer(peer)));
        this.started = true;
    }

    /**
     * Unmounts the floodsub protocol and shuts down every connection
     */
    async stop() {
        if (!this.started) {
            throw new Error("not started yet");
        }

        this.netCore.unhandle(multicodec);
        this.netCore.removeListener("peer:connect", this._dialPeer);

        await Promise.all([...this.peers.values()].map((peer) => peer.close()));

        this.peers = new Map();
        this.subscriptions = new Set();
        this.started = false;
    }

    /**
     * Publish messages to the given topics.
     *
     * @param {Array<string>|string} topics
     * @param {Array<any>|any} messages
     * @returns {undefined}
     *
     */
    publish(topics, messages) {
        if (!this.started) {
            throw new adone.error.IllegalState("FloodSub is not started");
        }

        log("publish", topics, messages);

        topics = ensureArray(topics);
        messages = ensureArray(messages);

        const from = this.netCore.peerInfo.id.asBase58();

        const buildMessage = (msg) => {
            const seqno = utils.randomSeqno();
            this.cache.put(utils.msgId(from, seqno));

            return {
                from,
                data: msg,
                seqno: Buffer.from(seqno),
                topicIDs: topics
            };
        };

        const msgObjects = messages.map(buildMessage);

        // Emit to self if I'm interested
        this._emitMessages(topics, msgObjects);

        // send to all the other peers
        this._forwardMessages(topics, msgObjects);
    }

    /**
     * Subscribe to the given topic(s).
     *
     * @param {Array<string>|string} topics
     * @returns {undefined}
     */
    subscribe(topics) {
        if (!this.started) {
            throw new adone.error.IllegalState("FloodSub is not started");
        }

        topics = ensureArray(topics);

        topics.forEach((topic) => this.subscriptions.add(topic));

        // make sure that FloodSub is already mounted
        const sendSubscriptionsOnceReady = function (peer) {
            if (peer && peer.isWritable) {
                return peer.sendSubscriptions(topics);
            }
            const onConnection = () => {
                peer.removeListener("connection", onConnection);
                sendSubscriptionsOnceReady(peer);
            };
            peer.on("connection", onConnection);
            peer.once("close", () => peer.removeListener("connection", onConnection));
        };
        this.peers.forEach((peer) => sendSubscriptionsOnceReady(peer));

    }

    /**
     * Unsubscribe from the given topic(s).
     *
     * @param {Array<string>|string} topics
     * @returns {undefined}
     */
    unsubscribe(topics) {
        // Avoid race conditions, by quietly ignoring unsub when shutdown.
        if (!this.started) {
            return;
        }

        topics = ensureArray(topics);

        topics.forEach((topic) => this.subscriptions.delete(topic));

        // make sure that FloodSub is already mounted
        const checkIfReady = function (peer) {
            if (peer && peer.isWritable) {
                peer.sendUnsubscriptions(topics);
            } else {
                setImmediate(checkIfReady.bind(peer));
            }
        };
        this.peers.forEach((peer) => checkIfReady(peer));
    }
}
