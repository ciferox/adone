const each = require("async/each");
const series = require("async/series");

const {
    assert,
    event,
    is,
    multi,
    netron2: { PeerId, PeerInfo, PeerBook, Ping, swarm: { Swarm } },
    util
} = adone;

const NOT_STARTED_ERROR_MESSAGE = "The netcore is not started yet";

const getMuxers = (muxers) => {
    if (!muxers) {
        return [adone.netron2.multiplex, adone.netron2.spdy];
    }

    return util.arrify(muxers).map((muxer) => {
        if (is.string(muxer)) {
            switch (muxer.trim().toLowerCase()) {
                case "spdy": return adone.netron2.spdy;
                case "multiplex": return adone.netron2.multiplex;
                default:
                    throw new Error(`${muxer} muxer not available`);
            }
        }

        return muxer;
    });
};

const getTransports = (transports) => {
    if (!transports) {
        return [new adone.netron2.transport.TCP()];
    }

    return util.arrify(transports).map((transport) => {
        if (is.string(transport)) {
            switch (transport.trim().toLowerCase()) {
                case "tcp": return new adone.netron2.transport.TCP();
                case "ws": return new adone.netron2.transport.WS();
                default:
                    throw new Error(`${transport} muxer not available`);
            }
        }

        return transport;
    });
};

export default class NetCore extends event.Emitter {
    constructor({ peer, transport, muxer, crypto, discovery, dht, relay } = {}) {
        super();

        if (!is.peerInfo(peer)) {
            throw new adone.x.NotValid("PeerInfo instance is not valid");
        }

        if (!transport) {
            throw new Error("No transports were present");
        }

        this.peerInfo = peer;
        this.transports = getTransports(transport);
        this.muxers = getMuxers(muxer);
        this.cryptos = util.arrify(crypto);
        this.discovery = discovery;
        this.peerBook = new PeerBook();

        this.started = false;

        this.swarm = new Swarm(this.peerInfo, this.peerBook);

        // Attach stream multiplexers
        if (this.muxers) {
            this.muxers.forEach((muxer) => this.swarm.connection.addStreamMuxer(muxer));

            // If muxer exists, we can use Identify
            this.swarm.connection.reuse();

            // If muxer exists, we can use Relay for listening/dialing
            this.swarm.connection.enableCircuitRelay(relay);

            // Received incommind dial and muxer upgrade happened,
            // reuse this muxed connection
            this.swarm.on("peer-mux-established", (peerInfo) => {
                this.emit("peer:connect", peerInfo);
            });

            this.swarm.on("peer-mux-closed", (peerInfo) => {
                this.emit("peer:disconnect", peerInfo);
                // this.peerBook.delete(peerInfo);
            });
        }

        // Attach crypto channels
        this.cryptos.forEach((crypto) => {
            this.swarm.connection.crypto(crypto.tag, crypto.encrypt);
        });

        // Attach discovery mechanisms
        if (discovery) {
            let discoveries = discovery;
            discoveries = util.arrify(discoveries);

            discoveries.forEach((d) => {
                d.on("peer", (peerInfo) => this.emit("peer:discovery", peerInfo));
            });
        }

        // Mount default protocols
        Ping.mount(this.swarm);

        // dht provided components (peerRouting, contentRouting, dht)
        if (dht) {
            this._dht = new adone.netron2.dht.KadDHT(this.swarm, is.plainObject(dht) ? dht : {});
        }

        this.peerRouting = {
            findPeer: (id, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.findPeer(id, callback);
            }
        };

        this.contentRouting = {
            findProviders: (key, timeout, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.findProviders(key, timeout, callback);
            },
            provide: (key, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.provide(key, callback);
            }
        };

        this.dht = {
            put: (key, value, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.put(key, value, callback);
            },
            get: (key, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.get(key, callback);
            },
            getMany(key, nVals, callback) {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.getMany(key, nVals, callback);
            }
        };

        // so that we can have webrtc-star addrs without adding manually the id
        const maOld = [];
        const maNew = [];
        this.peerInfo.multiaddrs.toArray().forEach((ma) => {
            if (!ma.getPeerId()) {
                maOld.push(ma);
                maNew.push(ma.encapsulate(`/ipfs/${this.peerInfo.id.asBase58()}`));
            }
        });
        this.peerInfo.multiaddrs.replace(maOld, maNew);

        const multiaddrs = this.peerInfo.multiaddrs.toArray();
        this.transports.forEach((transport) => {
            if (transport.filter(multiaddrs).length > 0) {
                this.swarm.tm.add(transport.tag || transport.constructor.name, transport);
            }
        });
    }

    /**
     * Start the net core: create listeners on the multiaddrs the Peer wants to listen
     */
    async start() {
        if (!this.started) {
            const transports = this.transports;
            let ws;
            transports.forEach((transport) => {
                if (transport.constructor && transport.constructor.name === "WebSockets") {
                    // TODO find a cleaner way to signal that a transport is always used for dialing, even if no listener
                    ws = transport;
                }
            });

            return new Promise((resolve, reject) => {
                series([
                    (cb) => this.swarm.listen(cb),
                    (cb) => {
                        if (ws && !this.swarm.tm.has(ws.tag || ws.constructor.name)) {
                            // always add dialing on websockets
                            this.swarm.tm.add(ws.tag || ws.constructor.name, ws);
                        }

                        // all transports need to be setup before discover starts
                        if (this.discovery) {
                            return each(this.discovery, (d, cb) => d.start(cb), cb);
                        }
                        cb();
                    },
                    (cb) => {
                        // TODO: chicken-and-egg problem:
                        // have to set started here because DHT requires libp2p is already started
                        this.started = true;
                        if (this._dht) {
                            return this._dht.start(cb);
                        }
                        cb();
                    },
                    (cb) => {
                        // detect which multiaddrs we don't have a transport for and remove them
                        const multiaddrs = this.peerInfo.multiaddrs.toArray();
                        transports.forEach((transport) => {
                            multiaddrs.forEach((multiaddr) => {
                                if (!multiaddr.toString().match(/\/p2p-circuit($|\/)/) &&
                                    !transports.find((transport) => transport.filter(multiaddr).length > 0)) {
                                    this.peerInfo.multiaddrs.delete(multiaddr);
                                }
                            });
                        });
                        cb();
                    },
                    (cb) => {
                        this.emit("start");
                        cb();
                    }
                ], (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }

    /**
     * Stop the netcore if it already started by closing its listeners and open connections.
     */
    stop() {
        if (this.started) {
            if (this.discovery) {
                this.discovery.forEach((d) => {
                    setImmediate(() => d.stop(() => { }));
                });
            }

            return new Promise((resolve, reject) => {
                series([
                    (cb) => {
                        if (this._dht) {
                            return this._dht.stop(cb);
                        }
                        cb();
                    },
                    (cb) => this.swarm.close(cb),
                    (cb) => {
                        this.emit("stop");
                        cb();
                    }
                ], (err) => {
                    this.started = false;
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }

    async ping(peer) {
        assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE);
        const peerInfo = await this._getPeerInfo(peer);
        return new Ping(this.swarm, peerInfo);
    }

    async connect(peer, protocol) {
        const peerInfo = await this._getPeerInfo(peer);
        return new Promise((resolve, reject) => {
            this.swarm.dial(peerInfo, protocol, (err, conn) => {
                if (err) {
                    return reject(err);
                }
                resolve(conn);
            });
        });
    }

    async disconnect(peer) {
        // assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE);

        const peerInfo = await this._getPeerInfo(peer);
        return new Promise((resolve, reject) => {
            this.swarm.hangUp(peerInfo, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    handle(protocol, handlerFunc, matchFunc) {
        this.swarm.handle(protocol, handlerFunc, matchFunc);
    }

    unhandle(protocol) {
        this.swarm.unhandle(protocol);
    }

    /**
     * Helper method to check the data type of peer and convert it to PeerInfo
     */
    _getPeerInfo(peer) {
        let p;
        // PeerInfo
        if (is.peerInfo(peer)) {
            p = peer;
            // Multiaddr instance or Multiaddr String
        } else if (multi.address.isMultiaddr(peer) || is.string(peer)) {
            if (is.string(peer)) {
                peer = multi.address.create(peer);
            }
            const peerIdB58Str = peer.getPeerId();
            try {
                p = this.peerBook.get(peerIdB58Str);
            } catch (err) {
                p = new PeerInfo(PeerId.createFromBase58(peerIdB58Str));
            }
            p.multiaddrs.add(peer);

            // PeerId
        } else if (is.peerId(peer)) {
            const peerIdB58Str = peer.asBase58();
            try {
                p = this.peerBook.get(peerIdB58Str);
            } catch (err) {
                return new Promise((resolve, reject) => {
                    return this.peerRouting.findPeer(peer, (err, result) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(result);
                    });
                });
            }
        } else {
            throw new Error("peer type not recognized");
        }

        return p;
    }
}
