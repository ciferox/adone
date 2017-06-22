const EventEmitter = require("events").EventEmitter;
const f = require("util").format;
const ServerCapabilities = require("./topology_base").ServerCapabilities;
const MongoError = require("../core").MongoError;
const CMongos = require("../core").Mongos;
const Cursor = require("./cursor");
const AggregationCursor = require("./aggregation_cursor");
const CommandCursor = require("./command_cursor");
const Define = require("./metadata");
const Server = require("./server");
const Store = require("./topology_base").Store;
const MAX_JS_INT = require("./utils").MAX_JS_INT;
const translateOptions = require("./utils").translateOptions;
const filterOptions = require("./utils").filterOptions;
const mergeOptions = require("./utils").mergeOptions;
const getReadPreference = require("./utils").getReadPreference;
const os = require("os");

// Get package.json variable
const driverVersion = "2.2.22";
const nodejsversion = f("Node.js %s, %s", process.version, os.endianness());
const type = os.type();
const name = process.platform;
const architecture = process.arch;
const release = os.release();

const { is } = adone;

const legalOptionNames = [
    "ha",
    "haInterval",
    "acceptableLatencyMS",
    "poolSize",
    "ssl",
    "checkServerIdentity",
    "sslValidate",
    "sslCA",
    "sslCRL",
    "sslCert",
    "sslKey",
    "sslPass",
    "socketOptions",
    "bufferMaxEntries",
    "store",
    "auto_reconnect",
    "autoReconnect",
    "emitError",
    "keepAlive",
    "noDelay",
    "connectTimeoutMS",
    "socketTimeoutMS",
    "reconnectTries",
    "appname",
    "domainsEnabled",
    "servername",
    "promoteLongs",
    "promoteValues",
    "promoteBuffers"
];

const { metadata } = Define;
const { classMethod } = metadata;

@metadata("Mongos")
class Mongos extends EventEmitter {
    constructor(servers, options) {
        super();
        options = options || {};
        const self = this;

        // Filter the options
        options = filterOptions(options, legalOptionNames);

        // Ensure all the instances are Server
        for (let i = 0; i < servers.length; i++) {
            if (!(servers[i] instanceof Server)) {
                throw MongoError.create({ message: "all seed list instances must be of the Server type", driver: true });
            }
        }

        // Stored options
        const storeOptions = {
            force: false,
            bufferMaxEntries: is.number(options.bufferMaxEntries) ? options.bufferMaxEntries : MAX_JS_INT
        };

        // Shared global store
        const store = options.store || new Store(self, storeOptions);

        const seedlist = servers.map((x) => {
            return { host: x.host, port: x.port };
        });

        let reconnect = is.boolean(options.auto_reconnect) ? options.auto_reconnect : true;
        reconnect = is.boolean(options.autoReconnect) ? options.autoReconnect : reconnect;

        // Clone options
        let clonedOptions = mergeOptions({}, {
            disconnectHandler: store,
            cursorFactory: Cursor,
            reconnect,
            emitError: is.boolean(options.emitError) ? options.emitError : true,
            size: is.number(options.poolSize) ? options.poolSize : 5
        });

        // Translate any SSL options and other connectivity options
        clonedOptions = translateOptions(clonedOptions, options);

        // Socket options
        const socketOptions = options.socketOptions && !is.emptyObject(options.socketOptions)
            ? options.socketOptions
            : options;

        // Translate all the options to the mongodb-core ones
        clonedOptions = translateOptions(clonedOptions, socketOptions);
        if (is.number(clonedOptions.keepAlive)) {
            clonedOptions.keepAliveInitialDelay = clonedOptions.keepAlive;
            clonedOptions.keepAlive = clonedOptions.keepAlive > 0;
        }

        // Build default client information
        this.clientInfo = {
            driver: {
                name: "nodejs",
                version: driverVersion
            },
            os: {
                type,
                name,
                architecture,
                version: release
            },
            platform: nodejsversion
        };

        // Build default client information
        clonedOptions.clientInfo = this.clientInfo;
        // Do we have an application specific string
        if (options.appname) {
            clonedOptions.clientInfo.application = { name: options.appname };
        }

        // Create the Mongos
        const mongos = new CMongos(seedlist, clonedOptions);
        // Server capabilities
        const sCapabilities = null;

        // Internal state
        this.s = {
            // Create the Mongos
            mongos,
            // Server capabilities
            sCapabilities,
            // Debug turned on
            debug: clonedOptions.debug,
            // Store option defaults
            storeOptions,
            // Cloned options
            clonedOptions,
            // Actual store of callbacks
            store,
            // Options
            options
        };
    }

    get isMasterDoc() {
        return this.s.mongos.lastIsMaster();
    }

    get parserType() {
        return this.s.mongos.parserType;
    }

    get bson() {
        return this.s.mongos.s.bson;
    }

    get haInterval() {
        return this.s.mongos.s.haInterval;
    }

    connect(db, _options, callback) {
        const self = this;
        if (is.function(_options)) {
            [callback, _options] = [_options, {}];
        }
        if (is.nil(_options)) {
            _options = {};
        }
        if (!is.function(callback)) {
            callback = null;
        }
        self.s.options = _options;

        // Update bufferMaxEntries
        self.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

        // Error handler
        const connectErrorHandler = () => (err) => {
            // Remove all event handlers
            const events = ["timeout", "error", "close"];
            events.forEach((e) => {
                self.removeListener(e, connectErrorHandler);
            });

            self.s.mongos.removeListener("connect", connectErrorHandler);

            // Try to callback
            try {
                callback(err);
            } catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        };

        // Actual handler
        const errorHandler = (event) => (err) => {
            if (event !== "error") {
                self.emit(event, err);
            }
        };

        // Error handler
        const reconnectHandler = () => {
            self.emit("reconnect");
            self.s.store.execute();
        };

        // relay the event
        const relay = (event) => (t, server) => {
            self.emit(event, t, server);
        };

        // Clear out all the current handlers left over
        ["timeout", "error", "close", "serverOpening", "serverDescriptionChanged", "serverHeartbeatStarted",
            "serverHeartbeatSucceeded", "serverHeartbeatFailed", "serverClosed", "topologyOpening",
            "topologyClosed", "topologyDescriptionChanged"].forEach((e) => {
            self.s.mongos.removeAllListeners(e);
        });

        // Set up SDAM listeners
        self.s.mongos.on("serverDescriptionChanged", relay("serverDescriptionChanged"));
        self.s.mongos.on("serverHeartbeatStarted", relay("serverHeartbeatStarted"));
        self.s.mongos.on("serverHeartbeatSucceeded", relay("serverHeartbeatSucceeded"));
        self.s.mongos.on("serverHeartbeatFailed", relay("serverHeartbeatFailed"));
        self.s.mongos.on("serverOpening", relay("serverOpening"));
        self.s.mongos.on("serverClosed", relay("serverClosed"));
        self.s.mongos.on("topologyOpening", relay("topologyOpening"));
        self.s.mongos.on("topologyClosed", relay("topologyClosed"));
        self.s.mongos.on("topologyDescriptionChanged", relay("topologyDescriptionChanged"));

        // self.s.mongos.on("fullsetup", relay("fullsetup"));
        self.s.mongos.on("fullsetup", () => {
            self.emit("fullsetup", self, self);
        });

        // Connect handler
        const connectHandler = function () {

            // Set up listeners
            self.s.mongos.once("timeout", errorHandler("timeout"));
            self.s.mongos.once("error", errorHandler("error"));
            self.s.mongos.once("close", errorHandler("close"));

            // Emit open event
            self.emit("open", null, self);

            // Return correctly
            try {
                callback(null, self);
            } catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        };

        // Set up listeners
        self.s.mongos.once("timeout", connectErrorHandler("timeout"));
        self.s.mongos.once("error", connectErrorHandler("error"));
        self.s.mongos.once("close", connectErrorHandler("close"));
        self.s.mongos.once("connect", connectHandler);
        // Join and leave events
        self.s.mongos.on("joined", relay("joined"));
        self.s.mongos.on("left", relay("left"));

        // Reconnect server
        self.s.mongos.on("reconnect", reconnectHandler);

        // Start connection
        self.s.mongos.connect(_options);
    }

    @classMethod({ callback: false, promise: false, returns: [ServerCapabilities] })
    capabilities() {
        if (this.s.sCapabilities) {
            return this.s.sCapabilities;
        }
        if (is.nil(this.s.mongos.lastIsMaster())) {
            return null;
        }
        this.s.sCapabilities = new ServerCapabilities(this.s.mongos.lastIsMaster());
        return this.s.sCapabilities;
    }

    @classMethod({ callback: true, promise: false })
    command(ns, cmd, options, callback) {
        this.s.mongos.command(ns, cmd, getReadPreference(options), callback);
    }

    @classMethod({ callback: true, promise: false })
    insert(ns, ops, options, callback) {
        this.s.mongos.insert(ns, ops, options, (e, m) => {
            callback(e, m);
        });
    }


    @classMethod({ callback: true, promise: false })
    update(ns, ops, options, callback) {
        this.s.mongos.update(ns, ops, options, callback);
    }

    @classMethod({ callback: true, promise: false })
    remove(ns, ops, options, callback) {
        this.s.mongos.remove(ns, ops, options, callback);
    }

    @classMethod({ callback: false, promise: false, returns: [Boolean] })
    isDestroyed() {
        return this.s.mongos.isDestroyed();
    }

    @classMethod({ callback: false, promise: false, returns: [Boolean] })
    isConnected() {
        return this.s.mongos.isConnected();
    }

    @classMethod({ callback: false, promise: false, returns: [Cursor, AggregationCursor, CommandCursor] })
    cursor(ns, cmd, options) {
        options.disconnectHandler = this.s.store;
        return this.s.mongos.cursor(ns, cmd, options);
    }

    lastIsMaster() {
        return this.s.mongos.lastIsMaster();
    }

    unref() {
        return this.s.mongos.unref();
    }

    @classMethod({ callback: false, promise: false })
    close(forceClosed) {
        this.s.mongos.destroy({
            force: is.boolean(forceClosed) ? forceClosed : false
        });
        // We need to wash out all stored processes
        if (forceClosed === true) {
            this.s.storeOptions.force = forceClosed;
            this.s.store.flush();
        }
    }

    @classMethod({ callback: true, promise: false })
    auth(...args) {
        this.s.mongos.auth(...args);
    }

    @classMethod({ callback: true, promise: false })
    logout(...args) {
        this.s.mongos.logout(...args);
    }


    @classMethod({ callback: false, promise: false, returns: [Array] })
    connections() {
        return this.s.mongos.connections();
    }
}

module.exports = Mongos;
