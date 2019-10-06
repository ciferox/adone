const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    error,
    is,
    netron: { RemotePeer },
    p2p: { PeerId, PeerInfo, GossipSub, Node, KadDHT, transport: { TCP, WS }, MulticastDNS, Bootstrap, secio, muxer: { spdy, mplex, pullMplex } },
    util
} = adone;

const NETRON_PROTOCOL = adone.netron.NETRON_PROTOCOL;
const DEFAULT_ADDR = "/ip4/0.0.0.0/tcp/0";

const mapMuxers = function (list) {
    return list.map((pref) => {
        if (!is.string(pref)) {
            return pref;
        }
        switch (pref.trim().toLowerCase()) {
            case "spdy": return spdy;
            case "mplex": return mplex;
            case "pullmplex": return pullMplex;
            default:
                throw new Error(`${pref} muxer not available`);
        }
    });
};

const getMuxers = function (muxers) {
    const muxerPrefs = process.env.LIBP2P_MUXER;
    if (muxerPrefs && !muxers) {
        return mapMuxers(muxerPrefs.split(","));
    } else if (muxers) {
        return mapMuxers(muxers);
    }
    return [pullMplex, mplex, spdy];

};

class DefaultNode extends Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [
                    TCP,
                    WS
                ],
                streamMuxer: getMuxers(_options.muxer),
                connEncryption: [
                    secio
                ],
                peerDiscovery: [
                    MulticastDNS,
                    Bootstrap
                ],
                dht: KadDHT,
                pubsub: GossipSub
            },
            config: {
                peerDiscovery: {
                    autoDial: true,
                    mdns: {
                        interval: 10000,
                        enabled: false
                    },
                    bootstrap: {
                        interval: 10000,
                        enabled: false,
                        list: _options.bootstrapList
                    }
                },
                relay: {
                    enabled: false,
                    hop: {
                        enabled: false,
                        active: false
                    }
                },
                dht: {
                    kBucketSize: 20,
                    randomWalk: {
                        enabled: true, // Allows to disable discovery (enabled by default)
                        interval: 300e3,
                        timeout: 10e3
                    },
                    enabled: true
                },
                pubsub: {
                    enabled: true,
                    emitSelf: true, // whether the node should emit to self on publish, in the event of the topic being subscribed
                    signMessages: true, // if messages should be signed
                    strictSigning: true // if message signing should be required
                }
            }
        };

        super(defaultsDeep(_options, defaults));
    }
}

const STARTED = Symbol();
const STARTING = Symbol();

export default class P2PNetCore {
    constructor(options = {}) {
        this.options = options;
        this.node = null;
        this.netron = null;

        this[STARTED] = false;
        this[STARTING] = false;
    }

    setPeerInfo(peerInfo) {
        if (!this.options.peerInfo) {
            this.options.peerInfo = peerInfo;
        } else {
            throw new error.ExistsException("PeerInfo already setted");
        }
    }

    get peerInfo() {
        return this.options.peerInfo;
    }

    get started() {
        return this[STARTED];
    }

    async start(netron = null) {
        if (this[STARTED] || this[STARTING]) {
            return;
        }

        await this._createNode(DEFAULT_ADDR);

        return new Promise((resolve, reject) => {
            if (is.netron(netron)) {
                this.netron = netron;

                this.node.handle(NETRON_PROTOCOL, async (protocol, conn) => {
                    const peerInfo = await new Promise((resolve, reject) => {
                        conn.getPeerInfo((err, info) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(info);
                        });
                    });
                    const peer = new RemotePeer(peerInfo, this);
                    await peer._updateConnectionInfo(conn, NETRON_PROTOCOL);
                });
            }
            this.node.start((err) => {
                this[STARTING] = false;
                if (err) {
                    reject(err);
                    return;
                }
                this[STARTED] = true;
                resolve();
            });
        });
    }

    stop() {
        if (!is.null(this.node)) {
            if (this[STARTED]) {
                return new Promise((resolve, reject) => {
                    this.node.stop((err) => {
                        // TODO: need more careful checking before mark as not-STARTED.
                        this[STARTED] = false;
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            }
        }
    }

    // /**
    //  * Connects to remote p2p node identified by peerInfo and optionally using netron.
    //  * 
    //  * @param {PeerInfo} peerInfo
    //  * @param {Netron} netron
    //  */
    async connect(addr, netron = null) {
        await this._createNode();

        let peerInfo;
        if (adone.multiformat.multiaddr.isMultiaddr(addr) || is.string(addr)) {
            let ma = addr;
            if (is.string(addr)) {
                ma = new adone.multiformat.multiaddr(addr);
            }
            const peerIdB58Str = ma.getPeerId();
            if (!peerIdB58Str) {
                throw new Error("Peer multiaddr instance or string must include peerId");
            }
            peerInfo = new PeerInfo(PeerId.createFromB58String(peerIdB58Str));
            peerInfo.multiaddrs.add(ma);
        } else {
            peerInfo = addr;
        }

        let protocol = null;

        if (is.netron(netron)) {
            this.netron = netron;
            protocol = NETRON_PROTOCOL;

            try {
                return this.netron.getPeer(peerInfo);
            } catch (err) {
                // fresh peer...
            }
        } else if (is.string(netron)) {
            protocol = netron;
        }

        return new Promise((resolve, reject) => {
            this.node.dialProtocol(peerInfo, protocol, async (err, conn) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (protocol === NETRON_PROTOCOL) {
                    const peer = new RemotePeer(peerInfo, this);
                    await peer._updateConnectionInfo(conn, protocol);
                    resolve(peer);
                    return;
                }
                resolve(conn);
            });
        });
    }

    async _createNode(addrs) {
        if (is.null(this.node)) {
            if (!is.peerInfo(this.options.peerInfo)) {
                this.setPeerInfo(await P2PNetCore.createPeerInfo({
                    addrs,
                    bits: 512
                }));
            }
            this.node = await new DefaultNode(this.options);

            this.node.on("peer:disconnect", async (peerInfo) => {
                if (is.netron(this.netron)) {
                    try {
                        this.netron.getPeer(peerInfo)._updateConnectionInfo(null);
                    } catch (err) {
                        // Peer already disconnected, nothing todo...
                    }
                }
            });
        }
    }

    static createPeerId({ bits } = {}) {
        return new Promise((resolve, reject) => {
            PeerId.create({ bits }, (err, peerId) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(peerId);
            });
        });
    }

    static createPeerInfo({ peerId, addrs, bits } = {}) {
        return new Promise(async (resolve, reject) => {
            if (!is.peerId(peerId)) {
                peerId = await P2PNetCore.createPeerId({ bits });
            }
            PeerInfo.create(peerId, (err, peerInfo) => {
                if (err) {
                    return reject(err);
                }
                util.arrify(addrs).map((ma) => peerInfo.multiaddrs.add(ma));
                resolve(peerInfo);
            });
        });
    }
}
