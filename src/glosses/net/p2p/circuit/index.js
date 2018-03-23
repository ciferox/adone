const {
    is,
    multi
} = adone;

const __ = adone.lazifyPrivate({
    Connector: "./connector",
    Listener: "./listener",
    StreamHandler: "./circuit/stream_handler",
    Hop: "./circuit/hop",
    Stop: "./circuit/stop",
    protocol: "./protocol",
    utils: "./circuit/utils",
    multicodec: "./multicodec"
}, exports, require);

export class Circuit {
    static get tag() {
        return "Circuit";
    }

    /**
     * Creates an instance of Dialer.
     *
     * @param {Switch} sw - the switch
     * @param {any} options - config options
     *
     * @memberOf Dialer
     */
    constructor(sw, options) {
        this.options = options || {};

        this.switch = sw;
        this.utils = __.utils(sw);
        this.peerInfo = this.switch._peerInfo;
        this.relays = this.filter(this.peerInfo.multiaddrs.toArray());

        // if no explicit relays, add a default relay addr
        if (this.relays.length === 0) {
            this.peerInfo.multiaddrs.add(`//p2p-circuit//p2p/${this.peerInfo.id.asBase58()}`);
        }

        this.connector = new __.Connector(sw, options);

        this.switch.on("peer:mux:established", this.connector.canHop.bind(this.connector));
        this.switch.on("peer:mux:closed", (peerInfo) => {
            this.connector.relayPeers.delete(peerInfo.id.asBase58());
        });
    }

    /**
     * Dial the relays in the Addresses.Switch config
     *
     * @param {Array} relays
     * @return {void}
     */
    _dialSwarmRelays() {
        // if we have relay addresses in switch config, then connect those relays
        this.relays.forEach((relay) => {
            const relaySegments = relay
                .toString()
                .split("/p2p-circuit")
                .filter((segment) => segment.length);

            relaySegments.forEach((relaySegment) => {
                this.connector._dialRelay(this.utils.peerInfoFromMa(multi.address.create(relaySegment)));
            });
        });
    }

    /**
     * Dial a peer over a relay
     *
     * @param {multiaddr} ma - the multiaddr of the peer to connect
     * @param {Object} options - connect options
     * @param {Function} cb - a callback called once dialed
     * @returns {Connection} - the connection
     *
     * @memberOf Dialer
     */
    connect(ma, options, cb) {
        return this.connector.connect(ma, options, cb);
    }

    /**
     * Create a listener
     *
     * @param {any} options
     * @param {Function} handler
     * @return {listener}
     */
    createListener(handler, options = this.options) {
        const listener = new __.Listener(this.switch, handler, options);
        listener.on("listen", this._dialSwarmRelays.bind(this));
        return listener;
    }

    /**
     * Filter check for all multiaddresses
     * that this transport can connect on
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
