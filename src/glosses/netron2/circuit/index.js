const {
    is,
    multi
} = adone;

const __ = adone.lazifyPrivate({
    CircuitDialer: "./circuit/dialer",
    StreamHandler: "./circuit/stream_handler",
    Hop: "./circuit/hop",
    Stop: "./circuit/stop",
    protocol: "./protocol",
    utils: "./circuit/utils",
    multicodec: "./multicodec",
    Listener: "./listener"
}, exports, require);

export class Circuit {
    static get tag() {
        return "Circuit";
    }

    /**
     * Creates an instance of Dialer.
     *
     * @param {Swarm} swarm - the swarm
     * @param {any} options - config options
     *
     * @memberOf Dialer
     */
    constructor(swarm, options) {
        this.options = options || {};

        this.swarm = swarm;
        this.dialer = null;
        this.utils = __.utils(swarm);
        this.peerInfo = this.swarm._peerInfo;
        this.relays = this.filter(this.peerInfo.multiaddrs.toArray());

        // if no explicit relays, add a default relay addr
        if (this.relays.length === 0) {
            this.peerInfo
                .multiaddrs
                .add(`/p2p-circuit/ipfs/${this.peerInfo.id.asBase58()}`);
        }

        this.dialer = new __.CircuitDialer(swarm, options);

        this.swarm.on("peer-mux-established", this.dialer.canHop.bind(this.dialer));
        this.swarm.on("peer-mux-closed", (peerInfo) => {
            this.dialer.relayPeers.delete(peerInfo.id.asBase58());
        });
    }

    /**
     * Dial the relays in the Addresses.Swarm config
     *
     * @param {Array} relays
     * @return {void}
     */
    _dialSwarmRelays() {
        // if we have relay addresses in swarm config, then dial those relays
        this.relays.forEach((relay) => {
            const relaySegments = relay
                .toString()
                .split("/p2p-circuit")
                .filter((segment) => segment.length);

            relaySegments.forEach((relaySegment) => {
                this.dialer._dialRelay(this.utils.peerInfoFromMa(multi.address.create(relaySegment)));
            });
        });
    }

    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to dial
     * @param {Object} options - dial options
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     * @memberOf Dialer
     */
    dial(ma, options, cb) {
        return this.dialer.dial(ma, options, cb);
    }

    /**
     * Create a listener
     *
     * @param {any} options
     * @param {Function} handler
     * @return {listener}
     */
    createListener(handler, options = {}) {
        const listener = new __.Listener(this.swarm, handler, options);
        listener.on("listen", this._dialSwarmRelays.bind(this));
        return listener;
    }

    /**
     * Filter check for all multiaddresses
     * that this transport can dial on
     *
     * @param {any} multiaddrs
     * @returns {Array<multiaddr>}
     *
     * @memberOf Dialer
     */
    filter(multiaddrs) {
        if (!is.array(multiaddrs)) {
            multiaddrs = [multiaddrs];
        }
        return multiaddrs.filter((ma) => {
            return multi.address.validator.Circuit.matches(ma);
        });
    }
}
