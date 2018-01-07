const getPeerInfo = require("./get_peer_info");

const {
    is,
    netron2: { Connection, circuit: { Circuit }, multistream }
} = adone;

const protocolMuxer = require("./protocol_muxer");

const dial = function (swarm) {
    return (peer, protocol, callback) => {
        if (is.function(protocol)) {
            callback = protocol;
            protocol = null;
        }

        callback = callback || function noop() { };
        const pi = getPeerInfo(peer, swarm._peerBook);

        const proxyConn = new Connection();

        const b58Id = pi.id.toB58String();
        adone.log("dialing %s", b58Id);

        const protocolHandshake = function (conn, protocol, cb) {
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

        const attemptMuxerUpgrade = function (conn, cb) {
            const muxers = Object.keys(swarm.muxers);
            if (muxers.length === 0) {
                return cb(new Error("no muxers available"));
            }

            // 1. try to handshake in one of the muxers available
            // 2. if succeeds
            //  - add the muxedConn to the list of muxedConns
            //  - add incomming new streams to connHandler

            const ms = new multistream.Dialer();

            const nextMuxer = function (key) {
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

                    const muxedConn = swarm.muxers[key].dialer(conn);
                    swarm.muxedConns[b58Id] = {};
                    swarm.muxedConns[b58Id].muxer = muxedConn;
                    // should not be needed anymore - swarm.muxedConns[b58Id].conn = conn

                    muxedConn.once("close", () => {
                        const b58Str = pi.id.toB58String();
                        delete swarm.muxedConns[b58Str];
                        pi.disconnect();
                        swarm._peerBook.get(b58Str).disconnect();
                        setImmediate(() => swarm.emit("peer-mux-closed", pi));
                    });

                    // For incoming streams, in case identify is on
                    muxedConn.on("stream", (conn) => {
                        protocolMuxer(swarm.protocols, conn);
                    });

                    setImmediate(() => swarm.emit("peer-mux-established", pi));

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

        const openConnInMuxedConn = function (muxer, cb) {
            cb(muxer.newStream());
        };

        const gotMuxer = function (muxer) {
            if (swarm.identify) {
                // TODO: Consider:
                // 1. overload getPeerInfo
                // 2. exec identify (through getPeerInfo)
                // 3. update the peerInfo that is already stored in the conn
            }

            openConnInMuxedConn(muxer, (conn) => {
                protocolHandshake(conn, protocol, callback);
            });
        };

        const gotWarmedUpConn = function (conn) {
            conn.setPeerInfo(pi);
            attemptMuxerUpgrade(conn, (err, muxer) => {
                if (!protocol) {
                    if (err) {
                        swarm.conns[b58Id] = conn;
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

        const attemptDial = function (pi, cb) {
            if (!swarm.hasTransports()) {
                return cb(new Error("No transports registered, dial not possible"));
            }

            const tKeys = swarm.availableTransports(pi);

            let circuitTried = false;

            const nextTransport = function (key) {
                let transport = key;
                if (!transport) {
                    if (circuitTried) {
                        return cb(new Error("Circuit already tried!"));
                    }

                    if (!swarm.transports[Circuit.tag]) {
                        return cb(new Error("Circuit not enabled!"));
                    }

                    adone.log("Falling back to dialing over circuit");
                    pi.multiaddrs.add(`/p2p-circuit/ipfs/${pi.id.toB58String()}`);
                    circuitTried = true;
                    transport = Circuit.tag;
                }

                adone.log(`dialing transport ${transport}`);
                swarm.transport.dial(transport, pi, (err, conn) => {
                    if (err) {
                        adone.log(err);
                        return nextTransport(tKeys.shift());
                    }

                    const cryptoDial = function () {
                        const ms = new multistream.Dialer();
                        ms.handle(conn, (err) => {
                            if (err) {
                                return cb(err);
                            }

                            const myId = swarm._peerInfo.id;
                            adone.log("selecting crypto: %s", swarm.crypto.tag);
                            ms.select(swarm.crypto.tag, (err, conn) => {
                                if (err) {
                                    return cb(err); 
                                }
                                
                                const wrapped = swarm.crypto.encrypt(myId, conn, pi.id, (err) => {
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

        if (!swarm.muxedConns[b58Id]) {
            if (!swarm.conns[b58Id]) {
                attemptDial(pi, (err, conn) => {
                    if (err) {
                        return callback(err);
                    }
                    gotWarmedUpConn(conn);
                });
            } else {
                const conn = swarm.conns[b58Id];
                swarm.conns[b58Id] = undefined;
                gotWarmedUpConn(conn);
            }
        } else {
            if (!protocol) {
                return callback();
            }
            gotMuxer(swarm.muxedConns[b58Id].muxer);
        }

        return proxyConn;
    };
};

module.exports = dial;
