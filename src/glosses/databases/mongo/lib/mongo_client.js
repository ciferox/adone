const { is } = adone;

const parse = require("./url_parser");
const Server = require("./server");
const Mongos = require("./mongos");
const ReplSet = require("./replset");
const Define = require("./metadata");
const ReadPreference = require("./read_preference");
const MongoError = require("../core").MongoError;
const Db = require("./db");
const f = require("util").format;
const shallowClone = require("./utils").shallowClone;
const EventEmitter = require("events").EventEmitter;
const authenticate = require("./authenticate");

const validOptionNames = [
    "poolSize",
    "ssl",
    "sslValidate",
    "sslCA",
    "sslCert",
    "sslKey",
    "sslPass",
    "sslCRL",
    "autoReconnect",
    "noDelay",
    "keepAlive",
    "connectTimeoutMS",
    "family",
    "socketTimeoutMS",
    "reconnectTries",
    "reconnectInterval",
    "ha",
    "haInterval",
    "replicaSet",
    "secondaryAcceptableLatencyMS",
    "acceptableLatencyMS",
    "connectWithNoPrimary",
    "authSource",
    "w",
    "wtimeout",
    "j",
    "forceServerObjectId",
    "serializeFunctions",
    "ignoreUndefined",
    "raw",
    "promoteLongs",
    "bufferMaxEntries",
    "readPreference",
    "pkFactory",
    "promiseLibrary",
    "readConcern",
    "maxStalenessSeconds",
    "promoteValues",
    "promoteBuffers",
    "promoteLongs",
    "domainsEnabled",
    "keepAliveInitialDelay",
    "checkServerIdentity",
    "validateOptions"
];

const ignoreOptionNames = ["native_parser"];

const legacyOptionNames = ["server", "replset", "replSet", "mongos", "db"];

const validOptions = (options) => {
    const _validOptions = validOptionNames.concat(legacyOptionNames);

    for (const name in options) {
        if (ignoreOptionNames.includes(name)) {
            continue;
        }

        if (!_validOptions.includes(name) && options.validateOptions) {
            return new MongoError(f("option %s is not supported", name));
        } else if (!_validOptions.includes(name)) {
            adone.warn(f("the options [%s] is not supported", name));
        }

        if (legacyOptionNames.includes(name)) {
            adone.warn(f("the server/replset/mongos options are deprecated, all their options are supported at the top level of the options object [%s]", validOptionNames));
        }
    }
};

const mergeOptions = function (target, source, flatten) {
    for (const name in source) {
        if (
            source[name] &&
            is.object(source[name]) &&
            !is.buffer(source[name]) &&
            !is.function(source[name]) &&
            !is.array(source[name]) &&
            flatten
        ) {
            target = mergeOptions(target, source[name], flatten);
        } else {
            target[name] = source[name];
        }
    }

    return target;
};

const createUnifiedOptions = function (finalOptions, options) {
    const childOptions = ["mongos", "server", "db",
        "replset", "db_options", "server_options", "rs_options", "mongos_options"];
    const noMerge = ["readconcern", "pkfactory"];

    for (const name in options) {
        if (noMerge.includes(name.toLowerCase())) {
            finalOptions[name] = options[name];
        } else if (childOptions.includes(name.toLowerCase())) {
            finalOptions = mergeOptions(finalOptions, options[name], false);
        } else {
            if (
                options[name] &&
                is.object(options[name]) &&
                !is.function(options[name]) &&
                !is.buffer(options[name]) &&
                !is.array(options[name])
            ) {
                finalOptions = mergeOptions(finalOptions, options[name], true);
            } else {
                finalOptions[name] = options[name];
            }
        }
    }

    return finalOptions;
};

const translateOptions = (options) => {
    // If we have a readPreference passed in by the db options
    if (is.string(options.readPreference) || is.string(options.read_preference)) {
        options.readPreference = new ReadPreference(options.readPreference || options.read_preference);
    }

    // Do we have readPreference tags, add them
    if (options.readPreference && (options.readPreferenceTags || options.read_preference_tags)) {
        options.readPreference.tags = options.readPreferenceTags || options.read_preference_tags;
    }

    // Do we have maxStalenessSeconds
    if (options.maxStalenessSeconds) {
        options.readPreference.maxStalenessSeconds = options.maxStalenessSeconds;
    }

    // Set the socket and connection timeouts
    if (is.nil(options.socketTimeoutMS)) {
        options.socketTimeoutMS = 360000;
    }
    if (is.nil(options.connectTimeoutMS)) {
        options.connectTimeoutMS = 30000;
    }

    // Create server instances
    return options.servers.map((serverObj) => {
        return serverObj.domain_socket
            ? new Server(serverObj.domain_socket, 27017, options)
            : new Server(serverObj.host, serverObj.port, options);
    });
};

// Collect all events in order from SDAM
const collectEvents = (self, db) => {
    const collectedEvents = [];
    // eslint-disable-next-line no-use-before-define
    if (self instanceof MongoClient) {
        const events = [
            "timeout",
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
            "ha",
            "all",
            "fullsetup"
        ];
        events.forEach((event) => {
            db.serverConfig.on(event, (object1, object2) => {
                collectedEvents.push({
                    event, object1, object2
                });
            });
        });
    }

    return collectedEvents;
};

const replayEvents = (self, events) => {
    for (let i = 0; i < events.length; i++) {
        self.emit(events[i].event, events[i].object1, events[i].object2);
    }
};

const relayEvents = (self, db) => {
    // eslint-disable-next-line no-use-before-define
    if (self instanceof MongoClient) {
        const events = [
            "timeout",
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
            "ha",
            "all",
            "fullsetup"
        ];
        events.forEach((event) => {
            db.serverConfig.on(event, (object1, object2) => {
                self.emit(event, object1, object2);
            });
        });
    }
};

const connectHandler = (options, callback) => (err, db) => {
    if (err) {
        return process.nextTick(() => {
            try {
                callback(err, null);
            } catch (err) {
                if (db) {
                    db.close();
                }
                throw err;
            }
        });
    }

    // No authentication just reconnect
    if (!options.auth) {
        return process.nextTick(() => {
            try {
                callback(err, db);
            } catch (err) {
                if (db) {
                    db.close();
                }
                throw err;
            }
        });
    }

    // What db to authenticate against
    let authenticationDb = db;
    if (options.authSource) {
        authenticationDb = db.db(options.authSource);
    }

    // Authenticate
    authenticate(authenticationDb, options.user, options.password, options, (err, success) => {
        if (success) {
            process.nextTick(() => {
                try {
                    callback(null, db);
                } catch (err) {
                    if (db) {
                        db.close();
                    }
                    throw err;
                }
            });
        } else {
            if (db) {
                db.close();
            }
            process.nextTick(() => {
                try {
                    callback(err ? err : new Error(`Could not authenticate user ${options.auth[0]}`), null);
                } catch (err) {
                    if (db) {
                        db.close();
                    }
                    throw err;
                }
            });
        }
    });
};

const { metadata } = Define;
const { classMethod, staticMethod } = metadata;

@metadata("MongoClient")
class MongoClient extends EventEmitter {
    constructor({ relayEvents = true } = {}) {
        super();
        this.relayEvents = relayEvents;
    }

    _createReplicaset(options, callback) {
        // Set default options
        const servers = translateOptions(options);
        // Create Db instance
        const db = new Db(options.dbName, new ReplSet(servers, options), options);
        if (this.relayEvents) {
            // Propegate the events to the client
            relayEvents(this, db);
        }
        // Open the connection
        db.open(callback);
    }

    _createMongos(options, callback) {
        // Set default options
        const servers = translateOptions(options);
        // Create Db instance
        const db = new Db(options.dbName, new Mongos(servers, options), options);
        if (this.relayEvents) {
            // Propegate the events to the client
            relayEvents(this, db);
        }
        // Open the connection
        db.open(callback);
    }

    _createServer(options, callback) {
        // Set default options
        const servers = translateOptions(options);
        // Create db instance
        const db = new Db(options.dbName, servers[0], options);
        // Propegate the events to the client
        const collectedEvents = collectEvents(this, db);
        // Create Db instance
        db.open((err, db) => {
            if (err) {
                return callback(err);
            }
            // Check if we are really speaking to a mongos
            const ismaster = db.serverConfig.lastIsMaster();

            // Do we actually have a mongos
            if (ismaster && ismaster.msg === "isdbgrid") {
                // Destroy the current connection
                db.close();
                // Create mongos connection instead
                return this._createMongos(options, callback);
            }
            if (this.relayEvents) {
                // Fire all the events
                replayEvents(this, collectedEvents);
                // Propegate the events to the client
                relayEvents(this, db);
            }
            // Otherwise callback
            callback(err, db);
        });
    }

    _connect(url, options, callback) {
        options = options || {};
        options = shallowClone(options);

        // If callback is null throw an exception
        if (is.nil(callback)) {
            throw new Error("no callback function provided");
        }

        const object = parse(url, options);
        let _finalOptions = createUnifiedOptions({}, object);
        _finalOptions = mergeOptions(_finalOptions, object, false);
        _finalOptions = createUnifiedOptions(_finalOptions, options);

        // Check if we have connection and socket timeout set
        if (is.nil(_finalOptions.socketTimeoutMS)) {
            _finalOptions.socketTimeoutMS = 360000;
        }
        if (is.nil(_finalOptions.connectTimeoutMS)) {
            _finalOptions.connectTimeoutMS = 30000;
        }

        // Failure modes
        if (object.servers.length === 0) {
            throw new Error("connection string must contain at least one seed host");
        }

        const connectCallback = (err, db) => {
            if (err && err.message === "no mongos proxies found in seed list") {
                // if (logger.isWarn()) {
                // logger.warn(f("seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name"));
                // }

                // Return a more specific error message for MongoClient.connect
                return callback(new MongoError("seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name"));
            }

            // Return the error and db instance
            callback(err, db);
        };

        // Do we have a replicaset then skip discovery and go straight to connectivity
        if (_finalOptions.replicaSet || _finalOptions.rs_name) {
            return this._createReplicaset(_finalOptions, connectHandler(_finalOptions, connectCallback));
        } else if (object.servers.length > 1) {
            return this._createMongos(_finalOptions, connectHandler(_finalOptions, connectCallback));
        }
        return this._createServer(_finalOptions, connectHandler(_finalOptions, connectCallback));

    }

    @classMethod({ callback: true, promise: true })
    connect(url, ...args) {
        const callback = is.function(args[args.length - 1]) ? args.pop() : null;
        let options = args.length ? args.shift() : null;
        options = options || {};

        // Validate options object
        const err = validOptions(options);

        // Get the promiseLibrary
        let promiseLibrary = options.promiseLibrary;

        // No promise library selected fall back
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }
        // Return a promise
        if (!is.function(callback)) {
            return new promiseLibrary((resolve, reject) => {
                // Did we have a validation error
                if (err) {
                    return reject(err);
                }
                // Attempt to connect
                this._connect(url, options, (err, db) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(db);
                });
            });
        }

        // Did we have a validation error
        if (err) {
            return callback(err);
        }
        // Fallback to callback based connect
        this._connect(url, options, callback);
    }

    @staticMethod({ callback: true, promise: true })
    static connect(...args) {
        return new MongoClient({ relayEvents: false }).connect(...args);
    }
}

module.exports = MongoClient;
