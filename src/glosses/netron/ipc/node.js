const FSM = require("fsm-event");
const { EventEmitter } = require("events");
const debug = require("debug");
const log = debug("libp2p");
log.error = debug("libp2p:error");
const errCode = require("err-code");
const promisify = require("promisify-es6");

const series = require("async/series");
const nextTick = require("async/nextTick");

const PeerBook = require("peer-book");
const PeerInfo = require("peer-info");
const Switch = require("./switch");
const Ping = require("./ping");
const ConnectionManager = require("./connection-manager");

const { emitFirst } = require("./util");
const { getPeerInfoRemote } = require("./get-peer-info");
const validateConfig = require("./config").validate;
const { codes } = require("./errors");

const notStarted = (action, state) => {
    return errCode(
        new Error(`libp2p cannot ${action} when not started; state is ${state}`),
        codes.ERR_NODE_NOT_STARTED
    );
};

/**
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:connect Emitted when a peer is connected to this node
 * @fires Libp2p#peer:disconnect Emitted when a peer disconnects from this node
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 * @fires Libp2p#start Emitted when the node and its services has started
 * @fires Libp2p#stop Emitted when the node and its services has stopped
 */
class Libp2p extends EventEmitter {
    constructor(_options) {
        super();
        // validateConfig will ensure the config is correct,
        // and add default values where appropriate
        this._options = validateConfig(_options);

        this.peerInfo = this._options.peerInfo;
        this.peerBook = this._options.peerBook || new PeerBook();

        this._modules = this._options.modules;
        this._config = this._options.config;
        this._transport = []; // Transport instances/references

        // create the switch, and listen for errors
        this._switch = new Switch(this.peerInfo, this.peerBook, this._options.switch);
        this._switch.on("error", (...args) => this.emit("error", ...args));

        this.connectionManager = new ConnectionManager(this, this._options.connectionManager);

        // Attach stream multiplexers
        if (this._modules.streamMuxer) {
            const muxers = this._modules.streamMuxer;
            muxers.forEach((muxer) => this._switch.connection.addStreamMuxer(muxer));

            // If muxer exists
            //   we can use Identify
            this._switch.connection.reuse();

            // Received incomming dial and muxer upgrade happened,
            // reuse this muxed connection
            this._switch.on("peer-mux-established", (peerInfo) => {
                this.emit("peer:connect", peerInfo);
            });

            this._switch.on("peer-mux-closed", (peerInfo) => {
                this.emit("peer:disconnect", peerInfo);
            });
        }

        // Events for anytime connections are created/removed
        this._switch.on("connection:start", (peerInfo) => {
            this.emit("connection:start", peerInfo);
        });
        this._switch.on("connection:end", (peerInfo) => {
            this.emit("connection:end", peerInfo);
        });

        // Mount default protocols
        Ping.mount(this._switch);

        this.state = new FSM("STOPPED", {
            STOPPED: {
                start: "STARTING",
                stop: "STOPPED"
            },
            STARTING: {
                done: "STARTED",
                abort: "STOPPED",
                stop: "STOPPING"
            },
            STARTED: {
                stop: "STOPPING",
                start: "STARTED"
            },
            STOPPING: {
                stop: "STOPPING",
                done: "STOPPED"
            }
        });
        this.state.on("STARTING", () => {
            log("libp2p is starting");
            this._onStarting();
        });
        this.state.on("STOPPING", () => {
            log("libp2p is stopping");
            this._onStopping();
        });
        this.state.on("STARTED", () => {
            log("libp2p has started");
            this.emit("start");
        });
        this.state.on("STOPPED", () => {
            log("libp2p has stopped");
            this.emit("stop");
        });
        this.state.on("error", (err) => {
            log.error(err);
            this.emit("error", err);
        });

        // Once we start, emit and dial any peers we may have already discovered
        this.state.on("STARTED", () => {
            this.peerBook.getAllArray().forEach((peerInfo) => {
                this.emit("peer:discovery", peerInfo);
            });
        });

        // promisify all instance methods
        ["start", "stop", "dial", "dialProtocol", "dialFSM", "hangUp", "ping"].forEach((method) => {
            this[method] = promisify(this[method], { context: this });
        });
    }

    /**
     * Overrides EventEmitter.emit to conditionally emit errors
     * if there is a handler. If not, errors will be logged.
     * @param {string} eventName
     * @param  {...any} args
     * @returns {void}
     */
    emit(eventName, ...args) {
        if (eventName === "error" && !this._events.error) {
            log.error(...args);
        } else {
            super.emit(eventName, ...args);
        }
    }

    /**
     * Starts the libp2p node and all sub services
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    start(callback = () => { }) {
        emitFirst(this, ["error", "start"], callback);
        this.state("start");
    }

    /**
     * Stop the libp2p node by closing its listeners and open connections
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    stop(callback = () => { }) {
        emitFirst(this, ["error", "stop"], callback);
        this.state("stop");
    }

    isStarted() {
        return this.state ? this.state._state === "STARTED" : false;
    }

    /**
     * Dials to the provided peer. If successful, the `PeerInfo` of the
     * peer will be added to the nodes `PeerBook`
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {function(Error)} callback
     * @returns {void}
     */
    dial(peer, callback) {
        this.dialProtocol(peer, null, callback);
    }

    /**
     * Dials to the provided peer and handshakes with the given protocol.
     * If successful, the `PeerInfo` of the peer will be added to the nodes `PeerBook`,
     * and the `Connection` will be sent in the callback
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {string} protocol
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    dialProtocol(peer, protocol, callback) {
        if (!this.isStarted()) {
            return callback(notStarted("dial", this.state._state));
        }

        if (typeof protocol === "function") {
            callback = protocol;
            protocol = undefined;
        }

        getPeerInfoRemote(peer, this)
            .then((peerInfo) => {
                this._switch.dial(peerInfo, protocol, callback);
            }, callback);
    }

    /**
     * Similar to `dial` and `dialProtocol`, but the callback will contain a
     * Connection State Machine.
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
     * @param {string} protocol
     * @param {function(Error, ConnectionFSM)} callback
     * @returns {void}
     */
    dialFSM(peer, protocol, callback) {
        if (!this.isStarted()) {
            return callback(notStarted("dial", this.state._state));
        }

        if (typeof protocol === "function") {
            callback = protocol;
            protocol = undefined;
        }

        getPeerInfoRemote(peer, this)
            .then((peerInfo) => {
                this._switch.dialFSM(peerInfo, protocol, callback);
            }, callback);
    }

    /**
     * Disconnects from the given peer
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
     * @param {function(Error)} callback
     * @returns {void}
     */
    hangUp(peer, callback) {
        getPeerInfoRemote(peer, this)
            .then((peerInfo) => {
                this._switch.hangUp(peerInfo, callback);
            }, callback);
    }

    /**
     * Pings the provided peer
     *
     * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
     * @param {function(Error, Ping)} callback
     * @returns {void}
     */
    ping(peer, callback) {
        if (!this.isStarted()) {
            return callback(notStarted("ping", this.state._state));
        }

        getPeerInfoRemote(peer, this)
            .then((peerInfo) => {
                callback(null, new Ping(this._switch, peerInfo));
            }, callback);
    }

    handle(protocol, handlerFunc, matchFunc) {
        this._switch.handle(protocol, handlerFunc, matchFunc);
    }

    unhandle(protocol) {
        this._switch.unhandle(protocol);
    }

    _onStarting() {
        if (!this._modules.transport) {
            this.emit("error", new Error("no transports were present"));
            return this.state("abort");
        }

        // so that we can have webrtc-star addrs without adding manually the id
        const maOld = [];
        const maNew = [];
        this.peerInfo.multiaddrs.toArray().forEach((ma) => {
            if (!ma.getPeerId()) {
                maOld.push(ma);
                maNew.push(ma.encapsulate("/p2p/" + this.peerInfo.id.toB58String()));
            }
        });
        this.peerInfo.multiaddrs.replace(maOld, maNew);

        const multiaddrs = this.peerInfo.multiaddrs.toArray();

        this._modules.transport.forEach((Transport) => {
            let t;

            if (typeof Transport === "function") {
                t = new Transport({ libp2p: this });
            } else {
                t = Transport;
            }

            if (t.filter(multiaddrs).length > 0) {
                this._switch.transport.add(t.tag || t[Symbol.toStringTag], t);
            }

            this._transport.push(t);
        });

        series([
            (cb) => {
                this.connectionManager.start();
                this._switch.start(cb);
            },
            (cb) => {
                // detect which multiaddrs we don't have a transport for and remove them
                const multiaddrs = this.peerInfo.multiaddrs.toArray();

                multiaddrs.forEach((multiaddr) => {
                    if (!multiaddr.toString().match(/\/p2p-circuit($|\/)/) &&
                        !this._transport.find((transport) => transport.filter(multiaddr).length > 0)) {
                        this.peerInfo.multiaddrs.delete(multiaddr);
                    }
                });
                cb();
            }
        ], (err) => {
            if (err) {
                log.error(err);
                this.emit("error", err);
                return this.state("stop");
            }
            this.state("done");
        });
    }

    _onStopping() {
        series([
            (cb) => {
                this.connectionManager.stop();
                this._switch.stop(cb);
            },
            (cb) => {
                // Ensures idempotent restarts, ignore any errors
                // from removeAll, they're not useful at this point
                this._switch.transport.removeAll(() => cb());
            }
        ], (err) => {
            if (err) {
                log.error(err);
                this.emit("error", err);
            }
            this.state("done");
        });
    }
}

module.exports = Libp2p;
/**
 * Like `new Libp2p(options)` except it will create a `PeerInfo`
 * instance if one is not provided in options.
 * @param {object} options Libp2p configuration options
 * @param {function(Error, Libp2p)} callback
 * @returns {void}
 */
module.exports.create = promisify((options, callback) => {
    if (options.peerInfo) {
        return nextTick(callback, null, new Libp2p(options));
    }
    PeerInfo.create((err, peerInfo) => {
        if (err) {
            return callback(err);
        }
        options.peerInfo = peerInfo;
        callback(null, new Libp2p(options));
    });
});
