const getPeerInfo = require("./get_peer_info");
const protocolMuxer = require("./protocol_muxer");
const plaintext = require("./plaintext");

const {
    is,
    netron2: { Connection, circuit: { Circuit }, multistream }
} = adone;

const __ = adone.lazifyPrivate({
    LimitDialer: "./limit_dialer",
    TransportManager: "./transport_manager",
    ConnectionManager: "./connection_manager"
}, exports, require);

export class Swarm extends adone.event.Emitter {
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

        this.tm = new __.TransportManager(this);
        this.connection = new __.ConnectionManager(this);

        this.handle(this.crypto.tag, (protocol, conn) => {
            const peerId = this._peerInfo.id;
            const wrapped = this.crypto.encrypt(peerId, conn, undefined, () => { });
            return protocolMuxer(this.protocols, wrapped);
        });

        this.setMaxListeners(Infinity);
    }

    hasTransports() {
        const transports = Object.keys(this.tm.transports).filter((t) => t !== "Circuit");
        return transports && transports.length > 0;
    }

    availableTransports(pi) {
        const myAddrs = pi.multiaddrs.toArray();
        const myTransports = Object.keys(this.tm.transports);

        // Only listen on transports we actually have addresses for
        return myTransports.filter((ts) => this.tm.transports[ts].filter(myAddrs).length > 0)
            // push Circuit to be the last proto to be dialed
            .sort((a) => a === "Circuit" ? 1 : 0);
    }

    // Start listening on all available transports
    listen() {
        const transports = this.availableTransports(this._peerInfo);
        return Promise.all(transports.map((ts) => this.tm.listen(ts, {}, null)));
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

    async close() {
        for (const conn of Object.values(this.muxedConns)) {
            /* eslint-disable */
            await new Promise((resolve, reject) => {
                conn.muxer.end((err) => {
                    // If OK things are fine, and someone just shut down
                    if (err && err.message !== "Fatal error: OK") {
                        return reject(err);
                    }
                    resolve();
                });
            });
            /* eslint-enable */
        }

        const promises = [];
        for (const transport of Object.values(this.tm.transports)) {
            for (const listener of transport.listeners) {
                promises.push(listener.close());
            }
        }
        await Promise.all(promises);
    }

    async connect(peer, protocol) {
        return new Promise(async (resolve, reject) => {
            const pi = getPeerInfo(peer, this._peerBook);

            const proxyConn = new Connection();

            const b58Id = pi.id.asBase58();

            const protocolHandshake = (conn, protocol) => {
                const ms = new multistream.Dialer();
                ms.handle(conn, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    ms.select(protocol, (err, conn) => {
                        if (err) {
                            return reject(err);
                        }
                        proxyConn.setInnerConn(conn);
                        resolve(proxyConn);
                    });
                });
            };

            const gotMuxer = (muxer) => {
                if (this.identify) {
                    // TODO: Consider:
                    // 1. overload getPeerInfo
                    // 2. exec identify (through getPeerInfo)
                    // 3. update the peerInfo that is already stored in the conn
                }

                protocolHandshake(muxer.newStream(), protocol);
            };

            const gotWarmedUpConn = (conn) => {
                conn.setPeerInfo(pi);

                const cb = (err, muxer) => {
                    if (!protocol) {
                        if (err) {
                            this.conns[b58Id] = conn;
                        }
                        return resolve(proxyConn);
                    }

                    if (err) {
                        // couldn't upgrade to Muxer, it is ok
                        protocolHandshake(conn, protocol);
                    } else {
                        gotMuxer(muxer);
                    }
                };

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

                        this._peerBook.set(pi);

                        // Prevent unhandled 'error' events
                        muxedConn.on("error", adone.noop);

                        muxedConn.once("close", () => {
                            const b58Str = pi.id.asBase58();
                            delete this.muxedConns[b58Str];
                            pi.disconnect();
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

            if (!this.muxedConns[b58Id]) {
                if (!this.conns[b58Id]) {
                    if (!this.hasTransports()) {
                        return reject(new Error("No transports registered, connect not possible"));
                    }

                    const tKeys = this.availableTransports(pi);

                    let circuitTried = false;

                    const nextTransport = async (key) => {
                        let transport = key;
                        if (is.undefined(transport)) {
                            if (circuitTried) {
                                return reject(new Error("Circuit already tried!"));
                            }

                            if (!this.tm.transports[Circuit.tag]) {
                                return reject(new Error("Circuit not enabled!"));
                            }

                            // Falling back to dialing over circuit
                            pi.multiaddrs.add(`/p2p-circuit/ipfs/${pi.id.asBase58()}`);
                            circuitTried = true;
                            transport = Circuit.tag;
                        }

                        let conn;
                        try {
                            conn = await this.tm.connect(transport, pi); // eslint-disable-line
                        } catch (err) {
                            nextTransport(tKeys.shift());
                        }

                        const ms = new multistream.Dialer();
                        ms.handle(conn, (err) => {
                            if (err) {
                                return reject(err);
                            }

                            const myId = this._peerInfo.id;
                            ms.select(this.crypto.tag, (err, conn) => {
                                if (err) {
                                    return reject(err);
                                }

                                const wrapped = this.crypto.encrypt(myId, conn, pi.id, (err) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    gotWarmedUpConn(wrapped);
                                });
                            });
                        });
                    };

                    nextTransport(tKeys.shift());
                } else {
                    const conn = this.conns[b58Id];
                    this.conns[b58Id] = undefined;
                    gotWarmedUpConn(conn);
                }
            } else {
                if (!protocol) {
                    return resolve(proxyConn);
                }
                gotMuxer(this.muxedConns[b58Id].muxer);
            }
        });
    }

    disconnect(peer) {
        return new Promise((resolve) => {
            const peerInfo = getPeerInfo(peer, this._peerBook);
            const key = peerInfo.id.asBase58();
            if (this.muxedConns[key]) {
                const muxer = this.muxedConns[key].muxer;
                muxer.once("close", () => {
                    delete this.muxedConns[key];
                    resolve();
                });
                muxer.end();
            } else {
                resolve();
            }
        });
    }
}
