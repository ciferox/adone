const {
    is,
    event: { EventEmitter },
    database: { mongo },
    std: { os }
} = adone;
const { __, MongoError, core } = mongo;
const { utils: { MAX_JS_INT, translateOptions, filterOptions, mergeOptions, getReadPreference } } = __;

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

    connect(db, options) {
        return new Promise((resolve, reject) => {
            this.s.options = options;

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

                reject(err);
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

                resolve(this);
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
            this.s.mongos.connect(options);
        });
    }

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

    command(ns, cmd, options, callback) {
        if (is.function(callback)) {
            return this.s.mongos.command(ns, cmd, getReadPreference(options), callback);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.command(ns, cmd, getReadPreference(options), (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    insert(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.mongos.insert(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.insert(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }


    update(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.mongos.update(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.update(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    remove(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.mongos.remove(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.remove(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    isDestroyed() {
        return this.s.mongos.isDestroyed();
    }

    isConnected() {
        return this.s.mongos.isConnected();
    }

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

    auth(...args) {
        if (is.function(args[args.length - 1])) {
            return this.s.mongos.auth(...args);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.auth(...args, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    logout(...args) {
        if (is.function(args[args.length - 1])) {
            return this.s.mongos.logout(...args);
        }
        return new Promise((resolve, reject) => {
            this.s.mongos.logout(...args, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }


    connections() {
        return this.s.mongos.connections();
    }
}
