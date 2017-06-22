const { is } = adone;

const EventEmitter = require("events").EventEmitter;
const CServer = require("../core").Server;
const Cursor = require("./cursor");
const AggregationCursor = require("./aggregation_cursor");
const CommandCursor = require("./command_cursor");
const f = require("util").format;
const ServerCapabilities = require("./topology_base").ServerCapabilities;
const Store = require("./topology_base").Store;
const Define = require("./metadata");
const MongoError = require("../core").MongoError;
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
    "family",
    "loggerLevel",
    "logger",
    "reconnectTries",
    "reconnectInterval",
    "monitoring",
    "appname",
    "domainsEnabled",
    "servername",
    "promoteLongs",
    "promoteValues",
    "promoteBuffers"
];
const { metadata } = Define;
const { classMethod } = metadata;

@metadata("Server")
class Server extends EventEmitter {
    constructor(host, port, options = {}) {
        super();
        options = filterOptions(options, legalOptionNames);

        const storeOptions = {
            force: false,
            bufferMaxEntries: is.number(options.bufferMaxEntries) ? options.bufferMaxEntries : MAX_JS_INT
        };

        const store = options.store || new Store(this, storeOptions);

        // Detect if we have a socket connection
        if (host.includes("/")) {
            if (!is.nil(port) && is.object(port)) {
                options = port;
                port = null;
            }
        } else if (is.nil(port)) {
            throw MongoError.create({ message: "port must be specified", driver: true });
        }

        // Get the reconnect option
        let reconnect = is.boolean(options.auto_reconnect) ? options.auto_reconnect : true;
        reconnect = is.boolean(options.autoReconnect) ? options.autoReconnect : reconnect;

        // Clone options
        let clonedOptions = mergeOptions({}, {
            host, port, disconnectHandler: store,
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

        clonedOptions.clientInfo = this.clientInfo;
        if (options.appname) {
            clonedOptions.clientInfo.application = { name: options.appname };
        }

        const server = new CServer(clonedOptions);
        this.s = {
            server,
            sCapabilities: null,
            clonedOptions,
            reconnect: clonedOptions.reconnect,
            emitError: clonedOptions.emitError,
            poolSize: clonedOptions.size,
            storeOptions,
            store,
            host,
            port,
            options
        };
    }

    get bson() {
        return this.s.server.s.bson;
    }

    get isMasterDoc() {
        return this.s.server.lastIsMaster();
    }

    get parserType() {
        return this.s.server.parserType;
    }

    get poolSize() {
        return this.s.server.connections().length;
    }

    get autoReconnect() {
        return this.s.reconnect;
    }

    get host() {
        return this.s.host;
    }

    get port() {
        return this.s.port;
    }

    connect(db, _options, callback) {
        if (is.function(_options)) {
            [callback, _options] = [_options, {}];
        }
        if (is.nil(_options)) {
            _options = {};
        }
        if (!is.function(callback)) {
            callback = null;
        }
        this.s.options = _options;

        this.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

        const connectErrorHandler = () => (err) => {
            ["timeout", "error", "close"].forEach((e) => {
                // eslint-disable-next-line no-use-before-define
                this.s.server.removeListener(e, connectHandlers[e]);
            });

            this.s.server.removeListener("connect", connectErrorHandler);

            try {
                callback(err);
            } catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        };

        const connectHandlers = {
            timeout: connectErrorHandler("timeout"),
            error: connectErrorHandler("error"),
            close: connectErrorHandler("close")
        };

        const errorHandler = (event) => (err) => {
            if (event !== "error") {
                this.emit(event, err);
            }
        };

        const reconnectHandler = () => {
            this.emit("reconnect", this);
            this.s.store.execute();
        };

        const reconnectFailedHandler = (err) => {
            this.emit("reconnectFailed", err);
            this.s.store.flush(err);
        };

        const destroyHandler = () => {
            this.s.store.flush();
        };

        const relay = (event) => (t, server) => {
            this.emit(event, t, server);
        };

        const connectHandler = () => {
            ["timeout", "error", "close", "destroy"].forEach((e) => {
                this.s.server.removeAllListeners(e);
            });

            this.s.server.on("timeout", errorHandler("timeout"));
            this.s.server.once("error", errorHandler("error"));
            this.s.server.on("close", errorHandler("close"));
            this.s.server.on("destroy", destroyHandler);
            this.emit("open", null, this);
            try {
                callback(null, this);
            } catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        };

        ["timeout", "error", "close", "serverOpening", "serverDescriptionChanged", "serverHeartbeatStarted",
            "serverHeartbeatSucceeded", "serverHeartbeatFailed", "serverClosed", "topologyOpening",
            "topologyClosed", "topologyDescriptionChanged"].forEach((e) => {
            this.s.server.removeAllListeners(e);
        });

        this.s.server.once("timeout", connectHandlers.timeout);
        this.s.server.once("error", connectHandlers.error);
        this.s.server.once("close", connectHandlers.close);
        this.s.server.once("connect", connectHandler);

        // Reconnect server
        this.s.server.on("reconnect", reconnectHandler);
        this.s.server.on("reconnectFailed", reconnectFailedHandler);

        // Set up SDAM listeners
        this.s.server.on("serverDescriptionChanged", relay("serverDescriptionChanged"));
        this.s.server.on("serverHeartbeatStarted", relay("serverHeartbeatStarted"));
        this.s.server.on("serverHeartbeatSucceeded", relay("serverHeartbeatSucceeded"));
        this.s.server.on("serverHeartbeatFailed", relay("serverHeartbeatFailed"));
        this.s.server.on("serverOpening", relay("serverOpening"));
        this.s.server.on("serverClosed", relay("serverClosed"));
        this.s.server.on("topologyOpening", relay("topologyOpening"));
        this.s.server.on("topologyClosed", relay("topologyClosed"));
        this.s.server.on("topologyDescriptionChanged", relay("topologyDescriptionChanged"));
        this.s.server.on("attemptReconnect", relay("attemptReconnect"));
        this.s.server.on("monitoring", relay("monitoring"));

        this.s.server.connect(_options);
    }

    @classMethod({ callback: false, promise: false, returns: [ServerCapabilities] })
    capabilities() {
        if (this.s.sCapabilities) {
            return this.s.sCapabilities;
        }
        if (is.nil(this.s.server.lastIsMaster())) {
            return null;
        }
        this.s.sCapabilities = new ServerCapabilities(this.s.server.lastIsMaster());
        return this.s.sCapabilities;
    }

    @classMethod({ callback: true, promise: false })
    command(ns, cmd, options, callback) {
        this.s.server.command(ns, cmd, getReadPreference(options), callback);
    }

    @classMethod({ callback: true, promise: false })
    insert(ns, ops, options, callback) {
        this.s.server.insert(ns, ops, options, callback);
    }

    @classMethod({ callback: true, promise: false })
    update(ns, ops, options, callback) {
        this.s.server.update(ns, ops, options, callback);
    }

    @classMethod({ callback: true, promise: false })
    remove(ns, ops, options, callback) {
        this.s.server.remove(ns, ops, options, callback);
    }

    @classMethod({ callback: false, promise: false, returns: [Boolean] })
    isConnected() {
        return this.s.server.isConnected();
    }

    isDestroyed() {
        return this.s.server.isDestroyed();
    }

    @classMethod({ callback: false, promise: false, returns: [Cursor, AggregationCursor, CommandCursor] })
    cursor(ns, cmd, options) {
        options.disconnectHandler = this.s.store;
        return this.s.server.cursor(ns, cmd, options);
    }

    lastIsMaster() {
        return this.s.server.lastIsMaster();
    }

    unref() {
        this.s.server.unref();
    }

    @classMethod({ callback: false, promise: false })
    close(forceClosed) {
        this.s.server.destroy();
        // We need to wash out all stored processes
        if (forceClosed === true) {
            this.s.storeOptions.force = forceClosed;
            this.s.store.flush();
        }
    }

    @classMethod({ callback: true, promise: false })
    auth(...args) {
        this.s.server.auth.apply(this.s.server, args);
    }

    @classMethod({ callback: true, promise: false })
    logout(...args) {
        this.s.server.logout.apply(this.s.server, args);
    }

    @classMethod({ callback: false, promise: false, returns: [Array] })
    connections() {
        return this.s.server.connections();
    }
}

module.exports = Server;
