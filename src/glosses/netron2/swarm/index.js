adone.lazifyPrivate({
    LimitDialer: "./limit_dialer"
}, exports, require);

const each = require("async/each");
const series = require("async/series");
const transport = require("./transport");
const connection = require("./connection");
const getPeerInfo = require("./get_peer_info");
const protocolMuxer = require("./protocol_muxer");
const plaintext = require("./plaintext");

const {
    is,
    netron2: { Connection, circuit: { Circuit }, multistream }
} = adone;

export class Swarm extends adone.event.EventEmitter {
    constructor(peerInfo, peerBook) {
        super();

        if (!peerInfo) {
            throw new adone.x.NotValid("You must provide a `peerInfo`");
        }

        if (!peerBook) {
            throw new adone.x.NotValid("You must provide a `peerBook`");
        }

        this._peerInfo = peerInfo;
        this._peerBook = peerBook;

        this.setMaxListeners(Infinity);
        // transports --
        // { key: transport }; e.g { tcp: <tcp> }
        this.transports = {};

        // connections --
        // { peerIdB58: { conn: <conn> }}
        this.conns = {};

        // {
        //   peerIdB58: {
        //     muxer: <muxer>
        //     conn: <transport socket> // to extract info required for the Identify Protocol
        //   }
        // }
        this.muxedConns = {};

        // { protocol: handler }
        this.protocols = {};

        // { muxerCodec: <muxer> } e.g { '/spdy/0.3.1': spdy }
        this.muxers = {};

        // is the Identify protocol enabled?
        this.identify = false;

        // Crypto details
        this.crypto = plaintext;

        this.transport = transport(this);
        this.connection = connection(this);

        this.handle(this.crypto.tag, (protocol, conn) => {
            const peerId = this._peerInfo.id;
            const wrapped = this.crypto.encrypt(peerId, conn, undefined, () => { });
            return protocolMuxer(this.protocols, wrapped);
        });
    }

    hasTransports() {
        const transports = Object.keys(this.transports).filter((t) => t !== "Circuit");
        return transports && transports.length > 0;
    }

    availableTransports(pi) {
        const myAddrs = pi.multiaddrs.toArray();
        const myTransports = Object.keys(this.transports);

        // Only listen on transports we actually have addresses for
        return myTransports.filter((ts) => this.transports[ts].filter(myAddrs).length > 0)
            // push Circuit to be the last proto to be dialed
            .sort((a) => a === "Circuit" ? 1 : 0);
    }

    // Start listening on all available transports
    listen(callback) {
        each(this.availableTransports(this._peerInfo), (ts, cb) => {
            // Listen on the given transport
            this.transport.listen(ts, {}, null, cb);
        }, callback);
    }

    handle(protocol, handlerFunc, matchFunc) {
        this.protocols[protocol] = {
            handlerFunc,
            matchFunc
        };
    }

    unhandle(protocol) {
        if (this.protocols[protocol]) {
            delete this.protocols[protocol];
        }
    }

    close(callback) {
        series([
            (cb) => each(this.muxedConns, (conn, cb) => {
                // if (!conn) {
                //     return cb();
                // }
                conn.muxer.end((err) => {
                    // If OK things are fine, and someone just shut down
                    if (err && err.message !== "Fatal error: OK") {
                        return cb(err);
                    }
                    cb();
                });
            }, cb),
            (cb) => {
                each(this.transports, (transport, cb) => {
                    each(transport.listeners, (listener, cb) => {
                        listener.close(cb);
                    }, cb);
                }, cb);
            }
        ], callback);
    }

    dial(peer, protocol, callback) {
        if (is.function(protocol)) {
            callback = protocol;
            protocol = null;
        }

        callback = callback || adone.noop;
        const pi = getPeerInfo(peer, this._peerBook);

        const proxyConn = new Connection();

        const b58Id = pi.id.toB58String();
        adone.log("dialing %s", b58Id);

        const protocolHandshake = (conn, protocol, cb) => {
            const ms = new multistream.Dialer();
            ms.handle(conn, (err) => {
                if (err) {
                    return cb(err);
                }
                ms.select(protocol, (err, conn) => {
                    if (err) {
                        return cb(err);
                    }
                    proxyConn.setInnerConn(conn);
                    cb(null, proxyConn);
                });
            });
        };

        const attemptMuxerUpgrade = (conn, cb) => {
            const muxers = Object.keys(this.muxers);
            if (muxers.length === 0) {
                return cb(new Error("no muxers available"));
            }

            // 1. try to handshake in one of the muxers available
            // 2. if succeeds
            //  - add the muxedConn to the list of muxedConns
            //  - add incomming new streams to connHandler

            const ms = new multistream.Dialer();

            const nextMuxer = (key) => {
                adone.log("selecting %s", key);
                ms.select(key, (err, conn) => {
                    if (err) {
                        if (muxers.length === 0) {
                            cb(new Error("could not upgrade to stream muxing"));
                        } else {
                            nextMuxer(muxers.shift());
                        }
                        return;
                    }

                    const muxedConn = this.muxers[key].dialer(conn);
                    this.muxedConns[b58Id] = {};
                    this.muxedConns[b58Id].muxer = muxedConn;
                    // should not be needed anymore - swarm.muxedConns[b58Id].conn = conn

                    muxedConn.once("close", () => {
                        const b58Str = pi.id.toB58String();
                        delete this.muxedConns[b58Str];
                        pi.disconnect();
                        this._peerBook.get(b58Str).disconnect();
                        setImmediate(() => this.emit("peer-mux-closed", pi));
                    });

                    // For incoming streams, in case identify is on
                    muxedConn.on("stream", (conn) => {
                        protocolMuxer(this.protocols, conn);
                    });

                    setImmediate(() => this.emit("peer-mux-established", pi));

                    cb(null, muxedConn);
                });
            };

            ms.handle(conn, (err) => {
                if (err) {
                    return cb(new Error("multistream not supported"));
                }

                nextMuxer(muxers.shift());
            });
        };

        const openConnInMuxedConn = (muxer, cb) => {
            cb(muxer.newStream());
        };

        const gotMuxer = (muxer) => {
            if (this.identify) {
                // TODO: Consider:
                // 1. overload getPeerInfo
                // 2. exec identify (through getPeerInfo)
                // 3. update the peerInfo that is already stored in the conn
            }

            openConnInMuxedConn(muxer, (conn) => {
                protocolHandshake(conn, protocol, callback);
            });
        };

        const gotWarmedUpConn = (conn) => {
            conn.setPeerInfo(pi);
            attemptMuxerUpgrade(conn, (err, muxer) => {
                if (!protocol) {
                    if (err) {
                        this.conns[b58Id] = conn;
                    }
                    return callback();
                }

                if (err) {
                    // couldn't upgrade to Muxer, it is ok
                    protocolHandshake(conn, protocol, callback);
                } else {
                    gotMuxer(muxer);
                }
            });
        };

        const attemptDial = (pi, cb) => {
            if (!this.hasTransports()) {
                return cb(new Error("No transports registered, dial not possible"));
            }

            const tKeys = this.availableTransports(pi);

            let circuitTried = false;

            const nextTransport = (key) => {
                let transport = key;
                if (!transport) {
                    if (circuitTried) {
                        return cb(new Error("Circuit already tried!"));
                    }

                    if (!this.transports[Circuit.tag]) {
                        return cb(new Error("Circuit not enabled!"));
                    }

                    adone.log("Falling back to dialing over circuit");
                    pi.multiaddrs.add(`/p2p-circuit/ipfs/${pi.id.toB58String()}`);
                    circuitTried = true;
                    transport = Circuit.tag;
                }

                adone.log(`dialing transport ${transport}`);
                this.transport.dial(transport, pi, (err, conn) => {
                    if (err) {
                        adone.log(err);
                        return nextTransport(tKeys.shift());
                    }

                    const cryptoDial = () => {
                        const ms = new multistream.Dialer();
                        ms.handle(conn, (err) => {
                            if (err) {
                                return cb(err);
                            }

                            const myId = this._peerInfo.id;
                            adone.log("selecting crypto: %s", this.crypto.tag);
                            ms.select(this.crypto.tag, (err, conn) => {
                                if (err) {
                                    return cb(err);
                                }

                                const wrapped = this.crypto.encrypt(myId, conn, pi.id, (err) => {
                                    if (err) {
                                        return cb(err);
                                    }
                                    cb(null, wrapped);
                                });
                            });
                        });
                    };

                    cryptoDial();
                });
            };

            nextTransport(tKeys.shift());
        };

        if (!this.muxedConns[b58Id]) {
            if (!this.conns[b58Id]) {
                attemptDial(pi, (err, conn) => {
                    if (err) {
                        return callback(err);
                    }
                    gotWarmedUpConn(conn);
                });
            } else {
                const conn = this.conns[b58Id];
                this.conns[b58Id] = undefined;
                gotWarmedUpConn(conn);
            }
        } else {
            if (!protocol) {
                return callback();
            }
            gotMuxer(this.muxedConns[b58Id].muxer);
        }

        return proxyConn;
    }

    hangUp(peer, callback) {
        const peerInfo = getPeerInfo(peer, this.peerBook);
        const key = peerInfo.id.toB58String();
        if (this.muxedConns[key]) {
            const muxer = this.muxedConns[key].muxer;
            muxer.once("close", () => {
                delete this.muxedConns[key];
                callback();
            });
            muxer.end();
        } else {
            callback();
        }
    }
}
