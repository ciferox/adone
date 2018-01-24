const parallel = require("async/parallel");
const protocolMuxer = require("./protocol_muxer");

const {
    is,
    util: { once, arrify }
} = adone;

const __ = adone.private(adone.netron2.swarm);

const dialables = (tp, multiaddrs) => tp.filter(multiaddrs);

export default class TransportManager {
    /**
     * 
     * @param {Swarm} swarm  instance os Swarm
     * @param {integer} options.dialTimeout  the amount of time a single dial has to succeed
     * @param {integer} options.perPeerRateLimit  number of concurrent outbound dials to make per peer
     */
    constructor(swarm, { dialTimeout = 30 * 1000, perPeerRateLimit = 8 } = {}) {
        this.swarm = swarm;
        this.dialer = new __.LimitDialer(perPeerRateLimit, dialTimeout);
        this.transports = {};
    }

    add(key, transport) {
        if (this.transports[key]) {
            throw new adone.x.Exists(`Transport '${key}' is already exist`);
        }
        this.transports[key] = transport;
        this.transports[key].listeners = arrify(transport.listeners);
    }

    has(key) {
        return Boolean(this.transports[key]);
    }

    dial(key, pi, callback) {
        const t = this.transports[key];
        let multiaddrs = pi.multiaddrs.toArray();

        if (!is.array(multiaddrs)) {
            multiaddrs = [multiaddrs];
        }
        // filter the multiaddrs that are actually valid for this transport (use a func from the transport itself) (maybe even make the transport do that)
        multiaddrs = dialables(t, multiaddrs);

        this.dialer.dialMany(pi.id, t, multiaddrs, (err, success) => {
            if (err) {
                return callback(err);
            }

            pi.connect(success.multiaddr);
            this.swarm._peerBook.set(pi);
            callback(null, success.conn);
        });
    }

    listen(key, options, handler, callback) {
        const multiaddrs = dialables(this.transports[key], this.swarm._peerInfo.multiaddrs.distinct());
        const transport = this.transports[key];
        let freshMultiaddrs = [];

        transport.listeners = arrify(transport.listeners);

        // if no handler is passed, we pass conns to protocolMuxer
        if (!handler) {
            handler = protocolMuxer.bind(null, this.swarm.protocols);
        }

        const createListeners = multiaddrs.map((ma) => {
            return (cb) => {
                const done = once(cb);
                const listener = transport.createListener(handler);
                listener.once("error", done);

                listener.listen(ma, (err) => {
                    if (err) {
                        return done(err);
                    }
                    listener.removeListener("error", done);
                    listener.getAddrs((err, addrs) => {
                        if (err) {
                            return done(err);
                        }
                        freshMultiaddrs = freshMultiaddrs.concat(addrs);
                        transport.listeners.push(listener);
                        done();
                    });
                });
            };
        });

        parallel(createListeners, (err) => {
            if (err) {
                return callback(err);
            }

            // cause we can listen on port 0 or 0.0.0.0
            this.swarm._peerInfo.multiaddrs.replace(multiaddrs, freshMultiaddrs);
            callback();
        });
    }

    close(key, callback) {
        const transport = this.transports[key];

        if (!transport) {
            return callback(new Error(`Trying to close non existing transport: ${key}`));
        }

        parallel(transport.listeners.map((listener) => {
            return (cb) => {
                listener.close(cb);
            };
        }), callback);
    }
}
