const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    error,
    is,
    netron: { AbstractNetCore, RemotePeer, ipc: { Node } },
    p2p: { PeerId, PeerInfo, transport: { TCP }, muxer: { pullMplex } }
} = adone;

const NETRON_PROTOCOL = adone.netron.NETRON_PROTOCOL;
const DEFAULT_ADDR = "/unix/tmp/netron.sock";

class NetCoreNode extends Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [TCP],
                streamMuxer: [pullMplex]
            }
        };

        super(defaultsDeep(_options, defaults));
    }
}

const STARTED = Symbol();
const STARTING = Symbol();

export default class IPCNetCore extends AbstractNetCore {
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
}
