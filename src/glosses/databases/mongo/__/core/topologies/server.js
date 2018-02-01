const {
    database: { mongo },
    event,
    data: { bson },
    is,
    exception,
    util
} = adone;
const {
    core: {
        ReadPreference,
        Pool,
        Query,
        MongoError,
        wireProtocol,
        Cursor: BasicCursor,
        helper
    }
} = adone.private(mongo);

// Server instance id
let id = 0;
let serverAccounting = false;
let servers = {};

const getPreviousDescription = (self) => {
    if (!self.s.serverDescription) {
        self.s.serverDescription = {
            address: self.name,
            arbiters: [], hosts: [], passives: [], type: "Unknown"
        };
    }

    return self.s.serverDescription;
};

const emitServerDescriptionChanged = (self, description) => {
    if (self.listeners("serverDescriptionChanged").length > 0) {
        // Emit the server description changed events
        self.emit("serverDescriptionChanged", {
            topologyId: self.s.topologyId !== -1 ? self.s.topologyId : self.id, address: self.name,
            previousDescription: getPreviousDescription(self),
            newDescription: description
        });

        self.s.serverDescription = description;
    }
};

const getPreviousTopologyDescription = (self) => {
    if (!self.s.topologyDescription) {
        self.s.topologyDescription = {
            topologyType: "Unknown",
            servers: [{
                address: self.name, arbiters: [], hosts: [], passives: [], type: "Unknown"
            }]
        };
    }

    return self.s.topologyDescription;
};

const emitTopologyDescriptionChanged = (self, description) => {
    if (self.listeners("topologyDescriptionChanged").length > 0) {
        // Emit the server description changed events
        self.emit("topologyDescriptionChanged", {
            topologyId: self.s.topologyId !== -1 ? self.s.topologyId : self.id, address: self.name,
            previousDescription: getPreviousTopologyDescription(self),
            newDescription: description
        });

        self.s.serverDescription = description;
    }
};

const configureWireProtocolHandler = (self, ismaster) => {
    // 3.2 wire protocol handler
    if (ismaster.maxWireVersion >= 4) {
        return new wireProtocol[32](new wireProtocol[26]());
    }

    // 2.6 wire protocol handler
    if (ismaster.maxWireVersion >= 2) {
        return new wireProtocol[26]();
    }

    // 2.4 or earlier wire protocol handler
    return new wireProtocol[24]();
};

const disconnectHandler = (self, type, ns, cmd, options, callback) => {
    // Topology is not connected, save the call in the provided store to be
    // Executed at some point when the handler deems it's reconnected
    if (!self.s.pool.isConnected() && self.s.options.reconnect && !is.nil(self.s.disconnectHandler) && !options.monitoring) {
        self.s.disconnectHandler.add(type, ns, cmd, options, callback);
        return true;
    }

    // If we have no connection error
    if (!self.s.pool.isConnected()) {
        callback(MongoError.create(`no connection available to server ${self.name}`));
        return true;
    }
};

const monitoringProcess = (self) => {
    return () => {
        // Pool was destroyed do not continue process
        if (self.s.pool.isDestroyed()) {
            return;
        }
        // Emit monitoring Process event
        self.emit("monitoring", self);
        // Perform ismaster call
        // Query options
        const queryOptions = { numberToSkip: 0, numberToReturn: -1, checkKeys: false, slaveOk: true };
        // Create a query instance
        const query = new Query(self.s.bson, "admin.$cmd", { ismaster: true }, queryOptions);
        // Get start time
        const start = new Date().getTime();

        // Execute the ismaster query
        self.s.pool.write(query, {
            socketTimeout: !is.number(self.s.options.connectionTimeout) ? 2000 : self.s.options.connectionTimeout,
            monitoring: true
        }, (err, result) => {
            // Set initial lastIsMasterMS
            self.lastIsMasterMS = new Date().getTime() - start;
            if (self.s.pool.isDestroyed()) {
                return;
            }
            // Update the ismaster view if we have a result
            if (result) {
                self.ismaster = result.result;
            }
            // Re-schedule the monitoring process
            self.monitoringProcessId = setTimeout(monitoringProcess(self), self.s.monitoringInterval);
        });
    };
};

const getTopologyType = function (self, ismaster) {
    if (!ismaster) {
        ismaster = self.ismaster;
    }

    if (!ismaster) {
        return "Unknown";
    }
    if (ismaster.ismaster && ismaster.msg === "isdbgrid") {
        return "Mongos";
    }
    if (ismaster.ismaster && !ismaster.hosts) {
        return "Standalone";
    }
    if (ismaster.ismaster) {
        return "RSPrimary";
    }
    if (ismaster.secondary) {
        return "RSSecondary";
    }
    if (ismaster.arbiterOnly) {
        return "RSArbiter";
    }
    return "Unknown";
};


const eventHandler = (self, event) => {
    return (err) => {
        // Handle connect event
        if (event === "connect") {
            // Issue an ismaster command at connect
            // Query options
            const queryOptions = { numberToSkip: 0, numberToReturn: -1, checkKeys: false, slaveOk: true };
            // Create a query instance
            const query = new Query(self.s.bson, "admin.$cmd", { ismaster: true, client: self.clientInfo }, queryOptions);
            // Get start time
            const start = new Date().getTime();
            // Execute the ismaster query
            self.s.pool.write(query, {
                socketTimeout: self.s.options.connectionTimeout || 2000
            }, (err, result) => {
                // Set initial lastIsMasterMS
                self.lastIsMasterMS = new Date().getTime() - start;
                if (err) {
                    self.destroy();
                    if (self.listeners("error").length > 0) {
                        self.emit("error", err);
                    }
                    return;
                }

                // Ensure no error emitted after initial connect when reconnecting
                self.initalConnect = false;
                // Save the ismaster
                self.ismaster = result.result;

                // It's a proxy change the type so
                // the wireprotocol will send $readPreference
                if (self.ismaster.msg === "isdbgrid") {
                    self._type = "mongos";
                }
                // Add the correct wire protocol handler
                self.wireProtocolHandler = configureWireProtocolHandler(self, self.ismaster);
                // Have we defined self monitoring
                if (self.s.monitoring) {
                    self.monitoringProcessId = setTimeout(monitoringProcess(self), self.s.monitoringInterval);
                }

                // Emit server description changed if something listening
                emitServerDescriptionChanged(self, {
                    address: self.name,
                    arbiters: [],
                    hosts: [],
                    passives: [],
                    type: getTopologyType(self)
                });

                if (!self.s.inTopology) {
                    // Emit topology description changed if something listening
                    emitTopologyDescriptionChanged(self, {
                        topologyType: "Single",
                        servers: [{
                            address: self.name,
                            arbiters: [],
                            hosts: [],
                            passives: [],
                            type: getTopologyType(self)
                        }]
                    });
                }

                // Emit connect
                self.emit("connect", self);
            });
        } else if (
            event === "error" ||
            event === "parseError" ||
            event === "close" ||
            event === "timeout" ||
            event === "reconnect" ||
            event === "attemptReconnect" ||
            event === "reconnectFailed"
        ) {
            // Remove server instance from accounting
            if (serverAccounting && ["close", "timeout", "error", "parseError", "reconnectFailed"].includes(event)) {
                // Emit toplogy opening event if not in topology
                if (!self.s.inTopology) {
                    self.emit("topologyOpening", { topologyId: self.id });
                }

                delete servers[self.id];
            }

            if (event === "close") {
                // Closing emits a server description changed event going to unknown.
                emitServerDescriptionChanged(self, {
                    address: self.name, arbiters: [], hosts: [], passives: [], type: "Unknown"
                });
            }


            // Reconnect failed return error
            if (event === "reconnectFailed") {
                self.emit("reconnectFailed", err);
                // Emit error if any listeners
                if (self.listeners("error").length > 0) {
                    self.emit("error", err);
                }
                // Terminate
                return;
            }

            // On first connect fail
            if (
                self.s.pool.state === "disconnected" &&
                self.initalConnect &&
                ["close", "timeout", "error", "parseError"].includes(event)
            ) {
                self.initalConnect = false;
                return self.emit("error", new MongoError(`failed to connect to server [${self.name}] on first connect [${err}]`));
            }

            // Reconnect event, emit the server
            if (event === "reconnect") {
                // Reconnecting emits a server description changed event going from unknown to the
                // current server type.
                emitServerDescriptionChanged(self, {
                    address: self.name, arbiters: [], hosts: [], passives: [], type: getTopologyType(self)
                });
                return self.emit(event, self);
            }

            // Emit the event
            self.emit(event, err);
        }
    };
};

const basicWriteValidations = (self) => {
    if (!self.s.pool) {
        return MongoError.create("server instance is not connected");
    }
    if (self.s.pool.isDestroyed()) {
        return MongoError.create("server instance pool was destroyed");
    }
};

const basicReadValidations = (self, options) => {
    basicWriteValidations(self, options);

    if (options.readPreference && !(options.readPreference instanceof ReadPreference)) {
        throw new exception.InvalidArgument("readPreference must be an instance of ReadPreference");
    }
};

const listeners = ["close", "error", "timeout", "parseError", "connect"];

export default class Server extends event.Emitter {
    constructor(options = {}) {
        super();
        // Server instance id
        this.id = id++;

        // Internal state
        this.s = {
            // Options
            options,
            // Factory overrides
            Cursor: options.cursorFactory || BasicCursor,
            // BSON instance
            bson: options.bson || new bson.BSON(),
            // Pool
            pool: null,
            // Disconnect handler
            disconnectHandler: options.disconnectHandler,
            // Monitor thread (keeps the connection alive)
            monitoring: is.boolean(options.monitoring) ? options.monitoring : true,
            // Is the server in a topology
            inTopology: is.boolean(options.inTopology) ? options.inTopology : false,
            // Monitoring timeout
            monitoringInterval: is.number(options.monitoringInterval)
                ? options.monitoringInterval
                : 5000,
            // Topology id
            topologyId: -1
        };

        // Curent ismaster
        this.ismaster = null;
        // Current ping time
        this.lastIsMasterMS = -1;
        // The monitoringProcessId
        this.monitoringProcessId = null;
        // Initial connection
        this.initalConnect = true;
        // Wire protocol handler, default to oldest known protocol handler
        // this gets changed when the first ismaster is called.
        this.wireProtocolHandler = new wireProtocol[24]();
        // Default type
        this._type = "server";
        // Set the client info
        this.clientInfo = helper.createClientInfo(options);

        // Max Stalleness values
        // last time we updated the ismaster state
        this.lastUpdateTime = 0;
        // Last write time
        this.lastWriteDate = 0;
        // Stalleness
        this.staleness = 0;
    }

    get type() {
        return this._type;
    }

    get parserType() {
        return "c++";
    }

    get name() {
        return `${this.s.options.host}:${this.s.options.port}`;
    }

    connect(options = {}) {
        // Set the connections
        if (serverAccounting) {
            servers[this.id] = this;
        }

        // Do not allow connect to be called on anything that's not disconnected
        if (this.s.pool && !this.s.pool.isDisconnected() && !this.s.pool.isDestroyed()) {
            throw MongoError.create(`server instance in invalid state ${this.s.pool.state}`);
        }

        // Create a pool
        this.s.pool = new Pool({ ...this.s.options, ...options, bson: this.s.bson });

        // Set up listeners
        this.s.pool.on("close", eventHandler(this, "close"));
        this.s.pool.on("error", eventHandler(this, "error"));
        this.s.pool.on("timeout", eventHandler(this, "timeout"));
        this.s.pool.on("parseError", eventHandler(this, "parseError"));
        this.s.pool.on("connect", eventHandler(this, "connect"));
        this.s.pool.on("reconnect", eventHandler(this, "reconnect"));
        this.s.pool.on("reconnectFailed", eventHandler(this, "reconnectFailed"));

        // Emit toplogy opening event if not in topology
        if (!this.s.inTopology) {
            this.emit("topologyOpening", { topologyId: this.id });
        }

        // Emit opening server event
        this.emit("serverOpening", {
            topologyId: this.s.topologyId !== -1 ? this.s.topologyId : this.id,
            address: this.name
        });

        // Connect with optional auth settings
        if (options.auth) {
            this.s.pool.connect.apply(this.s.pool, options.auth);
        } else {
            this.s.pool.connect();
        }
    }

    getDescription() {
        const ismaster = this.ismaster || {};
        const description = {
            type: getTopologyType(this),
            address: this.name
        };

        // Add fields if available
        if (ismaster.hosts) {
            description.hosts = ismaster.hosts;
        }
        if (ismaster.arbiters) {
            description.arbiters = ismaster.arbiters;
        }
        if (ismaster.passives) {
            description.passives = ismaster.passives;
        }
        if (ismaster.setName) {
            description.setName = ismaster.setName;
        }
        return description;
    }

    lastIsMaster() {
        return this.ismaster;
    }

    unref() {
        this.s.pool.unref();
    }

    isConnected() {
        if (!this.s.pool) {
            return false;
        }
        return this.s.pool.isConnected();
    }

    isDestroyed() {
        if (!this.s.pool) {
            return false;
        }
        return this.s.pool.isDestroyed();
    }

    command(ns, cmd, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        const result = basicReadValidations(this, options);
        if (result) {
            return callback(result);
        }

        // Clone the options
        options = { ...options, wireProtocolCommand: false };

        // If we are not connected or have a disconnectHandler specified
        if (disconnectHandler(this, "command", ns, cmd, options, callback)) {
            return;
        }

        // Check if we have collation support
        if (this.ismaster && this.ismaster.maxWireVersion < 5 && cmd.collation) {
            return callback(new MongoError(`server ${this.name} does not support collation`));
        }

        // Query options
        // const queryOptions = {
        //     numberToSkip: 0,
        //     numberToReturn: -1,
        //     checkKeys: is.boolean(options.checkKeys) ? options.checkKeys : false,
        //     serializeFunctions: is.boolean(options.serializeFunctions) ? options.serializeFunctions : false,
        //     ignoreUndefined: is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : false
        // };

        // Are we executing against a specific topology
        const topology = options.topology || {};
        // Create the query object
        // query options?
        const query = this.wireProtocolHandler.command(this.s.bson, ns, cmd, {}, topology, options);
        // Set slave OK of the query
        query.slaveOk = options.readPreference ? options.readPreference.slaveOk() : false;

        // Write options
        const writeOptions = {
            raw: is.boolean(options.raw) ? options.raw : false,
            promoteLongs: is.boolean(options.promoteLongs) ? options.promoteLongs : true,
            promoteValues: is.boolean(options.promoteValues) ? options.promoteValues : true,
            promoteBuffers: is.boolean(options.promoteBuffers) ? options.promoteBuffers : false,
            command: true,
            monitoring: is.boolean(options.monitoring) ? options.monitoring : false,
            fullResult: is.boolean(options.fullResult) ? options.fullResult : false,
            requestId: query.requestId,
            socketTimeout: is.number(options.socketTimeout) ? options.socketTimeout : null
        };

        // Write the operation to the pool
        this.s.pool.write(query, writeOptions, callback);
    }

    insert(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        const result = basicWriteValidations(this, options);
        if (result) {
            return callback(result);
        }

        // If we are not connected or have a disconnectHandler specified
        if (disconnectHandler(this, "insert", ns, ops, options, callback)) {
            return;
        }

        // Setup the docs as an array
        ops = util.arrify(ops);

        // Execute write
        return this.wireProtocolHandler.insert(this.s.pool, this.ismaster, ns, this.s.bson, ops, options, callback);
    }

    update(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        const result = basicWriteValidations(this, options);
        if (result) {
            return callback(result);
        }

        // If we are not connected or have a disconnectHandler specified
        if (disconnectHandler(this, "update", ns, ops, options, callback)) {
            return;
        }

        // Check if we have collation support
        if (this.ismaster && this.ismaster.maxWireVersion < 5 && options.collation) {
            return callback(new MongoError(`server ${this.name} does not support collation`));
        }

        // Setup the docs as an array
        ops = util.arrify(ops);
        // Execute write
        return this.wireProtocolHandler.update(this.s.pool, this.ismaster, ns, this.s.bson, ops, options, callback);
    }

    remove(ns, ops, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        const result = basicWriteValidations(this, options);
        if (result) {
            return callback(result);
        }

        // If we are not connected or have a disconnectHandler specified
        if (disconnectHandler(this, "remove", ns, ops, options, callback)) {
            return;
        }

        // Check if we have collation support
        if (this.ismaster && this.ismaster.maxWireVersion < 5 && options.collation) {
            return callback(new MongoError(`server ${this.name} does not support collation`));
        }

        // Setup the docs as an array
        ops = util.arrify(ops);
        // Execute write
        return this.wireProtocolHandler.remove(this.s.pool, this.ismaster, ns, this.s.bson, ops, options, callback);
    }

    cursor(ns, cmd, cursorOptions = {}) {
        const s = this.s;
        // Set up final cursor type
        const FinalCursor = cursorOptions.cursorFactory || s.Cursor;
        // Return the cursor
        return new FinalCursor(s.bson, ns, cmd, cursorOptions, this, s.options);
    }

    logout(dbName, callback) {
        this.s.pool.logout(dbName, callback);
    }

    auth(...args) {
        // If we have the default mechanism we pick mechanism based on the wire
        // protocol max version. If it's >= 3 then scram-sha1 otherwise mongodb-cr
        let [mechanism] = args;
        const [, db] = args;
        if (mechanism === "default" && this.ismaster && this.ismaster.maxWireVersion >= 3) {
            mechanism = "scram-sha-1";
        } else if (mechanism === "default") {
            mechanism = "mongocr";
        }

        // Set the mechanism
        args[0] = mechanism;
        // Get the callback
        const callback = args[args.length - 1];

        // If we are not connected or have a disconnectHandler specified
        if (disconnectHandler(this, "auth", db, args, {}, callback)) {
            return;
        }

        // Do not authenticate if we are an arbiter
        if (this.lastIsMaster() && this.lastIsMaster().arbiterOnly) {
            return callback(null, true);
        }

        // Apply the arguments to the pool
        this.s.pool.auth.apply(this.s.pool, args);
    }

    equals(server) {
        if (is.string(server)) {
            return this.name.toLowerCase() === server.toLowerCase();
        }
        if (server.name) {
            return this.name.toLowerCase() === server.name.toLowerCase();
        }
        return false;
    }

    connections() {
        return this.s.pool.allConnections();
    }

    getServer() {
        return this;
    }

    getConnection() {
        return this.s.pool.get();
    }

    destroy(options = {}) {
        // Set the connections
        if (serverAccounting) {
            delete servers[this.id];
        }

        // Destroy the monitoring process if any
        if (this.monitoringProcessId) {
            clearTimeout(this.monitoringProcessId);
        }

        // No pool, return
        if (!this.s.pool) {
            return;
        }

        // Emit close event
        if (options.emitClose) {
            this.emit("close", this);
        }

        // Emit destroy event
        if (options.emitDestroy) {
            this.emit("destroy", this);
        }

        // Remove all listeners
        listeners.forEach((event) => {
            this.s.pool.removeAllListeners(event);
        });

        // Emit opening server event
        if (this.listeners("serverClosed").length > 0) {
            this.emit("serverClosed", {
                topologyId: this.s.topologyId !== -1 ? this.s.topologyId : this.id, address: this.name
            });
        }

        // Emit toplogy opening event if not in topology
        if (this.listeners("topologyClosed").length > 0 && !this.s.inTopology) {
            this.emit("topologyClosed", { topologyId: this.id });
        }

        // Destroy the pool
        this.s.pool.destroy(options.force);
    }

    static enableServerAccounting() {
        serverAccounting = true;
        servers = {};
    }

    static disableServerAccounting() {
        serverAccounting = false;
    }

    static servers() {
        return servers;
    }
}
