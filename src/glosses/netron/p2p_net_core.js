const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    error,
    is,
    netron: { AbstractNetCore, RemotePeer },
    p2p: { PeerId, PeerInfo, GossipSub, Node, KadDHT, transport: { TCP, WS }, MulticastDNS, Bootstrap, secio, muxer: { spdy, mplex } }
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
    return [mplex, spdy];

};

class NetCoreNode extends Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [
                    TCP,
                    // WS
                ],
                streamMuxer: getMuxers(_options.muxer),
                connEncryption: [
                    secio
                ],
                peerDiscovery: [
                    MulticastDNS,
                    // Bootstrap
                ],
                dht: KadDHT,
                // pubsub: GossipSub
            },
            dialer: {
                maxParallelDials: 150, // 150 total parallel multiaddr dials
                maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
                dialTimeout: 10e3 // 10 second dial timeout per peer dial
            },
            connectionManager: {
                maxConnections: Infinity,
                minConnections: 0,
                pollInterval: 2000,
                defaultPeerValue: 1,
                // The below values will only be taken into account when Metrics are enabled
                maxData: Infinity,
                maxSentData: Infinity,
                maxReceivedData: Infinity,
                maxEventLoopDelay: Infinity,
                movingAverageInterval: 60000
            },
            config: {
                peerDiscovery: {
                    autoDial: true,
                    mdns: {
                        interval: 10000,
                        enabled: true
                    },
                    bootstrap: {
                        interval: 10000,
                        enabled: false,
                        list: _options.bootstrapList
                    }
                },
                // relay: {
                //     enabled: false,
                //     hop: {
                //         enabled: false,
                //         active: false
                //     }
                // },
                dht: {
                    kBucketSize: 20,
                    randomWalk: {
                        enabled: true, // Allows to disable discovery (enabled by default)
                        interval: 300e3,
                        timeout: 10e3
                    },
                    enabled: false
                },
                // pubsub: {
                //     enabled: false,
                //     emitSelf: true, // whether the node should emit to self on publish, in the event of the topic being subscribed
                //     signMessages: true, // if messages should be signed
                //     strictSigning: true // if message signing should be required
                // }
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
        this.remotes = new Map();
    }

    async start({ addr = DEFAULT_ADDR, netron = null } = {}) {
        if (this[STARTED] || this[STARTING]) {
            return;
        }
        this[STARTING] = true;

        await this._createNode(addr);

        if (is.netron(netron)) {
            this.netron = netron;

            this.node.handle(NETRON_PROTOCOL, ({ connection, stream, protocol }) => {
                const peer = new RemotePeer({
                    netron
                });
                this.remotes.set(connection.remoteAddr.toString(), peer);
                peer._updateConnectionInfo({
                    peerId: connection.remotePeer.toB58String(),
                    stream,
                    protocol
                });
            });
        }
        await this.node.start();
        this[STARTING] = false;
        this[STARTED] = true;
    }

    async stop() {
        if (!is.null(this.node)) {
            if (this[STARTED]) {
                await this.node.stop();
                // TODO: need more careful checking before mark as not-STARTED.
                this[STARTED] = false;
            }
        }
    }

    async connect({ addr, protocols = [], netron = null } = {}) {
        await this._createNode();

        if (!adone.multiformat.multiaddr.isMultiaddr(addr) && !is.string(addr) && !is.peerInfo(addr)) {
            throw new Error("Incorrect value of `addr`. Should be instance of multiaddr or PeerInfo");
        }

        let peerId;

        if (is.netron(netron)) {
            this.netron = netron;
            protocols.push(NETRON_PROTOCOL);

            if (is.string(addr)) {
                addr = new adone.multiformat.multiaddr(addr);
            }

            if (adone.multiformat.multiaddr.isMultiaddr(addr)) {
                peerId = addr.getPeerId();
            } else if (is.peerInfo(addr)) {
                peerId = addr.id.toB58String();
            }

            try {
                return netron.getPeer(peerId);
            } catch (err) {
                // fresh peer...
            }
        }

        const { stream, protocol } = await this.node.dialProtocol(addr, protocols);
        if (is.netron(netron) && protocol === NETRON_PROTOCOL) {
            const peer = new RemotePeer({
                netron
            });
            await peer._updateConnectionInfo({
                peerId,
                stream,
                protocol
            });

            return peer;
        }
    }

    disconnect(peer) {
        // const id = this.info.id.toB58String();
        // this.netCore.node.on("peer:disconnect", (info) => {
        //     if (id === info.id) {
        //         resolve();
        //     }
        // });

        return this.node.hangUp(peer);
    }
}
