const {
    is,
    database: { mongo },
    event: { EventEmitter }
} = adone;
const {
    ReadPreference,
    MongoError
} = mongo;
const __ = adone.private(mongo);
const {
    utils: { shallowClone }
} = __;

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
    "validateOptions",
    "appname",
    "auth"
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
            return new MongoError(`option ${name} is not supported`);
        } else if (!_validOptions.includes(name)) {
            adone.warn(`the options [${name}] is not supported`);
        }

        if (legacyOptionNames.includes(name)) {
            // adone.warn(f("the server/replset/mongos options are deprecated, all their options are supported at the top level of the options object [%s]", validOptionNames));
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
            ? new __.Server(serverObj.domain_socket, 27017, options)
            : new __.Server(serverObj.host, serverObj.port, options);
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

const auth = async (options, db) => {
    if (!options.auth) {
        return;
    }

    // What db to authenticate against
    let authenticationDb = db;
    if (options.authSource) {
        authenticationDb = db.db(options.authSource);
    }

    // Authenticate
    const ok = await __.authenticate(authenticationDb, options.user, options.password, options);
    if (ok) {
        return;
    }
    db.close();
    throw new Error(`Could not authenticate user ${options.auth[0]}`);
};

export default class MongoClient extends EventEmitter {
    constructor({ relayEvents = true } = {}) {
        super();
        this.relayEvents = relayEvents;
    }

    async _createReplicaset(options) {
        // Set default options
        const servers = translateOptions(options);
        // Create Db instance
        const db = new __.Db(options.dbName, new __.ReplSet(servers, options), options);
        if (this.relayEvents) {
            // Propegate the events to the client
            relayEvents(this, db);
        }
        // Open the connection
        await db.open();
        await auth(options, db);
        return db;
    }

    async _createMongos(options) {
        // Set default options
        const servers = translateOptions(options);
        // Create Db instance
        const db = new __.Db(options.dbName, new __.Mongos(servers, options), options);
        if (this.relayEvents) {
            // Propegate the events to the client
            relayEvents(this, db);
        }
        // Open the connection
        await db.open();
        await auth(options, db);
        return db;
    }

    async _createServer(options) {
        // Set default options
        const servers = translateOptions(options);
        // Create db instance
        const db = new __.Db(options.dbName, servers[0], options);
        // Propegate the events to the client
        const collectedEvents = collectEvents(this, db);
        // Create Db instance
        await db.open();
        // Check if we are really speaking to a mongos
        const ismaster = db.serverConfig.lastIsMaster();

        // Do we actually have a mongos
        if (ismaster && ismaster.msg === "isdbgrid") {
            // Destroy the current connection
            db.close();
            // Create mongos connection instead
            return this._createMongos(options);
        }
        if (this.relayEvents) {
            // Fire all the events
            replayEvents(this, collectedEvents);
            // Propegate the events to the client
            relayEvents(this, db);
        }
        await auth(options, db);
        return db;
    }

    async connect(url, options = {}) {
        const err = validOptions(options);
        if (err) {
            throw err;
        }
        options = options || {};
        options = shallowClone(options);

        const object = __.parseUrl(url, options);
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

        if (_finalOptions.db_options && _finalOptions.db_options.auth) {
            delete _finalOptions.db_options.auth;
        }

        // Failure modes
        if (object.servers.length === 0) {
            throw new Error("connection string must contain at least one seed host");
        }

        // Do we have a replicaset then skip discovery and go straight to connectivity
        if (_finalOptions.replicaSet || _finalOptions.rs_name) {
            return this._createReplicaset(_finalOptions);
        } else if (object.servers.length > 1) {
            return this._createMongos(_finalOptions);
        }
        return this._createServer(_finalOptions);
    }
}
