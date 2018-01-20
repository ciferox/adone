const {
    is,
    event,
    database: { mongo },
    std: { os }
} = adone;
const {
    MongoError,
    ReadPreference
} = mongo;
const __ = adone.private(mongo);
const {
    core,
    utils: {
        MAX_JS_INT,
        translateOptions,
        filterOptions,
        mergeOptions,
        getReadPreference
    }
} = __;

// Allowed parameters
const legalOptionNames = [
    "ha",
    "haInterval",
    "replicaSet",
    "rs_name",
    "secondaryAcceptableLatencyMS",
    "connectWithNoPrimary",
    "poolSize",
    "ssl",
    "checkServerIdentity",
    "sslValidate",
    "sslCA",
    "sslCert",
    "sslCRL",
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
    "strategy",
    "debug",
    "family",
    "loggerLevel",
    "logger",
    "reconnectTries",
    "appname",
    "domainsEnabled",
    "servername",
    "promoteLongs",
    "promoteValues",
    "promoteBuffers",
    "maxStalenessSeconds"
];

// Get package.json variable
const driverVersion = "2.2.22 : adone";
const nodejsversion = `Node.js ${process.version}, ${os.endianness()}`;
const type = os.type();
const name = process.platform;
const architecture = process.arch;
const release = os.release();

// Ensure the right read Preference object
const translateReadPreference = function (options) {
    if (is.string(options.readPreference)) {
        options.readPreference = new core.ReadPreference(options.readPreference);
    } else if (options.readPreference instanceof ReadPreference) {
        options.readPreference = new core.ReadPreference(options.readPreference.mode, options.readPreference.tags, {
            maxStalenessSeconds: options.readPreference.maxStalenessSeconds
        });
    }

    return options;
};

export default class ReplSet extends event.Emitter {
    constructor(servers, options) {
        super();
        options = options || {};
        // Filter the options
        options = filterOptions(options, legalOptionNames);

        // Ensure all the instances are Server
        for (let i = 0; i < servers.length; i++) {
            if (!(servers[i] instanceof __.Server)) {
                throw MongoError.create({ message: "all seed list instances must be of the Server type", driver: true });
            }
        }

        const storeOptions = {
            force: false,
            bufferMaxEntries: is.number(options.bufferMaxEntries) ? options.bufferMaxEntries : MAX_JS_INT
        };

        const store = options.store || new __.Store(this, storeOptions);

        const seedlist = servers.map((x) => ({ host: x.host, port: x.port }));

        let clonedOptions = mergeOptions({}, {
            disconnectHandler: store,
            cursorFactory: __.Cursor,
            reconnect: false,
            emitError: is.boolean(options.emitError) ? options.emitError : true,
            size: is.number(options.poolSize) ? options.poolSize : 5
        });

        // Translate any SSL options and other connectivity options
        clonedOptions = translateOptions(clonedOptions, options);

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
        // Do we have an application specific string
        if (options.appname) {
            clonedOptions.clientInfo.application = { name: options.appname };
        }

        const replset = new core.ReplSet(seedlist, clonedOptions);

        replset.on("reconnect", () => {
            this.emit("reconnect");
            store.execute();
        });

        this.s = {
            replset,
            sCapabilities: null,
            tag: options.tag,
            storeOptions,
            clonedOptions,
            store,
            options
        };

        if (clonedOptions.debug) {
            Object.defineProperty(this, "replset", {
                enumerable: true,
                get() {
                    return replset;
                }
            });
        }
    }

    get isMasterDoc() {
        return this.s.replset.lastIsMaster();
    }

    get parserType() {
        return this.s.replset.parserType;
    }

    get bson() {
        return this.s.replset.s.bson;
    }

    get haInterval() {
        return this.s.replset.s.haInterval;
    }

    connect(db, options) {
        return new Promise((resolve, reject) => {

            this.s.options = options;

            // Update bufferMaxEntries
            this.s.storeOptions.bufferMaxEntries = db.bufferMaxEntries;

            // Actual handler
            const errorHandler = (event) => (err) => {
                if (event !== "error") {
                    this.emit(event, err);
                }
            };

            // Clear out all the current handlers left over
            const events = [
                "timeout",
                "error",
                "close",
                "serverOpening",
                "serverDescriptionChanged",
                "serverHeartbeatStarted",
                "serverHeartbeatSucceeded",
                "serverHeartbeatFailed",
                "serverClosed",
                "topologyOpening",
                "topologyClosed",
                "topologyDescriptionChanged",
                "joined",
                "left",
                "ping",
                "ha"
            ];
            events.forEach((e) => {
                this.s.replset.removeAllListeners(e);
            });

            // relay the event
            const relay = (event) => (t, server) => {
                this.emit(event, t, server);
            };

            // Replset events relay
            const replsetRelay = (event) => (t, server) => {
                this.emit(event, t, server.lastIsMaster(), server);
            };

            // Relay ha
            const relayHa = (t, state) => {
                this.emit("ha", t, state);

                if (t === "start") {
                    this.emit("ha_connect", t, state);
                } else if (t === "end") {
                    this.emit("ha_ismaster", t, state);
                }
            };

            // Set up serverConfig listeners
            this.s.replset.on("joined", replsetRelay("joined"));
            this.s.replset.on("left", relay("left"));
            this.s.replset.on("ping", relay("ping"));
            this.s.replset.on("ha", relayHa);

            // Set up SDAM listeners
            this.s.replset.on("serverDescriptionChanged", relay("serverDescriptionChanged"));
            this.s.replset.on("serverHeartbeatStarted", relay("serverHeartbeatStarted"));
            this.s.replset.on("serverHeartbeatSucceeded", relay("serverHeartbeatSucceeded"));
            this.s.replset.on("serverHeartbeatFailed", relay("serverHeartbeatFailed"));
            this.s.replset.on("serverOpening", relay("serverOpening"));
            this.s.replset.on("serverClosed", relay("serverClosed"));
            this.s.replset.on("topologyOpening", relay("topologyOpening"));
            this.s.replset.on("topologyClosed", relay("topologyClosed"));
            this.s.replset.on("topologyDescriptionChanged", relay("topologyDescriptionChanged"));

            this.s.replset.on("fullsetup", () => {
                this.emit("fullsetup", this, this);
            });

            this.s.replset.on("all", () => {
                this.emit("all", null, this);
            });

            // Connect handler
            const connectHandler = () => {
                // Set up listeners
                this.s.replset.once("timeout", errorHandler("timeout"));
                this.s.replset.once("error", errorHandler("error"));
                this.s.replset.once("close", errorHandler("close"));

                // Emit open event
                this.emit("open", null, this);

                resolve(this);
            };

            // Error handler
            const connectErrorHandler = () => (err) => {
                ["timeout", "error", "close"].forEach((e) => {
                    this.s.replset.removeListener(e, connectErrorHandler);
                });

                this.s.replset.removeListener("connect", connectErrorHandler);
                // Destroy the replset
                this.s.replset.destroy();

                reject(err);
            };

            // Set up listeners
            this.s.replset.once("timeout", connectErrorHandler("timeout"));
            this.s.replset.once("error", connectErrorHandler("error"));
            this.s.replset.once("close", connectErrorHandler("close"));
            this.s.replset.once("connect", connectHandler);

            // Start connection
            this.s.replset.connect(options);
        });
    }

    capabilities() {
        if (this.s.sCapabilities) {
            return this.s.sCapabilities;
        }
        if (is.nil(this.s.replset.lastIsMaster())) {
            return null;
        }
        this.s.sCapabilities = new __.ServerCapabilities(this.s.replset.lastIsMaster());
        return this.s.sCapabilities;
    }

    command(ns, cmd, options, callback) {
        if (is.function(callback)) {
            return this.s.replset.command(ns, cmd, getReadPreference(options), callback);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.command(ns, cmd, getReadPreference(options), (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }


    insert(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.replset.insert(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.insert(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    update(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.replset.update(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.update(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    remove(ns, ops, options, callback) {
        if (is.function(callback)) {
            return this.s.replset.remove(ns, ops, options, callback);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.remove(ns, ops, options, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    isDestroyed() {
        return this.s.replset.isDestroyed();
    }

    isConnected(options = {}) {
        // If we passed in a readPreference, translate to
        // a CoreReadPreference instance
        if (options.readPreference) {
            options.readPreference = translateReadPreference(options.readPreference);
        }

        return this.s.replset.isConnected(options);
    }

    cursor(ns, cmd, options) {
        options = translateReadPreference(options);
        options.disconnectHandler = this.s.store;
        return this.s.replset.cursor(ns, cmd, options);
    }

    lastIsMaster() {
        return this.s.replset.lastIsMaster();
    }

    unref() {
        return this.s.replset.unref();
    }

    close(forceClosed) {
        // Call destroy on the topology
        this.s.replset.destroy({
            force: is.boolean(forceClosed) ? forceClosed : false
        });
        // We need to wash out all stored processes
        if (forceClosed === true) {
            this.s.storeOptions.force = forceClosed;
            this.s.store.flush();
        }

        const events = ["timeout", "error", "close", "joined", "left"];
        events.forEach((e) => {
            this.removeAllListeners(e);
        });
    }

    auth(...args) {
        if (is.function(args[args.length - 1])) {
            return this.s.replset.auth(...args);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.auth(...args, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }


    logout(...args) {
        if (is.function(args[args.length - 1])) {
            return this.s.replset.logout(...args);
        }
        return new Promise((resolve, reject) => {
            this.s.replset.logout(...args, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }


    connections() {
        return this.s.replset.connections();
    }
}
