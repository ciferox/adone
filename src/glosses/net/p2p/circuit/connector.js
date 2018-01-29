const waterfall = require("async/waterfall");
const multicodec = require("./multicodec");

const {
    is,
    multi,
    net: { p2p: { Connection, PeerId } },
    util: { once }
} = adone;

const __ = adone.private(adone.net.p2p.circuit);

export default class Dialer {
    /**
     * Creates an instance of Dialer.
     * @param {Swarm} swarm - the swarm
     * @param {any} options - config options
     *
     * @memberOf Dialer
     */
    constructor(swarm, options) {
        this.swarm = swarm;
        this.relayPeers = new Map();
        this.options = options;
        this.utils = __.utils(swarm);
    }

    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to connect
     * @returns {Promise<Connection>} - the connection
     *
     * @memberOf Dialer
     */
    connect(ma) {
        const strMa = ma.toString();
        if (!strMa.includes("/p2p-circuit")) {
            throw new Error("invalid circuit address");
        }

        const addr = strMa.split("p2p-circuit"); // extract relay address if any
        const relay = addr[0] === "/" ? null : multi.address.create(addr[0]);
        const peer = multi.address.create(addr[1] || addr[0]);

        return new Promise((resolve, reject) => {
            this._dialPeer(peer, relay, (err, conn) => {
                if (err) {
                    return reject(err);
                }

                const dstConn = new Connection();
                dstConn.setInnerConn(conn);
                resolve(dstConn);
            });
        });
    }

    /**
     * Does the peer support the HOP protocol
     *
     * @param {PeerInfo} peer
     * @param {Function} cb
     * @returns {*}
     */
    canHop(peer, cb) {
        cb = once(cb || (() => { }));

        if (!this.relayPeers.get(this.utils.getB58String(peer))) {
            let streamHandler;
            waterfall([
                (wCb) => this._dialRelay(peer, wCb),
                (sh, wCb) => {
                    streamHandler = sh;
                    wCb();
                },
                (wCb) => streamHandler.write(__.protocol.CircuitRelay.encode({
                    type: __.protocol.CircuitRelay.Type.CAN_HOP
                }), wCb),
                (wCb) => streamHandler.read(wCb),
                (msg, wCb) => {
                    const response = __.protocol.CircuitRelay.decode(msg);

                    if (response.code !== __.protocol.CircuitRelay.Status.SUCCESS) {
                        // HOP not supported, skipping
                        return;
                    }

                    // HOP supported adding as relay
                    this.relayPeers.set(this.utils.getB58String(peer), peer);
                    wCb(null);
                }
            ], cb);
        }

        return cb(null);
    }

    /**
     * Dial the destination peer over a relay
     *
     * @param {multiaddr} dstMa
     * @param {Connection|PeerInfo} relay
     * @param {Function} cb
     * @return {Function|void}
     * @private
     */
    _dialPeer(dstMa, relay, cb) {
        if (is.function(relay)) {
            cb = relay;
            relay = null;
        }

        if (!cb) {
            cb = () => { };
        }

        dstMa = multi.address.create(dstMa);
        // if no relay provided, connect on all available relays until one succeeds
        if (!relay) {
            const relays = Array.from(this.relayPeers.values());
            const next = (nextRelay) => {
                if (!nextRelay) {
                    const err = "no relay peers were found or all relays failed to connect";
                    return cb(err);
                }

                return this._negotiateRelay(nextRelay, dstMa, (err, conn) => {
                    if (err) {
                        return next(relays.shift());
                    }
                    cb(null, conn);
                });
            };
            next(relays.shift());
        } else {
            return this._negotiateRelay(relay, dstMa, (err, conn) => {
                if (err) {
                    return cb(err);
                }

                return cb(null, conn);
            });
        }
    }

    /**
     * Negotiate the relay connection
     *
     * @param {Multiaddr|PeerInfo|Connection} relay - the Connection or PeerInfo of the relay
     * @param {multiaddr} dstMa - the multiaddr of the peer to relay the connection for
     * @param {Function} callback - a callback which gets the negotiated relay connection
     * @returns {void}
     * @private
     *
     * @memberOf Dialer
     */
    _negotiateRelay(relay, dstMa, callback) {
        dstMa = multi.address.create(dstMa);

        const srcMas = this.swarm._peerInfo.multiaddrs.toArray();
        let streamHandler;
        waterfall([
            (cb) => {
                if (relay instanceof Connection) {
                    return cb(null, new __.StreamHandler(relay));
                }
                return this._dialRelay(this.utils.peerInfoFromMa(relay), cb);
            },
            (sh, cb) => {
                streamHandler = sh;
                cb(null);
            },
            (cb) => {
                // negotiating relay for peer dstMa
                streamHandler.write(
                    __.protocol.CircuitRelay.encode({
                        type: __.protocol.CircuitRelay.Type.HOP,
                        srcPeer: {
                            id: this.swarm._peerInfo.id.id,
                            addrs: srcMas.map((addr) => addr.buffer)
                        },
                        dstPeer: {
                            id: PeerId.createFromBase58(dstMa.getPeerId()).id,
                            addrs: [dstMa.buffer]
                        }
                    }), cb);
            },
            (cb) => streamHandler.read(cb),
            (msg, cb) => {
                const message = __.protocol.CircuitRelay.decode(msg);
                if (message.type !== __.protocol.CircuitRelay.Type.STATUS) {
                    return cb(new Error("Got invalid message type - " +
                        `expected ${__.protocol.CircuitRelay.Type.STATUS} got ${message.type}`));
                }

                if (message.code !== __.protocol.CircuitRelay.Status.SUCCESS) {
                    return cb(new Error(`Got ${message.code} error code trying to connect over relay`));
                }

                cb(null, new Connection(streamHandler.rest()));
            }
        ], callback);
    }

    /**
     * Dial a relay peer by its PeerInfo
     *
     * @param {PeerInfo} peer - the PeerInfo of the relay peer
     * @param {Function} cb - a callback with the connection to the relay peer
     * @returns {Function|void}
     * @private
     */
    _dialRelay(peer, cb) {
        cb = once(cb || (() => { }));

        this.swarm.connect(peer, multicodec.relay).catch(cb).then((conn) => cb(null, new __.StreamHandler(conn)));
    }
}
