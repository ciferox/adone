const {
    error,
    is,
    netron: { createPeerInfo }
} = adone;

export default class AbstractNetCore {
    constructor(options = {}, NetCoreNode) {
        if (!NetCoreNode) {
            throw new error.NotValidException("NetCoreNode should be provided");
        }
        this.options = options;
        this.node = null;
        this.netron = null;
        this.NetCoreNode = NetCoreNode;
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

    async start() {
        throw new error.NotImplementedException("Method start() is not implemented");
    }

    stop() {
        throw new error.NotImplementedException("Method stop() is not implemented");
    }

    /**
     * Connects to remote p2p node identified by peerInfo and optionally using netron.
     * 
     * @param {PeerInfo} options.peerInfo
     * @param {Netron} options.netron
     */
    connect(options) {
        throw new error.NotImplementedException("Method connect() is not implemented");
    }

    disconnect(options) {
        throw new error.NotImplementedException("Method disconnect() is not implemented");
    }

    async _createNode(addr) {
        if (is.null(this.node)) {
            if (!is.peerInfo(this.options.peerInfo)) {
                this.setPeerInfo(await createPeerInfo({
                    addr,
                    bits: 512
                }));
            }
            this.node = new this.NetCoreNode(this.options);

            this.node.on("peer:disconnect", async (peerInfo) => {
                if (is.netron(this.netron)) {
                    try {
                        this.netron.getPeer(peerInfo)._updateConnectionInfo();
                    } catch (err) {
                        // Peer already disconnected, nothing todo...
                    }
                }
            });
        }
    }
}
