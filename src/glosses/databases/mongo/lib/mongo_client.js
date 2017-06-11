

const parse = require("./url_parser");
const Server = require("./server");
const Mongos = require("./mongos");
const ReplSet = require("./replset");
const Define = require("./metadata");
const ReadPreference = require("./read_preference");
const Logger = require("../core").Logger;
const MongoError = require("../core").MongoError;
const Db = require("./db");
const f = require("util").format;
const shallowClone = require("./utils").shallowClone;
const EventEmitter = require("events").EventEmitter;
const assign = require("./utils").assign;
const inherits = require("util").inherits;
const authenticate = require("./authenticate");

/**
 * @fileOverview The **MongoClient** class is a class that allows for making Connections to MongoDB.
 *
 * @example
 * var MongoClient = require('mongodb').MongoClient,
 *   test = require('assert');
 * // Connection url
 * var url = 'mongodb://localhost:27017/test';
 * // Connect using MongoClient
 * MongoClient.connect(url, function(err, db) {
 *   // Get an additional db
 *   db.close();
 * });
 */
const validOptionNames = ["poolSize", "ssl", "sslValidate", "sslCA", "sslCert",
    "sslKey", "sslPass", "sslCRL", "autoReconnect", "noDelay", "keepAlive", "connectTimeoutMS", "family",
    "socketTimeoutMS", "reconnectTries", "reconnectInterval", "ha", "haInterval",
    "replicaSet", "secondaryAcceptableLatencyMS", "acceptableLatencyMS",
    "connectWithNoPrimary", "authSource", "w", "wtimeout", "j", "forceServerObjectID",
    "serializeFunctions", "ignoreUndefined", "raw", "promoteLongs", "bufferMaxEntries",
    "readPreference", "pkFactory", "promiseLibrary", "readConcern", "maxStalenessSeconds",
    "promoteValues", "promoteBuffers", "promoteLongs",
    "domainsEnabled", "keepAliveInitialDelay", "checkServerIdentity", "validateOptions"];
const ignoreOptionNames = ["native_parser"];
const legacyOptionNames = ["server", "replset", "replSet", "mongos", "db"];

function validOptions(options) {
    const _validOptions = validOptionNames.concat(legacyOptionNames);

    for (const name in options) {
        if (ignoreOptionNames.indexOf(name) != -1) {
            continue;
        }

        if (_validOptions.indexOf(name) == -1 && options.validateOptions) {
            return new MongoError(f("option %s is not supported", name));
        } else if (_validOptions.indexOf(name) == -1) {
            console.warn(f("the options [%s] is not supported", name));
        }

        if (legacyOptionNames.indexOf(name) != -1) {
            console.warn(f("the server/replset/mongos options are deprecated, "
                + "all their options are supported at the top level of the options object [%s]", validOptionNames));
        }
    }
}


/**
 * Creates a new MongoClient instance
 * @class
 * @return {MongoClient} a MongoClient instance.
 */
function MongoClient() {
    if (!(this instanceof MongoClient)) {
        return new MongoClient();
    }

    // Set up event emitter
    EventEmitter.call(this);
    /**
     * The callback format for results
     * @callback MongoClient~connectCallback
     * @param {MongoError} error An error instance representing the error during the execution.
     * @param {Db} db The connected database.
     */

    /**
     * Connect to MongoDB using a url as documented at
     *
     *  docs.mongodb.org/manual/reference/connection-string/
     *
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver
     *
     * @method
     * @param {string} url The connection URI string
     * @param {object} [options] Optional settings.
     * @param {number} [options.poolSize=5] poolSize The maximum size of the individual server pool.
     * @param {boolean} [options.ssl=false] Enable SSL connection.
     * @param {Buffer} [options.sslCA=undefined] SSL Certificate store binary buffer
     * @param {Buffer} [options.sslCRL=undefined] SSL Certificate revocation list binary buffer
     * @param {Buffer} [options.sslCert=undefined] SSL Certificate binary buffer
     * @param {Buffer} [options.sslKey=undefined] SSL Key file binary buffer
     * @param {string} [options.sslPass=undefined] SSL Certificate pass phrase
     * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
     * @param {boolean} [options.autoReconnect=true] Enable autoReconnect for single server instances
     * @param {boolean} [options.noDelay=true] TCP Connection no delay
     * @param {boolean} [options.keepAlive=0] The number of milliseconds to wait before initiating keepAlive on the TCP socket.
     * @param {number} [options.connectTimeoutMS=30000] TCP Connection timeout setting
     * @param {number} [options.socketTimeoutMS=30000] TCP Socket timeout setting
     * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
     * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
     * @param {boolean} [options.ha=true] Control if high availability monitoring runs for Replicaset or Mongos proxies.
     * @param {number} [options.haInterval=10000] The High availability period for replicaset inquiry
     * @param {string} [options.replicaSet=undefined] The Replicaset set name
     * @param {number} [options.secondaryAcceptableLatencyMS=15] Cutoff latency point in MS for Replicaset member selection
     * @param {number} [options.acceptableLatencyMS=15] Cutoff latency point in MS for Mongos proxies selection.
     * @param {boolean} [options.connectWithNoPrimary=false] Sets if the driver should connect even if no primary is available
     * @param {string} [options.authSource=undefined] Define the database to authenticate against
     * @param {(number|string)} [options.w=null] The write concern.
     * @param {number} [options.wtimeout=null] The write concern timeout.
     * @param {boolean} [options.j=false] Specify a journal write concern.
     * @param {boolean} [options.forceServerObjectID=false] Force server to assign _id values instead of driver.
     * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
     * @param {Boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
     * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
     * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
     * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
     * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
     * @param {number} [options.bufferMaxEntries=-1] Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
     * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
     * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
     * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
     * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
     * @param {object} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
     * @param {number} [options.maxStalenessSeconds=undefined] The max staleness to secondary reads (values under 10 seconds cannot be guaranteed);
     * @param {object} [options.validateOptions=false] Validate MongoClient passed in options for correctness.
     * @param {MongoClient~connectCallback} [callback] The command result callback
     * @return {Promise} returns Promise if no callback passed
     */
    this.connect = MongoClient.connect;
}

inherits(MongoClient, EventEmitter);

const define = MongoClient.define = new Define("MongoClient", MongoClient, false);

/**
 * Connect to MongoDB using a url as documented at
 *
 *  docs.mongodb.org/manual/reference/connection-string/
 *
 * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver
 *
 * @method
 * @static
 * @param {string} url The connection URI string
 * @param {object} [options] Optional settings.
 * @param {number} [options.poolSize=5] poolSize The maximum size of the individual server pool.
 * @param {boolean} [options.ssl=false] Enable SSL connection.
 * @param {Buffer} [options.sslCA=undefined] SSL Certificate store binary buffer
 * @param {Buffer} [options.sslCRL=undefined] SSL Certificate revocation list binary buffer
 * @param {Buffer} [options.sslCert=undefined] SSL Certificate binary buffer
 * @param {Buffer} [options.sslKey=undefined] SSL Key file binary buffer
 * @param {string} [options.sslPass=undefined] SSL Certificate pass phrase
 * @param {boolean|function} [options.checkServerIdentity=true] Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
 * @param {boolean} [options.autoReconnect=true] Enable autoReconnect for single server instances
 * @param {boolean} [options.noDelay=true] TCP Connection no delay
 * @param {boolean} [options.keepAlive=0] The number of milliseconds to wait before initiating keepAlive on the TCP socket.
 * @param {number} [options.connectTimeoutMS=30000] TCP Connection timeout setting
 * @param {number} [options.socketTimeoutMS=30000] TCP Socket timeout setting
 * @param {number} [options.reconnectTries=30] Server attempt to reconnect #times
 * @param {number} [options.reconnectInterval=1000] Server will wait # milliseconds between retries
 * @param {boolean} [options.ha=true] Control if high availability monitoring runs for Replicaset or Mongos proxies.
 * @param {number} [options.haInterval=10000] The High availability period for replicaset inquiry
 * @param {string} [options.replicaSet=undefined] The Replicaset set name
 * @param {number} [options.secondaryAcceptableLatencyMS=15] Cutoff latency point in MS for Replicaset member selection
 * @param {number} [options.acceptableLatencyMS=15] Cutoff latency point in MS for Mongos proxies selection.
 * @param {boolean} [options.connectWithNoPrimary=false] Sets if the driver should connect even if no primary is available
 * @param {string} [options.authSource=undefined] Define the database to authenticate against
 * @param {(number|string)} [options.w=null] The write concern.
 * @param {number} [options.wtimeout=null] The write concern timeout.
 * @param {boolean} [options.j=false] Specify a journal write concern.
 * @param {boolean} [options.forceServerObjectID=false] Force server to assign _id values instead of driver.
 * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
 * @param {Boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
 * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
 * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
 * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
 * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
 * @param {number} [options.bufferMaxEntries=-1] Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
 * @param {(ReadPreference|string)} [options.readPreference=null] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
 * @param {boolean} [options.domainsEnabled=false] Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit.
 * @param {object} [options.pkFactory=null] A primary key factory object for generation of custom _id keys.
 * @param {object} [options.promiseLibrary=null] A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
 * @param {object} [options.readConcern=null] Specify a read concern for the collection. (only MongoDB 3.2 or higher supported)
 * @param {object} [options.readConcern.level='local'] Specify a read concern level for the collection operations, one of [local|majority]. (only MongoDB 3.2 or higher supported)
 * @param {number} [options.maxStalenessSeconds=undefined] The max staleness to secondary reads (values under 10 seconds cannot be guaranteed);
 * @param {object} [options.validateOptions=false] Validate MongoClient passed in options for correctness.
 * @param {MongoClient~connectCallback} [callback] The command result callback
 * @return {Promise} returns Promise if no callback passed
 */
MongoClient.connect = function (url, options, callback) {
    const args = Array.prototype.slice.call(arguments, 1);
    callback = typeof args[args.length - 1] === "function" ? args.pop() : null;
    options = args.length ? args.shift() : null;
    options = options || {};
    const self = this;

    // Validate options object
    const err = validOptions(options);

    // Get the promiseLibrary
    let promiseLibrary = options.promiseLibrary;

    // No promise library selected fall back
    if (!promiseLibrary) {
        promiseLibrary = typeof global.Promise === "function" ?
            global.Promise : require("es6-promise").Promise;
    }

    // Return a promise
    if (typeof callback !== "function") {
        return new promiseLibrary((resolve, reject) => {
            // Did we have a validation error
            if (err) {
                return reject(err);
            }
            // Attempt to connect
            connect(self, url, options, (err, db) => {
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
    connect(self, url, options, callback);
};

define.staticMethod("connect", { callback: true, promise: true });

const mergeOptions = function (target, source, flatten) {
    for (const name in source) {
        if (source[name] && typeof source[name] === "object" && flatten) {
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
    const noMerge = ["readconcern"];

    for (const name in options) {
        if (noMerge.indexOf(name.toLowerCase()) != -1) {
            finalOptions[name] = options[name];
        } else if (childOptions.indexOf(name.toLowerCase()) != -1) {
            finalOptions = mergeOptions(finalOptions, options[name], false);
        } else {
            if (options[name] && typeof options[name] === "object" && !Buffer.isBuffer(options[name]) && !Array.isArray(options[name])) {
                finalOptions = mergeOptions(finalOptions, options[name], true);
            } else {
                finalOptions[name] = options[name];
            }
        }
    }

    return finalOptions;
};

function translateOptions(options) {
    // If we have a readPreference passed in by the db options
    if (typeof options.readPreference === "string" || typeof options.read_preference === "string") {
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
    if (options.socketTimeoutMS == null) {
        options.socketTimeoutMS = 360000;
    }
    if (options.connectTimeoutMS == null) {
        options.connectTimeoutMS = 30000;
    }

    // Create server instances
    return options.servers.map((serverObj) => {
        return serverObj.domain_socket ?
            new Server(serverObj.domain_socket, 27017, options)
            : new Server(serverObj.host, serverObj.port, options);
    });
}

//
// Collect all events in order from SDAM
//
function collectEvents(self, db) {
    const collectedEvents = [];

    if (self instanceof MongoClient) {
        const events = ["timeout", "close", "serverOpening", "serverDescriptionChanged", "serverHeartbeatStarted",
            "serverHeartbeatSucceeded", "serverHeartbeatFailed", "serverClosed", "topologyOpening",
            "topologyClosed", "topologyDescriptionChanged", "joined", "left", "ping", "ha", "all", "fullsetup"];
        events.forEach((event) => {
            db.serverConfig.on(event, (object1, object2) => {
                collectedEvents.push({
                    event, object1, object2
                });
            });
        });
    }

    return collectedEvents;
}

//
// Replay any events due to single server connection switching to Mongos
//
function replayEvents(self, events) {
    for (let i = 0; i < events.length; i++) {
        self.emit(events[i].event, events[i].object1, events[i].object2);
    }
}

function relayEvents(self, db) {
    if (self instanceof MongoClient) {
        const events = ["timeout", "close", "serverOpening", "serverDescriptionChanged", "serverHeartbeatStarted",
            "serverHeartbeatSucceeded", "serverHeartbeatFailed", "serverClosed", "topologyOpening",
            "topologyClosed", "topologyDescriptionChanged", "joined", "left", "ping", "ha", "all", "fullsetup"];
        events.forEach((event) => {
            db.serverConfig.on(event, (object1, object2) => {
                self.emit(event, object1, object2);
            });
        });
    }
}

function createReplicaset(self, options, callback) {
    // Set default options
    const servers = translateOptions(options);
    // Create Db instance
    const db = new Db(options.dbName, new ReplSet(servers, options), options);
    // Propegate the events to the client
    relayEvents(self, db);
    // Open the connection
    db.open(callback);
}

function createMongos(self, options, callback) {
    // Set default options
    const servers = translateOptions(options);
    // Create Db instance
    const db = new Db(options.dbName, new Mongos(servers, options), options);
    // Propegate the events to the client
    relayEvents(self, db);
    // Open the connection
    db.open(callback);
}

function createServer(self, options, callback) {
    // Set default options
    const servers = translateOptions(options);
    // Create db instance
    const db = new Db(options.dbName, servers[0], options);
    // Propegate the events to the client
    const collectedEvents = collectEvents(self, db);
    // Create Db instance
    db.open((err, db) => {
        if (err) {
            return callback(err);
        }
        // Check if we are really speaking to a mongos
        const ismaster = db.serverConfig.lastIsMaster();

        // Do we actually have a mongos
        if (ismaster && ismaster.msg == "isdbgrid") {
            // Destroy the current connection
            db.close();
            // Create mongos connection instead
            return createMongos(self, options, callback);
        }

        // Fire all the events
        replayEvents(self, collectedEvents);
        // Propegate the events to the client
        relayEvents(self, db);
        // Otherwise callback
        callback(err, db);
    });
}

function connectHandler(options, callback) {
    return function (err, db) {
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
        let authentication_db = db;
        if (options.authSource) {
            authentication_db = db.db(options.authSource);
        }

        // Authenticate
        authenticate(authentication_db, options.user, options.password, options, (err, success) => {
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
}

/*
 * Connect using MongoClient
 */
const connect = function (self, url, options, callback) {
    options = options || {};
    options = shallowClone(options);

    // If callback is null throw an exception
    if (callback == null) {
        throw new Error("no callback function provided");
    }

    // Get a logger for MongoClient
    // const logger = Logger("MongoClient", options);

    // Parse the string
    const object = parse(url, options);
    let _finalOptions = createUnifiedOptions({}, object);
    _finalOptions = mergeOptions(_finalOptions, object, false);
    _finalOptions = createUnifiedOptions(_finalOptions, options);

    // Check if we have connection and socket timeout set
    if (_finalOptions.socketTimeoutMS == null) {
        _finalOptions.socketTimeoutMS = 360000;
    }
    if (_finalOptions.connectTimeoutMS == null) {
        _finalOptions.connectTimeoutMS = 30000;
    }

    // Failure modes
    if (object.servers.length == 0) {
        throw new Error("connection string must contain at least one seed host");
    }

    function connectCallback(err, db) {
        if (err && err.message == "no mongos proxies found in seed list") {
            // if (logger.isWarn()) {
                // logger.warn(f("seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name"));
            // }

            // Return a more specific error message for MongoClient.connect
            return callback(new MongoError("seed list contains no mongos proxies, replicaset connections requires the parameter replicaSet to be supplied in the URI or options object, mongodb://server:port/db?replicaSet=name"));
        }

        // Return the error and db instance
        callback(err, db);
    }

    // Do we have a replicaset then skip discovery and go straight to connectivity
    if (_finalOptions.replicaSet || _finalOptions.rs_name) {
        return createReplicaset(self, _finalOptions, connectHandler(_finalOptions, connectCallback));
    } else if (object.servers.length > 1) {
        return createMongos(self, _finalOptions, connectHandler(_finalOptions, connectCallback));
    }
    return createServer(self, _finalOptions, connectHandler(_finalOptions, connectCallback));

};

module.exports = MongoClient;
