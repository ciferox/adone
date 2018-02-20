const protocolMuxer = require("./protocol_muxer");

const {
    util: { arrify }
} = adone;

const __ = adone.private(adone.net.p2p.switch);

const dialables = (tp, multiaddrs) => tp.filter(multiaddrs);

export default class TransportManager {
    /**
     * 
     * @param {Switch} sw  instance os Switch
     * @param {integer} options.dialTimeout  the amount of time a single connect has to succeed
     * @param {integer} options.perPeerRateLimit  number of concurrent outbound dials to make per peer
     */
    constructor(sw, { dialTimeout = 30 * 1000, perPeerRateLimit = 8 } = {}) {
        this.switch = sw;
        this.dialer = new __.LimitDialer(perPeerRateLimit, dialTimeout);
        this.transports = {};
    }

    add(key, transport) {
        if (this.transports[key]) {
            throw new adone.error.Exists(`Transport '${key}' is already exist`);
        }
        this.transports[key] = transport;
        this.transports[key].listeners = arrify(transport.listeners);
    }

    has(key) {
        return Boolean(this.transports[key]);
    }

    async connect(key, pi) {
        const t = this.transports[key];
        // filter the multiaddrs that are actually valid for this transport (use a func from the transport itself) (maybe even make the transport do that)
        const multiaddrs = dialables(t, arrify(pi.multiaddrs.toArray()));
        const success = await this.dialer.dialMany(pi.id, t, multiaddrs);
        pi.connect(success.multiaddr);
        this.switch._peerBook.set(pi);
        return success.conn;
    }

    async listen(key, options, handler) {
        const multiaddrs = dialables(this.transports[key], this.switch._peerInfo.multiaddrs.distinct());
        const transport = this.transports[key];
        let freshMultiaddrs = [];
        transport.listeners = arrify(transport.listeners);

        // if no handler is passed, we pass conns to protocolMuxer
        if (!handler) {
            handler = protocolMuxer.bind(null, this.switch.protocols);
        }

        for (const ma of multiaddrs) {
            const listener = transport.createListener(handler);
            await listener.listen(ma); // eslint-disable-line

            const addrs = await listener.getAddrs(); // eslint-disable-line
            freshMultiaddrs = freshMultiaddrs.concat(addrs);
            transport.listeners.push(listener);
        }

        // cause we can listen on port 0 or 0.0.0.0
        this.switch._peerInfo.multiaddrs.replace(multiaddrs, freshMultiaddrs);
    }

    close(key) {
        const transport = this.transports[key];
        if (!transport) {
            throw new Error(`Trying to close non existing transport: ${key}`);
        }

        return Promise.all(transport.listeners.map((listener) => listener.close()));
    }
}
