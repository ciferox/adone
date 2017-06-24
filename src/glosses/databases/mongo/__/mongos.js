const { is, EventEmitter, database: { mongo }, std: { os } } = adone;
const { __, MongoError, core } = mongo;
const { metadata, utils: { MAX_JS_INT, translateOptions, filterOptions, mergeOptions, getReadPreference } } = __;
const { classMethod } = metadata;

const driverVersion = "2.2.22 : adone"; // adone ver?
const nodejsversion = `Node.js ${process.version}, ${os.endianness()}`;
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
    "reconnectTries",
    "appname",
    "domainsEnabled",
    "servername",
    "promoteLongs",
    "promoteValues",
    "promoteBuffers"
];

@metadata("Mongos")
export default class Mongos extends EventEmitter {
    constructor(servers, options) {
        super();
        options = options || {};
        const self = this;

        // Filter the options
        options = filterOptions(options, legalOptionNames);

        // Ensure all the instances are Server
        for (let i = 0; i < servers.length; i++) {
            if (!(servers[i] instanceof __.Server)) {
                throw MongoError.create({ message: "all seed list instances must be of the Server type", driver: true });
            }
        }

        // Stored options
        const storeOptions = {
            force: false,
            bufferMaxEntries: is.number(options.bufferMaxEntries) ? options.bufferMaxEntries : MAX_JS_INT
        };

        // Shared global store
        const store = options.store || new __.Store(self, storeOptions);

        const seedlist = servers.map((x) => {
            return { host: x.host, port: x.port };
        });

        let reconnect = is.boolean(options.auto_reconnect) ? options.auto_reconnect : true;
        reconnect = is.boolean(options.autoReconnect) ? options.autoReconnect : reconnect;

        // Clone options
        let clonedOptions = mergeOptions({}, {
            disconnectHandler: store,
            cursorFactory: __.Cursor,
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
        const mongos = new core.Mongos(seedlist, clonedOptions);
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

        // Update bufferMaxEntries
        this.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

        // Error handler
        const connectErrorHandler = () => (err) => {
            // Remove all event handlers
            const events = ["timeout", "error", "close"];
            events.forEach((e) => {
                this.removeListener(e, connectErrorHandler);
            });

            this.s.mongos.removeListener("connect", connectErrorHandler);

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
                this.emit(event, err);
            }
        };

        // Error handler
        const reconnectHandler = () => {
            this.emit("reconnect");
            this.s.store.execute();
        };

        // relay the event
        const relay = (event) => (t, server) => {
            this.emit(event, t, server);
        };

        // Clear out all the current handlers left over
        ["timeout", "error", "close", "serverOpening", "serverDescriptionChanged", "serverHeartbeatStarted",
            "serverHeartbeatSucceeded", "serverHeartbeatFailed", "serverClosed", "topologyOpening",
            "topologyClosed", "topologyDescriptionChanged"].forEach((e) => {
            this.s.mongos.removeAllListeners(e);
        });

        // Set up SDAM listeners
        this.s.mongos.on("serverDescriptionChanged", relay("serverDescriptionChanged"));
        this.s.mongos.on("serverHeartbeatStarted", relay("serverHeartbeatStarted"));
        this.s.mongos.on("serverHeartbeatSucceeded", relay("serverHeartbeatSucceeded"));
        this.s.mongos.on("serverHeartbeatFailed", relay("serverHeartbeatFailed"));
        this.s.mongos.on("serverOpening", relay("serverOpening"));
        this.s.mongos.on("serverClosed", relay("serverClosed"));
        this.s.mongos.on("topologyOpening", relay("topologyOpening"));
        this.s.mongos.on("topologyClosed", relay("topologyClosed"));
        this.s.mongos.on("topologyDescriptionChanged", relay("topologyDescriptionChanged"));

        // self.s.mongos.on("fullsetup", relay("fullsetup"));
        this.s.mongos.on("fullsetup", () => {
            this.emit("fullsetup", this, this);
        });

        // Connect handler
        const connectHandler = () => {

            // Set up listeners
            this.s.mongos.once("timeout", errorHandler("timeout"));
            this.s.mongos.once("error", errorHandler("error"));
            this.s.mongos.once("close", errorHandler("close"));

            // Emit open event
            this.emit("open", null, this);

            // Return correctly
            try {
                callback(null, this);
            } catch (err) {
                process.nextTick(() => {
                    throw err;
                });
            }
        };

        // Set up listeners
        this.s.mongos.once("timeout", connectErrorHandler("timeout"));
        this.s.mongos.once("error", connectErrorHandler("error"));
        this.s.mongos.once("close", connectErrorHandler("close"));
        this.s.mongos.once("connect", connectHandler);
        // Join and leave events
        this.s.mongos.on("joined", relay("joined"));
        this.s.mongos.on("left", relay("left"));

        // Reconnect server
        this.s.mongos.on("reconnect", reconnectHandler);

        // Start connection
        this.s.mongos.connect(_options);
    }

    @classMethod({ callback: false, promise: false, returns: [__.ServerCapabilities] })
    capabilities() {
        if (this.s.sCapabilities) {
            return this.s.sCapabilities;
        }
        if (is.nil(this.s.mongos.lastIsMaster())) {
            return null;
        }
        this.s.sCapabilities = new __.ServerCapabilities(this.s.mongos.lastIsMaster());
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

    @classMethod({ callback: false, promise: false, returns: [__.Cursor, __.AggregationCursor, __.CommandCursor] })
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
