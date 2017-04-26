const {
    database: { mongo: { core: {
        Cursor: BasicCursor,
        MongoError,
        Server,
        auth: { MongoCR, X509, Plain, ScramSHA1 },
        helper
    } } },
    std: {
        events: EventEmitter
    },
    is, util
} = adone;

/**
 * @fileOverview The **Mongos** class is a class that represents a Mongos Proxy topology and is
 * used to construct connections.
 *
 * @example
 * var Mongos = require('mongodb-core').Mongos
 *   , ReadPreference = require('mongodb-core').ReadPreference
 *   , assert = require('assert');
 *
 * var server = new Mongos([{host: 'localhost', port: 30000}]);
 * // Wait for the connection event
 * server.on('connect', function(server) {
 *   server.destroy();
 * });
 *
 * // Start connecting
 * server.connect();
 */
//
// States
const DISCONNECTED = "disconnected";
const CONNECTING = "connecting";
const CONNECTED = "connected";
const UNREFERENCED = "unreferenced";
const DESTROYED = "destroyed";

const stateTransition = (self, newState) => {
    const legalTransitions = {
        disconnected: [CONNECTING, DESTROYED, DISCONNECTED],
        connecting: [CONNECTING, DESTROYED, CONNECTED, DISCONNECTED],
        connected: [CONNECTED, DISCONNECTED, DESTROYED, UNREFERENCED],
        unreferenced: [UNREFERENCED, DESTROYED],
        destroyed: [DESTROYED]
    };

    // Get current state
    const legalStates = legalTransitions[self.state];
    if (legalStates && legalStates.includes(newState)) {
        self.state = newState;
    }
};

//
// ReplSet instance id
let id = 1;
const handlers = ["connect", "close", "error", "timeout", "parseError"];

const moveServerFrom = (from, to, proxy) => {
    for (let i = 0; i < from.length; i++) {
        if (from[i].name === proxy.name) {
            from.splice(i, 1);
        }
    }

    for (let i = 0; i < to.length; i++) {
        if (to[i].name === proxy.name) {
            to.splice(i, 1);
        }
    }

    to.push(proxy);
};

const removeProxyFrom = (from, proxy) => {
    for (let i = 0; i < from.length; i++) {
        if (from[i].name === proxy.name) {
            from.splice(i, 1);
        }
    }
};

const handleEvent = (self) => {
    return function () {
        if (self.state === DESTROYED) {
            return;
        }
        // Move to list of disconnectedProxies
        moveServerFrom(self.connectedProxies, self.disconnectedProxies, this);
        // Emit the left signal
        self.emit("left", "mongos", this);
    };
};

const pickProxy = (self) => {
    // Get the currently connected Proxies
    let connectedProxies = self.connectedProxies.slice(0);

    // Set lower bound
    let lowerBoundLatency = Number.MAX_VALUE;

    // Determine the lower bound for the Proxies
    for (const p of connectedProxies) {
        if (p.lastIsMasterMS < lowerBoundLatency) {
            lowerBoundLatency = p.lastIsMasterMS;
        }
    }

    // Filter out the possible servers
    connectedProxies = connectedProxies.filter((server) => {
        return server.lastIsMasterMS <= (lowerBoundLatency + self.s.localThresholdMS) && server.isConnected();
    });

    // We have no connectedProxies pick first of the connected ones
    if (connectedProxies.length === 0) {
        return self.connectedProxies[0];
    }

    // Get proxy
    const proxy = connectedProxies[self.index % connectedProxies.length];
    // Update the index
    self.index = (self.index + 1) % connectedProxies.length;
    // Return the proxy
    return proxy;
};

const applyAuthenticationContexts = (self, server, callback) => {
    if (self.s.authenticationContexts.length === 0) {
        return callback();
    }

    // Copy contexts to ensure no modificiation in the middle of
    // auth process.
    const authContexts = self.s.authenticationContexts.slice(0);

    // Apply one of the contexts
    const applyAuth = (authContexts, server, callback) => {
        if (authContexts.length === 0) {
            return callback();
        }
        // Get the first auth context
        const authContext = authContexts.shift();
        // Copy the params
        const customAuthContext = authContext.slice(0);
        // Push our callback handler
        customAuthContext.push(() => {
            applyAuth(authContexts, server, callback);
        });

        // Attempt authentication
        server.auth(...customAuthContext);
    };

    // Apply all auth contexts
    applyAuth(authContexts, server, callback);
};

const reconnectProxies = (self, proxies, callback) => {
    // Count lefts
    let count = proxies.length;

    // Handle events
    const _handleEvent = (self, event) => {
        return function () {
            count = count - 1;

            // Destroyed
            if (self.state === DESTROYED || self.state === UNREFERENCED) {
                moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
                return this.destroy();
            }

            if (event === "connect" && !self.authenticating) {
                // Do we have authentication contexts that need to be applied
                applyAuthenticationContexts(self, this, () => {
                    // Destroyed
                    if (self.state === DESTROYED || self.state === UNREFERENCED) {
                        moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
                        return this.destroy();
                    }

                    // Remove the handlers
                    for (const h of handlers) {
                        this.removeAllListeners(h);
                    }

                    // Add stable state handlers
                    this.on("error", handleEvent(self, "error"));
                    this.on("close", handleEvent(self, "close"));
                    this.on("timeout", handleEvent(self, "timeout"));
                    this.on("parseError", handleEvent(self, "parseError"));

                    // Move to the connected servers
                    moveServerFrom(self.disconnectedProxies, self.connectedProxies, this);
                    // Emit joined event
                    self.emit("joined", "mongos", this);
                });
            } else if (event === "connect" && self.authenticating) {
                // Move from connectingProxies
                moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
                this.destroy();
            }

            // Are we done finish up callback
            if (count === 0) {
                callback();
            }
        };
    };

    // No new servers
    if (count === 0) {
        return callback();
    }

    // Execute method
    const execute = (_server, i) => {
        setTimeout(() => {
            // Destroyed
            if (self.state === DESTROYED || self.state === UNREFERENCED) {
                return;
            }

            // Create a new server instance
            const server = new Server(Object.assign({}, self.s.options, {
                host: _server.name.split(":")[0],
                port: parseInt(_server.name.split(":")[1], 10)
            }, {
                authProviders: self.authProviders, reconnect: false, monitoring: false, inTopology: true
            }, {
                clientInfo: util.clone(self.s.clientInfo)
            }));

            // Add temp handlers
            server.once("connect", _handleEvent(self, "connect"));
            server.once("close", _handleEvent(self, "close"));
            server.once("timeout", _handleEvent(self, "timeout"));
            server.once("error", _handleEvent(self, "error"));
            server.once("parseError", _handleEvent(self, "parseError"));

            // SDAM Monitoring events
            server.on("serverOpening", (e) => {
                self.emit("serverOpening", e);
            });
            server.on("serverDescriptionChanged", (e) => {
                self.emit("serverDescriptionChanged", e);
            });
            server.on("serverClosed", (e) => {
                self.emit("serverClosed", e);
            });
            server.connect(self.s.connectOptions);
        }, i);
    };

    // Create new instances
    for (let i = 0; i < proxies.length; i++) {
        execute(proxies[i], i);
    }
};

const topologyMonitor = (self, options = {}) => {
    // Set momitoring timeout
    self.haTimeoutId = setTimeout(() => {
        if (self.state === DESTROYED || self.state === UNREFERENCED) {
            return;
        }
        // If we have a primary and a disconnect handler, execute
        // buffered operations
        if (self.isConnected() && self.s.disconnectHandler) {
            self.s.disconnectHandler.execute();
        }

        // Get the connectingServers
        const proxies = self.connectedProxies.slice(0);
        // Get the count
        let count = proxies.length;

        // If the count is zero schedule a new fast
        const pingServer = (_self, _server, cb) => {
            // Measure running time
            const start = new Date().getTime();

            // Emit the server heartbeat start
            helper.emitSDAMEvent(self, "serverHeartbeatStarted", { connectionId: _server.name });

            // Execute ismaster
            _server.command("admin.$cmd", {
                ismaster: true
            }, {
                monitoring: true,
                socketTimeout: self.s.options.connectionTimeout || 2000
            }, (err, r) => {
                if (self.state === DESTROYED || self.state === UNREFERENCED) {
                        // Move from connectingProxies
                    moveServerFrom(self.connectedProxies, self.disconnectedProxies, _server);
                    _server.destroy();
                    return cb(err, r);
                }

                    // Calculate latency
                const latencyMS = new Date().getTime() - start;

                    // We had an error, remove it from the state
                if (err) {
                        // Emit the server heartbeat failure
                    helper.emitSDAMEvent(self, "serverHeartbeatFailed", { durationMS: latencyMS, failure: err, connectionId: _server.name });
                        // Move from connected proxies to disconnected proxies
                    moveServerFrom(self.connectedProxies, self.disconnectedProxies, _server);
                } else {
                        // Update the server ismaster
                    _server.ismaster = r.result;
                    _server.lastIsMasterMS = latencyMS;

                        // Server heart beat event
                    helper.emitSDAMEvent(self, "serverHeartbeatSucceeded", { durationMS: latencyMS, reply: r.result, connectionId: _server.name });
                }

                cb(err, r);
            });
        };

        // No proxies initiate monitor again
        if (proxies.length === 0) {
            // Emit close event if any listeners registered
            if (self.listeners("close").length > 0 && self.state === CONNECTING) {
                self.emit("error", new MongoError("no mongos proxy available"));
            } else {
                self.emit("close", self);
            }

            // Attempt to connect to any unknown servers
            return reconnectProxies(self, self.disconnectedProxies, () => {
                if (self.state === DESTROYED || self.state === UNREFERENCED) {
                    return;
                }

                // Are we connected ? emit connect event
                if (self.state === CONNECTING && options.firstConnect) {
                    self.emit("connect", self);
                    self.emit("fullsetup", self);
                    self.emit("all", self);
                } else if (self.isConnected()) {
                    self.emit("reconnect", self);
                } else if (!self.isConnected() && self.listeners("close").length > 0) {
                    self.emit("close", self);
                }

                // Perform topology monitor
                topologyMonitor(self);
            });
        }

        // Ping all servers
        const handler = () => {
            count = count - 1;

            if (count === 0) {
                if (self.state === DESTROYED || self.state === UNREFERENCED) {
                    return;
                }

                // Attempt to connect to any unknown servers
                reconnectProxies(self, self.disconnectedProxies, () => {
                    if (self.state === DESTROYED || self.state === UNREFERENCED) {
                        return;
                    }
                    // Perform topology monitor
                    topologyMonitor(self);
                });
            }
        };
        for (const p of proxies) {
            pingServer(self, p, handler);
        }
    }, self.s.haInterval);
};

const handleInitialConnectEvent = (self, event) => {
    return function () {
        // Destroy the instance
        if (self.state === DESTROYED) {
            // Move from connectingProxies
            moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
            return this.destroy();
        }

        // Check the type of server
        if (event === "connect") {
            // Do we have authentication contexts that need to be applied
            applyAuthenticationContexts(self, this, () => {
                // Get last known ismaster
                self.ismaster = this.lastIsMaster();

                // Is this not a proxy, remove t
                if (self.ismaster.msg === "isdbgrid") {
                    // Add to the connectd list
                    for (const p of self.connectedProxies) {
                        if (p.name === this.name) {
                            // Move from connectingProxies
                            moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
                            this.destroy();
                            return self.emit("failed", this);
                        }
                    }

                    // Remove the handlers
                    for (const h of handlers) {
                        this.removeAllListeners(h);
                    }

                    // Add stable state handlers
                    this.on("error", handleEvent(self, "error"));
                    this.on("close", handleEvent(self, "close"));
                    this.on("timeout", handleEvent(self, "timeout"));
                    this.on("parseError", handleEvent(self, "parseError"));

                    // Move from connecting proxies connected
                    moveServerFrom(self.connectingProxies, self.connectedProxies, this);
                    // Emit the joined event
                    self.emit("joined", "mongos", this);
                } else {
                    // This is not a mongos proxy, remove it completely
                    removeProxyFrom(self.connectingProxies, this);
                    // Emit the left event
                    self.emit("left", "server", this);
                    // Emit failed event
                    self.emit("failed", this);
                }
            });
        } else {
            moveServerFrom(self.connectingProxies, self.disconnectedProxies, this);
            // Emit the left event
            self.emit("left", "mongos", this);
            // Emit failed event
            self.emit("failed", this);
        }

        // Trigger topologyMonitor
        if (self.connectingProxies.length === 0) {
            // Emit connected if we are connected
            if (self.connectedProxies.length > 0) {
                // Set the state to connected
                stateTransition(self, CONNECTED);
                // Emit the connect event
                self.emit("connect", self);
                self.emit("fullsetup", self);
                self.emit("all", self);
            } else if (self.disconnectedProxies.length === 0) {
                // Emit the error that no proxies were found
                return self.emit("error", new MongoError("no mongos proxies found in seed list"));
            }

            // Topology monitor
            topologyMonitor(self, { firstConnect: true });
        }
    };
};

const connectProxies = (self, servers) => {
    // Update connectingProxies
    self.connectingProxies = self.connectingProxies.concat(servers);

    // Index used to interleaf the server connects, avoiding
    // runtime issues on io constrained vm's
    let timeoutInterval = 0;

    const connect = (server, timeoutInterval) => {
        setTimeout(() => {
            // Add event handlers
            server.once("close", handleInitialConnectEvent(self, "close"));
            server.once("timeout", handleInitialConnectEvent(self, "timeout"));
            server.once("parseError", handleInitialConnectEvent(self, "parseError"));
            server.once("error", handleInitialConnectEvent(self, "error"));
            server.once("connect", handleInitialConnectEvent(self, "connect"));
            // SDAM Monitoring events
            server.on("serverOpening", (e) => {
                self.emit("serverOpening", e);
            });
            server.on("serverDescriptionChanged", (e) => {
                self.emit("serverDescriptionChanged", e);
            });
            server.on("serverClosed", (e) => {
                self.emit("serverClosed", e);
            });
            // Start connection
            server.connect(self.s.connectOptions);
        }, timeoutInterval);
    };
    // Start all the servers
    while (servers.length > 0) {
        connect(servers.shift(), timeoutInterval++);
    }
};

const executeWriteOperation = (self, op, ns, ops, options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }
    // Pick a server
    const server = pickProxy(self);
    // No server found error out
    if (!server) {
        return callback(new MongoError("no mongos proxy available"));
    }
    // Execute the command
    server[op](ns, ops, options, callback);
};

/**
 * Creates a new Mongos instance
 * @class
 * @param {array} seedlist A list of seeds for the replicaset
 * @param {number} [options.haInterval=5000] The High availability period for replicaset inquiry
 * @param {Cursor} [options.cursorFactory=Cursor] The cursor factory class used for all query cursors
 * @param {number} [options.size=5] Server connection pool size
 * @param {boolean} [options.keepAlive=true] TCP Connection keep alive enabled
 * @param {number} [options.keepAliveInitialDelay=0] Initial delay before TCP keep alive enabled
 * @param {number} [options.localThresholdMS=15] Cutoff latency point in MS for MongoS proxy selection
 * @param {boolean} [options.noDelay=true] TCP Connection no delay
 * @param {number} [options.connectionTimeout=1000] TCP Connection timeout setting
 * @param {number} [options.socketTimeout=0] TCP Socket timeout setting
 * @param {boolean} [options.singleBufferSerializtion=true] Serialize into single buffer, trade of peak memory for serialization speed
 * @param {boolean} [options.ssl=false] Use SSL for connection
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {Buffer} [options.ca] SSL Certificate store binary buffer
 * @param {Buffer} [options.cert] SSL Certificate binary buffer
 * @param {Buffer} [options.key] SSL Key file binary buffer
 * @param {string} [options.passphrase] SSL Certificate pass phrase
 * @param {string} [options.servername=null] String containing the server name requested via TLS SNI.
 * @param {boolean} [options.rejectUnauthorized=true] Reject unauthorized server certificates
 * @param {boolean} [options.promoteLongs=true] Convert Long values from the db into Numbers if they fit into 53 bits
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @return {Mongos} A cursor instance
 * @fires Mongos#connect
 * @fires Mongos#reconnect
 * @fires Mongos#joined
 * @fires Mongos#left
 * @fires Mongos#failed
 * @fires Mongos#fullsetup
 * @fires Mongos#all
 * @fires Mongos#serverHeartbeatStarted
 * @fires Mongos#serverHeartbeatSucceeded
 * @fires Mongos#serverHeartbeatFailed
 * @fires Mongos#topologyOpening
 * @fires Mongos#topologyClosed
 * @fires Mongos#topologyDescriptionChanged
 * @property {string} type the topology type.
 * @property {string} parserType the parser type used (c++ or js).
 */

export default class Mongos extends EventEmitter {
    constructor(seedlist, options = {}) {
        super();
        // Get replSet Id
        this.id = id++;

        // Internal state
        this.s = {
            options: Object.assign({}, options),
            // BSON instance
            bson: options.bson || new adone.data.bson.BSON(),
            // Factory overrides
            Cursor: options.cursorFactory || BasicCursor,
            // Seedlist
            seedlist,
            // Ha interval
            haInterval: options.haInterval ? options.haInterval : 10000,
            // Disconnect handler
            disconnectHandler: options.disconnectHandler,
            // Server selection index
            index: 0,
            // Connect function options passed in
            connectOptions: {},
            // Are we running in debug mode
            debug: is.boolean(options.debug) ? options.debug : false,
            // localThresholdMS
            localThresholdMS: options.localThresholdMS || 15,
            // Client info
            clientInfo: helper.createClientInfo(options),
            // Authentication context
            authenticationContexts: []
        };

        // Set the client info
        this.s.options.clientInfo = helper.createClientInfo(options);

        // All the authProviders
        this.authProviders = options.authProviders || {
            mongocr: new MongoCR(this.s.bson),
            x509: new X509(this.s.bson),
            plain: new Plain(this.s.bson),
            "scram-sha-1": new ScramSHA1(this.s.bson)
        };

        // Disconnected state
        this.state = DISCONNECTED;

        // Current proxies we are connecting to
        this.connectingProxies = [];
        // Currently connected proxies
        this.connectedProxies = [];
        // Disconnected proxies
        this.disconnectedProxies = [];
        // Are we authenticating
        this.authenticating = false;
        // Index of proxy to run operations against
        this.index = 0;
        // High availability timeout id
        this.haTimeoutId = null;
        // Last ismaster
        this.ismaster = null;
    }

    get type() {
        return "mongos";
    }

    get parserType() {
        return "c++";
    }

    connect(options = {}) {
        // Add any connect level options to the internal state
        this.s.connectOptions = options;
        // Set connecting state
        stateTransition(this, CONNECTING);
        // Create server instances
        const servers = this.s.seedlist.map((x) => {
            return new Server(Object.assign({}, this.s.options, x, {
                authProviders: this.authProviders, reconnect: false, monitoring: false, inTopology: true
            }, {
                clientInfo: util.clone(this.s.clientInfo)
            }));
        });

        // Emit the topology opening event
        helper.emitSDAMEvent(this, "topologyOpening", { topologyId: this.id });

        // Start all server connections
        connectProxies(this, servers);
    }

    lastIsMaster() {
        return this.ismaster;
    }

    unref() {
        // Transition state
        stateTransition(this, UNREFERENCED);
        // Get all proxies
        for (const l of [this.connectedProxies, this.connectedProxies]) {
            for (const p of l) {
                p.unref();
            }
        }
        clearTimeout(this.haTimeoutId);
    }

    destroy(options) {
        // Transition state
        stateTransition(this, DESTROYED);
        // Clear out any monitoring process
        if (this.haTimeoutId) {
            clearTimeout(this.haTimeoutId);
        }
        // Clear out authentication contexts
        this.s.authenticationContexts = [];

        // Destroy all connecting servers
        for (const l of [this.connectedProxies, this.connectedProxies]) {
            for (const p of l) {
                p.destroy(options);
            }
        }
        // Emit toplogy closing event
        helper.emitSDAMEvent(this, "topologyClosed", { topologyId: this.id });
    }

    isConnected() {
        return this.connectedProxies.length > 0;
    }

    isDestroyed() {
        return this.state === DESTROYED;
    }

    insert(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        if (this.state === DESTROYED) {
            return callback(new MongoError("topology was destroyed"));
        }

        // Not connected but we have a disconnecthandler
        if (!this.isConnected() && !is.nil(this.s.disconnectHandler)) {
            return this.s.disconnectHandler.add("insert", ns, ops, options, callback);
        }

        // No mongos proxy available
        if (!this.isConnected()) {
            return callback(new MongoError("no mongos proxy available"));
        }

        // Execute write operation
        executeWriteOperation(this, "insert", ns, ops, options, callback);
    }

    update(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        if (this.state === DESTROYED) {
            return callback(new MongoError("topology was destroyed"));
        }

        // Not connected but we have a disconnecthandler
        if (!this.isConnected() && !is.nil(this.s.disconnectHandler)) {
            return this.s.disconnectHandler.add("update", ns, ops, options, callback);
        }

        // No mongos proxy available
        if (!this.isConnected()) {
            return callback(new MongoError("no mongos proxy available"));
        }

        // Execute write operation
        executeWriteOperation(this, "update", ns, ops, options, callback);
    }

    remove(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        if (this.state === DESTROYED) {
            return callback(new MongoError("topology was destroyed"));
        }

        // Not connected but we have a disconnecthandler
        if (!this.isConnected() && !is.nil(this.s.disconnectHandler)) {
            return this.s.disconnectHandler.add("remove", ns, ops, options, callback);
        }

        // No mongos proxy available
        if (!this.isConnected()) {
            return callback(new MongoError("no mongos proxy available"));
        }

        // Execute write operation
        executeWriteOperation(this, "remove", ns, ops, options, callback);
    }

    command(ns, cmd, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        if (this.state === DESTROYED) {
            return callback(new MongoError("topology was destroyed"));
        }
        // Pick a proxy
        const server = pickProxy(this);

        // Topology is not connected, save the call in the provided store to be
        // Executed at some point when the handler deems it's reconnected
        if ((is.nil(server) || !server.isConnected()) && !is.nil(this.s.disconnectHandler)) {
            return this.s.disconnectHandler.add("command", ns, cmd, options, callback);
        }

        // No server returned we had an error
        if (is.nil(server)) {
            return callback(new MongoError("no mongos proxy available"));
        }

        // Cloned options
        const clonedOptions = util.clone(options, { deep: false });
        clonedOptions.topology = this;

        // Execute the command
        server.command(ns, cmd, clonedOptions, callback);
    }

    cursor(ns, cmd, cursorOptions = {}) {
        const FinalCursor = cursorOptions.cursorFactory || this.s.Cursor;
        return new FinalCursor(this.s.bson, ns, cmd, cursorOptions, this, this.s.options);
    }

    auth(...args) {
        const [mechanism, db] = args;
        const callback = args[args.length - 1];
        let currentContextIndex = 0;

        // If we don't have the mechanism fail
        if (is.nil(this.authProviders[mechanism]) && mechanism !== "default") {
            return callback(new MongoError(`auth provider ${mechanism} does not exist`));
        }

        // Are we already authenticating, throw
        if (this.authenticating) {
            return callback(new MongoError("authentication or logout allready in process"));
        }

        // Topology is not connected, save the call in the provided store to be
        // Executed at some point when the handler deems it's reconnected
        if (!this.isConnected() && !is.nil(this.s.disconnectHandler)) {
            return this.s.disconnectHandler.add("auth", db, args, {}, callback);
        }

        args.pop(); // remove callback

        // Set to authenticating
        this.authenticating = true;
        // All errors
        const errors = [];

        // Get all the servers
        const servers = this.connectedProxies.slice(0);
        // No servers return
        if (servers.length === 0) {
            this.authenticating = false;
            callback(null, true);
        }

        let count = servers.length;

        // Authenticate
        const auth = (server) => {
            const finalArguments = args.slice();
            finalArguments.push(function (err) {
                count = count - 1;
                // Save all the errors
                if (err) {
                    errors.push({ name: server.name, err });
                }
                // We are done
                if (count === 0) {
                    // Auth is done
                    this.authenticating = false;

                    // Return the auth error
                    if (errors.length) {
                        // Remove the entry from the stored authentication contexts
                        this.s.authenticationContexts.splice(currentContextIndex, 0);
                        // Return error
                        return callback(MongoError.create({
                            message: "authentication fail", errors
                        }), false);
                    }

                    // Successfully authenticated session
                    callback(null, this);
                }
            });

            // Execute the auth only against non arbiter servers
            if (!server.lastIsMaster().arbiterOnly) {
                server.auth.apply(server, finalArguments);
            }
        };

        // Save current context index
        currentContextIndex = this.s.authenticationContexts.length;
        // Store the auth context and return the last index
        this.s.authenticationContexts.push(args.slice());

        // Authenticate against all servers
        while (servers.length > 0) {
            auth(servers.shift());
        }
    }

    logout(dbName, callback) {
        // Are we authenticating or logging out, throw
        if (this.authenticating) {
            throw new MongoError("authentication or logout allready in process");
        }

        // Ensure no new members are processed while logging out
        this.authenticating = true;

        // Remove from all auth providers (avoid any reaplication of the auth details)
        const providers = util.keys(this.authProviders);
        for (const p of providers) {
            this.authProviders[p].logout(dbName);
        }

        // Now logout all the servers
        const servers = this.connectedProxies.slice(0);
        let count = servers.length;
        if (count === 0) {
            return callback();
        }
        const errors = [];

        const logoutServer = (_server, cb) => {
            _server.logout(dbName, (err) => {
                if (err) {
                    errors.push({ name: _server.name, err });
                }
                cb();
            });
        };

        // Execute logout on all server instances
        const handler = () => {
            count = count - 1;

            if (count === 0) {
                // Do not block new operations
                this.authenticating = false;
                // If we have one or more errors
                if (errors.length) {
                    return callback(MongoError.create({
                        message: `logout failed against db ${dbName}`, errors
                    }), false);
                }

                // No errors
                callback();
            }
        };
        for (const s of servers) {
            logoutServer(s, handler);
        }
    }

    getServer() {
        const server = pickProxy(this);
        if (this.s.debug) {
            this.emit("pickedServer", null, server);
        }
        return server;
    }

    getConnection() {
        const server = this.getServer();
        if (server) {
            return server.getConnection();
        }
    }

    connections() {
        const connections = [];

        for (const p of this.connectedProxies) {
            connections.push(...p.connections());
        }

        return connections;
    }
}
