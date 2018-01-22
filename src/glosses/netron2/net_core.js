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

export default class NetCore extends event.Emitter {
    constructor(_modules, _peerInfo, _peerBook, _options) {
        super();
        assert(_modules, "requires modules to equip netcore with features");
        assert(_peerInfo, "requires a PeerInfo instance");

        this.modules = _modules;
        this.peerInfo = _peerInfo;
        this.peerBook = _peerBook || new PeerBook();
        _options = _options || {};

        this._isStarted = false;

        this.swarm = new Swarm(this.peerInfo, this.peerBook);

        if (this.modules.connection) {
            // Attach stream multiplexers
            if (this.modules.connection.muxer) {
                let muxers = this.modules.connection.muxer;
                muxers = util.arrify(muxers);
                muxers.forEach((muxer) => this.swarm.connection.addStreamMuxer(muxer));

                // If muxer exists, we can use Identify
                this.swarm.connection.reuse();

                // If muxer exists, we can use Relay for listening/dialing
                this.swarm.connection.enableCircuitRelay(_options.relay);

                // Received incommind dial and muxer upgrade happened,
                // reuse this muxed connection
                this.swarm.on("peer-mux-established", (peerInfo) => {
                    this.emit("peer:connect", peerInfo);
                    this.peerBook.put(peerInfo);
                });

                this.swarm.on("peer-mux-closed", (peerInfo) => {
                    this.emit("peer:disconnect", peerInfo);
                });
            }

            // Attach crypto channels
            if (this.modules.connection.crypto) {
                let cryptos = this.modules.connection.crypto;
                cryptos = util.arrify(cryptos);
                cryptos.forEach((crypto) => {
                    this.swarm.connection.crypto(crypto.tag, crypto.encrypt);
                });
            }
        }

        // Attach discovery mechanisms
        if (this.modules.discovery) {
            let discoveries = this.modules.discovery;
            discoveries = util.arrify(discoveries);

            discoveries.forEach((discovery) => {
                discovery.on("peer", (peerInfo) => this.emit("peer:discovery", peerInfo));
            });
        }

        // Mount default protocols
        Ping.mount(this.swarm);

        // dht provided components (peerRouting, contentRouting, dht)
        if (_modules.DHT) {
            this._dht = new this.modules.DHT(this.swarm, {
                kBucketSize: 20,
                datastore: _options.DHT && _options.DHT.datastore
            });
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

        if (!this.modules.transport) {
            throw new Error("no transports were present");
        }

        this.modules.transport = util.arrify(this.modules.transport);
        const transports = this.modules.transport;

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
        transports.forEach((transport) => {
            if (transport.filter(multiaddrs).length > 0) {
                this.swarm.transport.add(transport.tag || transport.constructor.name, transport);
            }
        });
    }

    /**
     * Start the net core: create listeners on the multiaddrs the Peer wants to listen
     */
    async start() {
        const transports = this.modules.transport;
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
                    if (ws && !this.swarm.transport.has(ws.tag || ws.constructor.name)) {
                        // always add dialing on websockets
                        this.swarm.transport.add(ws.tag || ws.constructor.name, ws);
                    }

                    // all transports need to be setup before discover starts
                    if (this.modules.discovery) {
                        return each(this.modules.discovery, (d, cb) => d.start(cb), cb);
                    }
                    cb();
                },
                (cb) => {
                    // TODO: chicken-and-egg problem:
                    // have to set started here because DHT requires libp2p is already started
                    this._isStarted = true;
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

    /**
     * Stop the net core by closing its listeners and open connections
     */
    stop() {
        if (this.modules.discovery) {
            this.modules.discovery.forEach((discovery) => {
                setImmediate(() => discovery.stop(() => { }));
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
                this._isStarted = false;
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    isStarted() {
        return this._isStarted;
    }

    async ping(peer) {
        assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE);
        const peerInfo = await this._getPeerInfo(peer);
        return new Ping(this.swarm, peerInfo);
    }

    async connect(peer, protocol) {
        // assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE);

        const peerInfo = await this._getPeerInfo(peer);
        return new Promise((resolve, reject) => {
            this.swarm.dial(peerInfo, protocol, (err, conn) => {
                if (err) {
                    return reject(err);
                }
                this.peerBook.put(peerInfo);
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
