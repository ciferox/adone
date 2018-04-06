const each = require("async/each");
const series = require("async/series");

const {
    assert,
    crypto: { Identity },
    event,
    is,
    multi,
    net: { p2p: { PeerInfo, PeerBook, Ping, switch: { Switch }, floodsub: { FloodSub } } },
    util
} = adone;

const NOT_STARTED_ERROR_MESSAGE = "The netcore is not started yet";

const getMuxers = (muxers) => {
    if (!muxers) {
        return [adone.net.p2p.muxer.mplex, adone.net.p2p.muxer.spdy];
    }

    return util.arrify(muxers).map((muxer) => {
        if (is.string(muxer)) {
            switch (muxer.trim().toLowerCase()) {
                case "spdy": return adone.net.p2p.muxer.spdy;
                case "mplex": return adone.net.p2p.muxer.mplex;
                default:
                    throw new Error(`${muxer} muxer not available`);
            }
        }

        return muxer;
    });
};

const getTransports = (transports) => {
    if (!transports) {
        return [new adone.net.p2p.transport.TCP()];
    }

    return util.arrify(transports).map((transport) => {
        if (is.string(transport)) {
            switch (transport.trim().toLowerCase()) {
                case "tcp": return new adone.net.p2p.transport.TCP();
                case "ws": return new adone.net.p2p.transport.WS();
                default:
                    throw new Error(`${transport} muxer not available`);
            }
        }

        return transport;
    });
};

export default class Core extends event.Emitter {
    constructor({ peer, transport, muxer, crypto, discovery, dht, relay } = {}) {
        super();

        if (!is.p2pPeerInfo(peer)) {
            throw new adone.error.NotValid("PeerInfo instance is not valid");
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

        this.switch = new Switch(this.peerInfo, this.peerBook);

        // Attach stream multiplexers
        if (this.muxers) {
            this.muxers.forEach((muxer) => this.switch.connection.addStreamMuxer(muxer));

            // If muxer exists, we can use Identify
            this.switch.connection.reuse();

            // If muxer exists, we can use Relay for listening/dialing
            this.switch.connection.enableCircuitRelay(relay);

            // Received incommind connect and muxer upgrade happened,
            // reuse this muxed connection
            this.switch.on("peer:mux:established", (peerInfo) => {
                this.emit("peer:connect", peerInfo);
            }).on("peer:mux:closed", (peerInfo) => {
                this.emit("peer:disconnect", peerInfo);
                // this.peerBook.delete(peerInfo);
            });
        }

        // Attach crypto channels
        this.cryptos.forEach((crypto) => {
            this.switch.connection.crypto(crypto.tag, crypto.encrypt);
        });

        // Attach discovery mechanisms
        if (discovery) {
            let discoveries = discovery;
            discoveries = util.arrify(discoveries);

            discoveries.forEach((d) => {
                d.on("peer", (peerInfo) => this.emit("peer:discovery", peerInfo));
            });
        }

        // dht provided components (peerRouting, contentRouting, dht)
        if (dht) {
            this._dht = new adone.net.p2p.dht.KadDHT(this.switch, is.plainObject(dht) ? dht : {});
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
            getMany: (key, nVals, callback) => {
                if (!this._dht) {
                    return callback(new Error("DHT is not available"));
                }

                this._dht.getMany(key, nVals, callback);
            }
        };

        this._floodSub = new FloodSub(this);

        this.pubsub = {
            subscribe: (topic, options, handler, callback) => {
                if (is.function(options)) {
                    callback = handler;
                    handler = options;
                    options = {};
                }

                if (!this.started && !this._floodSub.started) {
                    return setImmediate(() => callback(new Error(NOT_STARTED_ERROR_MESSAGE)));
                }

                const subscribe = (cb) => {
                    if (this._floodSub.listenerCount(topic) === 0) {
                        this._floodSub.subscribe(topic);
                    }

                    this._floodSub.on(topic, handler);
                    setImmediate(cb);
                };

                subscribe(callback);
            },

            unsubscribe: (topic, handler) => {
                if (!this.started && !this._floodSub.started) {
                    throw new Error(NOT_STARTED_ERROR_MESSAGE);
                }

                this._floodSub.removeListener(topic, handler);

                if (this._floodSub.listenerCount(topic) === 0) {
                    this._floodSub.unsubscribe(topic);
                }
            },

            publish: (topic, data, callback) => {
                if (!this.started && !this._floodSub.started) {
                    return setImmediate(() => callback(new Error(NOT_STARTED_ERROR_MESSAGE)));
                }

                if (!is.buffer(data)) {
                    return setImmediate(() => callback(new Error("data must be a Buffer")));
                }

                this._floodSub.publish(topic, data);

                setImmediate(() => callback());
            },

            ls: (callback) => {
                if (!this.started && !this._floodSub.started) {
                    return setImmediate(() => callback(new Error(NOT_STARTED_ERROR_MESSAGE)));
                }

                const subscriptions = Array.from(this._floodSub.subscriptions);

                setImmediate(() => callback(null, subscriptions));
            },

            peers: (topic, callback) => {
                if (!this.started && !this._floodSub.started) {
                    return setImmediate(() => callback(new Error(NOT_STARTED_ERROR_MESSAGE)));
                }

                if (is.function(topic)) {
                    callback = topic;
                    topic = null;
                }

                const peers = Array.from(this._floodSub.peers.values())
                    .filter((peer) => topic ? peer.topics.has(topic) : true)
                    .map((peer) => peer.info.id.toB58String());

                setImmediate(() => callback(null, peers));
            },

            setMaxListeners(n) {
                return this._floodSub.setMaxListeners(n);
            }
        };

        if (this.peerInfo.multiaddrs.size > 0) {
            // so that we can have webrtc-star addrs without adding manually the id
            const maOld = [];
            const maNew = [];
            this.peerInfo.multiaddrs.toArray().forEach((ma) => {
                if (!ma.getPeerId()) {
                    maOld.push(ma);
                    maNew.push(ma.encapsulate(`//p2p/${this.peerInfo.id.asBase58()}`));
                }
            });
            this.peerInfo.multiaddrs.replace(maOld, maNew);

            const multiaddrs = this.peerInfo.multiaddrs.toArray();
            this.transports.forEach((transport) => {
                if (transport.filter(multiaddrs).length > 0) {
                    this.switch.tm.add(transport.tag || transport.constructor.name, transport);
                }
            });
        } else {
            this.transports.forEach((transport) => {
                this.switch.tm.add(transport.tag || transport.constructor.name, transport);
            });
        }

        // Mount default protocols
        Ping.mount(this.switch);
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

            await this.switch.start();

            return new Promise((resolve, reject) => {
                series([
                    (cb) => {
                        if (ws && !this.switch.tm.has(ws.tag || ws.constructor.name)) {
                            // always add dialing on websockets
                            this.switch.tm.add(ws.tag || ws.constructor.name, ws);
                        }

                        // all transports need to be setup before discover starts
                        if (this.discovery) {
                            return each(this.discovery, (d, cb) => d.start(cb), cb);
                        }
                        cb();
                    },
                    (cb) => {
                        // TODO: chicken-and-egg problem #1:
                        // have to set started here because DHT requires libp2p is already started
                        this.started = true;
                        if (this._dht) {
                            this._dht.start(cb);
                        } else {
                            cb();
                        }
                    },
                    (cb) => {
                        // TODO: chicken-and-egg problem #2:
                        // have to set started here because FloodSub requires libp2p is already started
                        if (this._options !== false) {
                            this._floodSub.start().catch(cb).then(cb);
                        } else {
                            cb();
                        }
                    },
                    (cb) => {
                        // detect which multiaddrs we don't have a transport for and remove them
                        const multiaddrs = this.peerInfo.multiaddrs.toArray();
                        transports.forEach((transport) => {
                            multiaddrs.forEach((multiaddr) => {
                                if (!multiaddr.toString().match(/\/\/p2p-circuit($|\/)/) &&
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
                        if (this._floodSub.started) {
                            this._floodSub.stop().catch(cb).then(cb);
                        }
                    },
                    (cb) => {
                        if (this._dht) {
                            return this._dht.stop(cb);
                        }
                        cb();
                    },
                    (cb) => this.switch.stop().then(cb),
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
        assert(this.started, NOT_STARTED_ERROR_MESSAGE);
        const peerInfo = await this._getPeerInfo(peer);
        return new Ping(this.switch, peerInfo);
    }

    async connect(peer, protocol) {
        const peerInfo = await this._getPeerInfo(peer);
        return this.switch.connect(peerInfo, protocol);
    }

    async disconnect(peer) {
        const peerInfo = await this._getPeerInfo(peer);
        return this.switch.disconnect(peerInfo);
    }

    handle(protocol, handlerFunc, matchFunc) {
        this.switch.handle(protocol, handlerFunc, matchFunc);
    }

    unhandle(protocol) {
        this.switch.unhandle(protocol);
    }

    /**
     * Helper method to check the data type of peer and convert it to PeerInfo
     */
    _getPeerInfo(peer) {
        let p;
        // PeerInfo
        if (is.p2pPeerInfo(peer)) {
            p = peer;
            // Multiaddr instance or Multiaddr String
        } else if (is.multiAddress(peer) || is.string(peer)) {
            if (is.string(peer)) {
                peer = multi.address.create(peer);
            }
            const peerIdB58Str = peer.getPeerId();
            if (!peerIdB58Str) {
                throw new Error("Peer multiaddr instance or string must include peerId");
            }
            try {
                p = this.peerBook.get(peerIdB58Str);
            } catch (err) {
                p = new PeerInfo(Identity.createFromBase58(peerIdB58Str));
            }
            p.multiaddrs.add(peer);

            // Identity
        } else if (is.identity(peer)) {
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
adone.tag.add(Core, "P2P_CORE");
