const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    error,
    is,
    netron: { AbstractNetCore, RemotePeer },
    p2p: { PeerId, PeerInfo, GossipSub, Node, KadDHT, transport: { TCP, WS }, MulticastDNS, Bootstrap, secio, muxer: { spdy, mplex, pullMplex } }
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

class NetCoreNode extends Node {
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

export default class P2PNetCore extends AbstractNetCore {
    constructor(options) {
        super(options, NetCoreNode);
    }

    async start({ addr = DEFAULT_ADDR, netron = null } = {}) {
        if (this[STARTED] || this[STARTING]) {
            return;
        }

        await this._createNode(addr);

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

    async connect({ addr, netron = null } = {}) {
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
        } else if (PeerInfo.isPeerInfo(addr)) {
            peerInfo = addr;
        } else {
            throw new Error("Incorrect value of `addr`. Should be instance of multiaddr or PeerInfo");
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
}
