const { is } = adone;
const EventEmitter = require("events").EventEmitter;
const authenticate = require("./authenticate");
const inherits = require("util").inherits;
const getSingleProperty = require("./utils").getSingleProperty;
const shallowClone = require("./utils").shallowClone;
const parseIndexOptions = require("./utils").parseIndexOptions;
const debugOptions = require("./utils").debugOptions;
const CommandCursor = require("./command_cursor");
const handleCallback = require("./utils").handleCallback;
const filterOptions = require("./utils").filterOptions;
const toError = require("./utils").toError;
const ReadPreference = require("./read_preference");
const f = require("util").format;
const Admin = require("./admin");
const Code = adone.data.bson.Code;
const CoreReadPreference = require("../core").ReadPreference;
const MongoError = require("../core").MongoError;
const ObjectId = adone.data.bson.ObjectId;
const Define = require("./metadata");
const Logger = require("../core").Logger;
const Collection = require("./collection");
const crypto = require("crypto");
const mergeOptionsAndWriteConcern = require("./utils").mergeOptionsAndWriteConcern;
const assign = require("./utils").assign;

const debugFields = [
    "authSource",
    "w",
    "wtimeout",
    "j",
    "native_parser",
    "forceServerObjectId",
    "serializeFunctions",
    "raw",
    "promoteLongs",
    "promoteValues",
    "promoteBuffers",
    "bufferMaxEntries",
    "numberOfRetries",
    "retryMiliSeconds",
    "readPreference",
    "pkFactory",
    "parentDb",
    "promiseLibrary",
    "noListener"
];

// Filter out any write concern options
const illegalCommandFields = [
    "w",
    "wtimeout",
    "j",
    "fsync",
    "autoIndexId",
    "strict",
    "serializeFunctions",
    "pkFactory",
    "raw",
    "readPreference"
];

const legalOptionNames = [
    "w",
    "wtimeout",
    "fsync",
    "j",
    "readPreference",
    "readPreferenceTags",
    "native_parser",
    "forceServerObjectId",
    "pkFactory",
    "serializeFunctions",
    "raw",
    "bufferMaxEntries",
    "authSource",
    "ignoreUndefined",
    "promoteLongs",
    "promiseLibrary",
    "readConcern",
    "retryMiliSeconds",
    "numberOfRetries",
    "parentDb",
    "noListener",
    "promoteBuffers",
    "promoteLongs",
    "promoteValues"
];

const { metadata } = Define;
const { classMethod } = metadata;

const convertReadPreference = (readPreference) => {
    if (readPreference && is.string(readPreference)) {
        return new CoreReadPreference(readPreference);
    } else if (readPreference instanceof ReadPreference) {
        return new CoreReadPreference(readPreference.mode, readPreference.tags, {
            maxStalenessSeconds: readPreference.maxStalenessSeconds
        });
    } else if (readPreference && is.object(readPreference)) {
        const mode = readPreference.mode || readPreference.preference;
        if (mode && is.string(mode)) {
            readPreference = new CoreReadPreference(mode, readPreference.tags, {
                maxStalenessSeconds: readPreference.maxStalenessSeconds
            });
        }
    }
    return readPreference;
};

const collectionKeys = [
    "pkFactory",
    "readPreference",
    "serializeFunctions",
    "strict",
    "readConcern",
    "ignoreUndefined",
    "promoteValues",
    "promoteBuffers",
    "promoteLongs"
];

// Transformation methods for cursor results
const listCollectionsTranforms = function (databaseName) {
    const matching = f("%s.", databaseName);

    return {
        doc(doc) {
            const index = doc.name.indexOf(matching);
            // Remove database name if available
            if (doc.name && index === 0) {
                doc.name = doc.name.substr(index + matching.length);
            }

            return doc;
        }
    };
};

const createCreateIndexCommand = function (db, name, fieldOrSpec, options) {
    const indexParameters = parseIndexOptions(fieldOrSpec);
    const fieldHash = indexParameters.fieldHash;

    // Generate the index name
    const indexName = is.string(options.name) ? options.name : indexParameters.name;
    const selector = {
        ns: `${db.databaseName}.${name}`, key: fieldHash, name: indexName
    };

    // Ensure we have a correct finalUnique
    const finalUnique = is.nil(options) || is.object(options) ? false : options;
    // Set up options
    options = is.nil(options) || is.boolean(options) ? {} : options;

    // Add all the options
    const keysToOmit = Object.keys(selector);
    for (const optionName in options) {
        if (!keysToOmit.includes(optionName)) {
            selector[optionName] = options[optionName];
        }
    }

    if (is.nil(selector.unique)) {
        selector.unique = finalUnique;
    }

    // Remove any write concern operations
    const removeKeys = ["w", "wtimeout", "j", "fsync", "readPreference"];
    for (let i = 0; i < removeKeys.length; i++) {
        delete selector[removeKeys[i]];
    }

    // Return the command creation selector
    return selector;
};

// Validate the database name
const validateDatabaseName = function (databaseName) {
    if (!is.string(databaseName)) {
        throw MongoError.create({ message: "database name must be a string", driver: true });
    }
    if (databaseName.length === 0) {
        throw MongoError.create({ message: "database name cannot be the empty string", driver: true });
    }
    if (databaseName === "$external") {
        return;
    }

    const invalidChars = [" ", ".", "$", "/", "\\"];
    for (let i = 0; i < invalidChars.length; i++) {
        if (databaseName.includes(invalidChars[i])) {
            throw MongoError.create({ message: `database names cannot contain the character '${invalidChars[i]}'`, driver: true });
        }
    }
};

// Get write concern
const writeConcern = function (target, db, options) {
    if (!is.nil(options.w) || !is.nil(options.j) || !is.nil(options.fsync)) {
        const opts = {};
        if (options.w) {
            opts.w = options.w;
        }
        if (options.wtimeout) {
            opts.wtimeout = options.wtimeout;
        }
        if (options.j) {
            opts.j = options.j;
        }
        if (options.fsync) {
            opts.fsync = options.fsync;
        }
        target.writeConcern = opts;
    } else if (!is.nil(db.writeConcern.w) || !is.nil(db.writeConcern.j) || !is.nil(db.writeConcern.fsync)) {
        target.writeConcern = db.writeConcern;
    }

    return target;
};

const decorateWithWriteConcern = (command, self, options) => {
    // Do we support write concerns 3.4 and higher
    if (self.s.topology.capabilities().commandsTakeWriteConcern) {
        // Get the write concern settings
        const finalOptions = writeConcern(shallowClone(options), self, options);
        // Add the write concern to the command
        if (finalOptions.writeConcern) {
            command.writeConcern = finalOptions.writeConcern;
        }
    }
};

// Add listeners to topology
const createListener = function (self, e, object) {
    const listener = function (err) {
        if (object.listeners(e).length > 0) {
            object.emit(e, err, self);

            // Emit on all associated db's if available
            for (let i = 0; i < self.s.children.length; i++) {
                self.s.children[i].emit(e, err, self.s.children[i]);
            }
        }
    };
    return listener;
};

@metadata("Db")
class Db extends EventEmitter {
    constructor(databaseName, topology, options = {}) {
        super();
        let promiseLibrary = options.promiseLibrary;
        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        // Filter the options
        options = filterOptions(options, legalOptionNames);

        // Ensure we put the promiseLib in the options
        options.promiseLibrary = promiseLibrary;

        this.s = {
            databaseName,
            dbCache: {},
            children: [],
            topology,
            options,
            bson: topology ? topology.bson : null,
            authSource: options.authSource,
            readPreference: options.readPreference,
            bufferMaxEntries: is.number(options.bufferMaxEntries) ? options.bufferMaxEntries : -1,
            parentDb: options.parentDb || null,
            pkFactory: options.pkFactory || ObjectId,
            nativeParser: options.nativeParser || options.native_parser,
            promiseLibrary,
            noListener: is.boolean(options.noListener) ? options.noListener : false,
            readConcern: options.readConcern
        };

        // Ensure we have a valid db name
        validateDatabaseName(this.s.databaseName);

        // Add a read Only property
        getSingleProperty(this, "serverConfig", this.s.topology);
        getSingleProperty(this, "bufferMaxEntries", this.s.bufferMaxEntries);
        getSingleProperty(this, "databaseName", this.s.databaseName);

        // This is a child db, do not register any listeners
        if (options.parentDb) {
            return;
        }
        if (this.s.noListener) {
            return;
        }

        // Add listeners
        topology.on("error", createListener(this, "error", this));
        topology.on("timeout", createListener(this, "timeout", this));
        topology.on("close", createListener(this, "close", this));
        topology.on("parseError", createListener(this, "parseError", this));
        topology.once("open", createListener(this, "open", this));
        topology.once("fullsetup", createListener(this, "fullsetup", this));
        topology.once("all", createListener(this, "all", this));
        topology.on("reconnect", createListener(this, "reconnect", this));
    }

    get topology() {
        return this.s.topology;
    }

    get options() {
        return this.s.options;
    }

    get slaveOk() {
        return !is.nil(this.s.options.readPreference) &&
            (this.s.options.readPreference !== "primary" || this.s.options.readPreference.mode !== "primary");
    }

    get writeConcern() {
        const ops = {};
        if (!is.nil(this.s.options.w)) {
            ops.w = this.s.options.w;
        }
        if (!is.nil(this.s.options.j)) {
            ops.j = this.s.options.j;
        }
        if (!is.nil(this.s.options.fsync)) {
            ops.fsync = this.s.options.fsync;
        }
        if (!is.nil(this.s.options.wtimeout)) {
            ops.wtimeout = this.s.options.wtimeout;
        }
        return ops;
    }

    _open(callback) {
        this.s.topology.connect(this, this.s.options, (err) => {
            if (is.nil(callback)) {
                return;
            }
            const internalCallback = callback;

            if (err) {
                this.close();
                return internalCallback(err);
            }

            internalCallback(null, this);
        });
    }

    @classMethod({ callback: true, promise: true })
    open(callback) {
        if (is.function(callback)) {
            return this._open(callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._open((err, db) => {
                if (err) {
                    return reject(err);
                }
                resolve(db);
            });
        });
    }

    _executeCommand(command, options, callback) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }
        // Get the db name we are executing against
        const dbName = options.dbName || options.authdb || this.s.databaseName;

        // If we have a readPreference set
        if (is.nil(options.readPreference) && this.s.readPreference) {
            options.readPreference = this.s.readPreference;
        }

        // Convert the readPreference if its not a write
        if (options.readPreference) {
            options.readPreference = convertReadPreference(options.readPreference);
        } else {
            options.readPreference = CoreReadPreference.primary;
        }
        this.s.topology.command(f("%s.$cmd", dbName), command, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err);
            }
            if (options.full) {
                return handleCallback(callback, null, result);
            }
            handleCallback(callback, null, result.result);
        });
    }

    @classMethod({ callback: true, promise: true })
    command(command, options, callback) {
        // Change the callback
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        // Clone the options
        options = shallowClone(options);

        if (is.function(callback)) {
            return this._executeCommand(command, options, callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._executeCommand(command, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    close(force, callback) {
        if (is.function(force)) {
            [callback, force] = [force, false];
        }
        this.s.topology.close(force);

        if (this.listeners("close").length > 0) {
            this.emit("close");

            // If it's the top level db emit close on all children
            if (is.nil(this.parentDb)) {
                // Fire close on all children
                for (let i = 0; i < this.s.children.length; i++) {
                    this.s.children[i].emit("close");
                }
            }

            // Remove listeners after emit
            this.removeAllListeners("close");
        }

        if (this.s.parentDb) {
            this.s.parentDb.close();
        }
        if (is.function(callback)) {
            return process.nextTick(() => {
                handleCallback(callback, null);
            });
        }

        return new this.s.promiseLibrary((resolve) => {
            resolve();
        });
    }

    @classMethod({ callback: false, promise: false, returns: [Admin] })
    admin() {
        return new Admin(this, this.s.topology, this.s.promiseLibrary);
    }

    @classMethod({ callback: true, promise: false, returns: [Collection] })
    collection(name, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};
        options = shallowClone(options);
        // Set the promise library
        options.promiseLibrary = this.s.promiseLibrary;

        // If we have not set a collection level readConcern set the db level one
        options.readConcern = options.readConcern || this.s.readConcern;

        // Do we have ignoreUndefined set
        if (this.s.options.ignoreUndefined) {
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Merge in all needed options and ensure correct writeConcern merging from db level
        options = mergeOptionsAndWriteConcern(options, this.s.options, collectionKeys, true);

        if (is.nil(options) || !options.strict) {
            try {
                const collection = new Collection(this, this.s.topology, this.s.databaseName, name, this.s.pkFactory, options);
                if (callback) {
                    callback(null, collection);
                }
                return collection;
            } catch (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
        }

        // Strict mode
        if (!is.function(callback)) {
            throw toError(f("A callback is required in strict mode. While getting collection %s.", name));
        }

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }

        // Strict mode
        this.listCollections({ name }, options).toArray((err, collections) => {
            if (!is.nil(err)) {
                return handleCallback(callback, err, null);
            }
            if (collections.length === 0) {
                return handleCallback(callback, toError(f("Collection %s does not exist. Currently in strict mode.", name)), null);
            }

            try {
                return handleCallback(
                    callback,
                    null,
                    new Collection(
                        this,
                        this.s.topology,
                        this.s.databaseName,
                        name,
                        this.s.pkFactory,
                        options
                    )
                );
            } catch (err) {
                return handleCallback(callback, err, null);
            }
        });
    }

    _createCollection(name, options, callback) {
        const finalOptions = writeConcern(shallowClone(options), this, options);

        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }

        this.listCollections({ name })
            .setReadPreference(ReadPreference.PRIMARY)
            .toArray((err, collections) => {
                if (!is.nil(err)) {
                    return handleCallback(callback, err, null);
                }
                if (collections.length > 0 && finalOptions.strict) {
                    return handleCallback(callback, MongoError.create({ message: f("Collection %s already exists. Currently in strict mode.", name), driver: true }), null);
                } else if (collections.length > 0) {
                    try {
                        return handleCallback(
                            callback,
                            null,
                            new Collection(
                                this,
                                this.s.topology,
                                this.s.databaseName,
                                name,
                                this.s.pkFactory,
                                options
                            )
                        );
                    } catch (err) {
                        return handleCallback(callback, err);
                    }
                }

                // Create collection command
                const cmd = { create: name };

                // Decorate command with writeConcern if supported
                decorateWithWriteConcern(cmd, this, options);
                // Add all optional parameters
                for (const n in options) {
                    if (!is.nil(options[n]) && !is.function(options[n]) && !illegalCommandFields.includes(n)) {
                        cmd[n] = options[n];
                    }
                }

                // Force a primary read Preference
                finalOptions.readPreference = ReadPreference.PRIMARY;

                // Execute command
                this.command(cmd, finalOptions, (err) => {
                    if (err) {
                        return handleCallback(callback, err);
                    }
                    handleCallback(
                        callback,
                        null,
                        new Collection(
                            this,
                            this.s.topology,
                            this.s.databaseName,
                            name,
                            this.s.pkFactory,
                            options
                        )
                    );
                });
            });
    }

    @classMethod({ callback: true, promise: true })
    createCollection(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let name = args.length ? args.shift() : null;
        const options = args.length ? args.shift() || {} : {};

        options.promiseLibrary = options.promiseLibrary || this.s.promiseLibrary;

        if (is.string(callback)) {
            name = callback;
        }

        // Execute the fallback callback
        if (is.function(callback)) {
            return this._createCollection(name, options, callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._createCollection(name, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    stats(options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};
        // Build command object
        const commandObject = { dbStats: true };
        // Check if we have the scale value
        if (!is.nil(options.scale)) {
            commandObject.scale = options.scale;
        }

        // If we have a readPreference set
        if (is.nil(options.readPreference) && this.s.readPreference) {
            options.readPreference = this.s.readPreference;
        }

        // Execute the command
        return this.command(commandObject, options, callback);
    }

    @classMethod({ callback: false, promise: false, returns: [CommandCursor] })
    listCollections(filter, options) {
        filter = filter || {};
        options = options || {};

        // Shallow clone the object
        options = shallowClone(options);
        // Set the promise library
        options.promiseLibrary = this.s.promiseLibrary;

        // Ensure valid readPreference
        if (options.readPreference) {
            options.readPreference = convertReadPreference(options.readPreference);
        }

        // We have a list collections command
        if (this.serverConfig.capabilities().hasListCollectionsCommand) {
            let cursor = options.batchSize ? { batchSize: options.batchSize } : {};
            // Build the command
            const command = { listCollections: true, filter, cursor };
            // Set the AggregationCursor constructor
            options.cursorFactory = CommandCursor;
            // Create the cursor
            cursor = this.s.topology.cursor(f("%s.$cmd", this.s.databaseName), command, options);
            // Do we have a readPreference, apply it
            if (options.readPreference) {
                cursor.setReadPreference(options.readPreference);
            }
            // Return the cursor
            return cursor;
        }

        // We cannot use the listCollectionsCommand
        if (!this.serverConfig.capabilities().hasListCollectionsCommand) {
            // If we have legacy mode and have not provided a full db name filter it
            if (is.string(filter.name) && !(new RegExp(`^${this.databaseName}\\.`).test(filter.name))) {
                filter = shallowClone(filter);
                filter.name = f("%s.%s", this.s.databaseName, filter.name);
            }
        }

        if (is.nil(filter)) {
            filter.name = f("/%s/", this.s.databaseName);
        }

        // Rewrite the filter to use $and to filter out indexes
        if (filter.name) {
            filter = { $and: [{ name: filter.name }, { name: /^((?!\$).)*$/ }] };
        } else {
            filter = { name: /^((?!\$).)*$/ };
        }

        // Return options
        const _options = { transforms: listCollectionsTranforms(this.s.databaseName) };
        // Get the cursor
        let cursor = this.collection(Db.SYSTEM_NAMESPACE_COLLECTION).find(filter, _options);
        // Do we have a readPreference, apply it
        if (options.readPreference) {
            cursor.setReadPreference(options.readPreference);
        }
        // Set the passed in batch size if one was provided
        if (options.batchSize) {
            cursor = cursor.batchSize(options.batchSize);
        }
        // We have a fallback mode using legacy systems collections
        return cursor;
    }

    _evaluate(code, parameters, options, callback) {
        let finalCode = code;
        let finalParameters = [];

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }

        // If not a code object translate to one
        if (!(finalCode && finalCode._bsontype === "Code")) {
            finalCode = new Code(finalCode);
        }
        // Ensure the parameters are correct
        if (!is.nil(parameters) && !is.array(parameters) && !is.function(parameters)) {
            finalParameters = [parameters];
        } else if (!is.nil(parameters) && is.array(parameters) && !is.function(parameters)) {
            finalParameters = parameters;
        }

        // Create execution selector
        const cmd = { $eval: finalCode, args: finalParameters };
        // Check if the nolock parameter is passed in
        if (options.nolock) {
            cmd.nolock = options.nolock;
        }

        // Set primary read preference
        options.readPreference = new CoreReadPreference(ReadPreference.PRIMARY);

        // Execute the command
        this.command(cmd, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err, null);
            }
            if (result && result.ok === 1) {
                return handleCallback(callback, null, result.retval);
            }
            if (result) {
                return handleCallback(callback, MongoError.create({ message: f("eval failed: %s", result.errmsg), driver: true }), null);
            }
            handleCallback(callback, err, result);
        });
    }

    @classMethod({ callback: true, promise: true })
    eval(code, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const parameters = args.length ? args.shift() : [];
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._evaluate(code, parameters, options, callback);
        }
        // Execute the command
        return new this.s.promiseLibrary((resolve, reject) => {
            this._evaluate(code, parameters, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    renameCollection(fromCollection, toCollection, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};
        // Add return new collection
        options.new_collection = true;

        if (is.function(callback)) {
            return this.collection(fromCollection).rename(toCollection, options, callback);
        }

        // Return a promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this.collection(fromCollection).rename(toCollection, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    dropCollection(name, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};

        // Command to execute
        const cmd = { drop: name };

        // Decorate with write concern
        decorateWithWriteConcern(cmd, this, options);

        // options
        options = assign({}, this.s.options, { readPreference: ReadPreference.PRIMARY });

        if (is.function(callback)) {
            return this.command(cmd, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return callback(new MongoError("topology was destroyed"));
                }
                if (err) {
                    return handleCallback(callback, err);
                }
                if (result.ok) {
                    return handleCallback(callback, null, true);
                }
                handleCallback(callback, null, false);
            });
        }

        // Clone the options
        options = shallowClone(this.s.options);
        // Set readPreference PRIMARY
        options.readPreference = ReadPreference.PRIMARY;

        return new this.s.promiseLibrary((resolve, reject) => {
            this.command(cmd, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return reject(new MongoError("topology was destroyed"));
                }
                if (err) {
                    return reject(err);
                }
                if (result.ok) {
                    return resolve(true);
                }
                resolve(false);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    dropDatabase(options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};
        // Drop database command
        const cmd = { dropDatabase: 1 };

        // Decorate with write concern
        decorateWithWriteConcern(cmd, this, options);

        // Ensure primary only
        options = assign({}, this.s.options, { readPreference: ReadPreference.PRIMARY });

        if (is.function(callback)) {
            return this.command(cmd, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return callback(new MongoError("topology was destroyed"));
                }
                if (is.nil(callback)) {
                    return;
                }
                if (err) {
                    return handleCallback(callback, err, null);
                }
                handleCallback(callback, null, result.ok ? true : false);
            });
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.command(cmd, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return reject(new MongoError("topology was destroyed"));
                }
                if (err) {
                    return reject(err);
                }
                if (result.ok) {
                    return resolve(true);
                }
                resolve(false);
            });
        });
    }

    _collections(callback) {
        // Let's get the collection names
        this.listCollections().toArray((err, documents) => {
            if (!is.nil(err)) {
                return handleCallback(callback, err, null);
            }
            // Filter collections removing any illegal ones
            documents = documents.filter((doc) => {
                return !doc.name.includes("$");
            });

            // Return the collection objects
            handleCallback(callback, null, documents.map((d) => {
                return new Collection(
                    this,
                    this.s.topology,
                    this.s.databaseName,
                    d.name,
                    this.s.pkFactory,
                    this.s.options
                );
            }));
        });
    }

    @classMethod({ callback: true, promise: true })
    collections(callback) {
        if (is.function(callback)) {
            return this._collections(callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._collections((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    executeDbAdminCommand(selector, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};

        if (is.function(callback)) {
            // Convert read preference
            if (options.readPreference) {
                options.readPreference = convertReadPreference(options.readPreference);
            }

            return this.s.topology.command("admin.$cmd", selector, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return callback(new MongoError("topology was destroyed"));
                }
                if (err) {
                    return handleCallback(callback, err);
                }
                handleCallback(callback, null, result.result);
            });
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.topology.command("admin.$cmd", selector, options, (err, result) => {
                // Did the user destroy the topology
                if (this.serverConfig && this.serverConfig.isDestroyed()) {
                    return reject(new MongoError("topology was destroyed"));
                }
                if (err) {
                    return reject(err);
                }
                resolve(result.result);
            });
        });
    }

    _createIndexUsingCreateIndexes(name, fieldOrSpec, options, callback) {
        // Build the index
        const indexParameters = parseIndexOptions(fieldOrSpec);
        // Generate the index name
        const indexName = is.string(options.name) ? options.name : indexParameters.name;
        // Set up the index
        const indexes = [{ name: indexName, key: indexParameters.fieldHash }];
        // merge all the options
        const keysToOmit = Object.keys(indexes[0]);
        for (const optionName in options) {
            if (!keysToOmit.includes(optionName)) {
                indexes[0][optionName] = options[optionName];
            }

            // Remove any write concern operations
            const removeKeys = ["w", "wtimeout", "j", "fsync", "readPreference"];
            for (let i = 0; i < removeKeys.length; i++) {
                delete indexes[0][removeKeys[i]];
            }
        }

        // Get capabilities
        const capabilities = this.s.topology.capabilities();

        // Did the user pass in a collation, check if our write server supports it
        if (indexes[0].collation && capabilities && !capabilities.commandsTakeCollation) {
            // Create a new error
            const error = new MongoError(f("server/primary/mongos does not support collation"));
            error.code = 67;
            // Return the error
            return callback(error);
        }

        // Create command, apply write concern to command
        const cmd = writeConcern({ createIndexes: name, indexes }, this, options);

        // Decorate command with writeConcern if supported
        decorateWithWriteConcern(cmd, this, options);

        // ReadPreference primary
        options.readPreference = ReadPreference.PRIMARY;

        // Build the command
        this.command(cmd, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err, null);
            }
            if (result.ok === 0) {
                return handleCallback(callback, toError(result), null);
            }
            // Return the indexName for backward compatibility
            handleCallback(callback, null, indexName);
        });
    }

    _createIndex(name, fieldOrSpec, options, callback) {
        // Get the write concern options
        const finalOptions = writeConcern({}, this, options, { readPreference: ReadPreference.PRIMARY });
        // Ensure we have a callback
        if (finalOptions.writeConcern && !is.function(callback)) {
            throw MongoError.create({ message: "Cannot use a writeConcern without a provided callback", driver: true });
        }

        // Run only against primary
        options.readPreference = ReadPreference.PRIMARY;

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }

        this._createIndexUsingCreateIndexes(name, fieldOrSpec, options, (err, result) => {
            if (is.nil(err)) {
                return handleCallback(callback, err, result);
            }

            // 67 = 'CannotCreateIndex' (malformed index options)
            // 85 = 'IndexOptionsConflict' (index already exists with different options)
            // 11000 = 'DuplicateKey' (couldn't build unique index because of dupes)
            // 11600 = 'InterruptedAtShutdown' (interrupted at shutdown)
            // These errors mean that the server recognized `createIndex` as a command
            // and so we don't need to fallback to an insert.
            if (err.code === 67 || err.code === 11000 || err.code === 85 || err.code === 11600) {
                return handleCallback(callback, err, result);
            }
            // Create command
            const doc = createCreateIndexCommand(this, name, fieldOrSpec, options);
            // Set no key checking
            finalOptions.checkKeys = false;
            // Insert document
            this.s.topology.insert(f("%s.%s", this.s.databaseName, Db.SYSTEM_INDEX_COLLECTION), doc, finalOptions, (err, result) => {
                if (is.nil(callback)) {
                    return;
                }
                if (err) {
                    return handleCallback(callback, err);
                }
                if (is.nil(result)) {
                    return handleCallback(callback, null, null);
                }
                if (result.result.writeErrors) {
                    return handleCallback(callback, MongoError.create(result.result.writeErrors[0]), null);
                }
                handleCallback(callback, null, doc.name);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    createIndex(name, fieldOrSpec, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() || {} : {};
        options = shallowClone(options);

        if (is.function(callback)) {
            return this._createIndex(name, fieldOrSpec, options, callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._createIndex(name, fieldOrSpec, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _ensureIndex(name, fieldOrSpec, options, callback) {
        // Get the write concern options
        const finalOptions = writeConcern({}, this, options);
        // Create command
        const selector = createCreateIndexCommand(this, name, fieldOrSpec, options);
        const indexName = selector.name;

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }

        // Merge primary readPreference
        finalOptions.readPreference = ReadPreference.PRIMARY;

        // Check if the index allready exists
        this.indexInformation(name, finalOptions, (err, indexInformation) => {
            if (!is.nil(err) && err.code !== 26) {
                return handleCallback(callback, err, null);
            }
            // If the index does not exist, create it
            if (is.nil(indexInformation) || !indexInformation[indexName]) {
                this.createIndex(name, fieldOrSpec, options, callback);
            } else {
                if (is.function(callback)) {
                    return handleCallback(callback, null, indexName);
                }
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    ensureIndex(name, fieldOrSpec, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};

        if (is.function(callback)) {
            return this._ensureIndex(name, fieldOrSpec, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._ensureIndex(name, fieldOrSpec, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    addChild(db) {
        if (this.s.parentDb) {
            return this.s.parentDb.addChild(db);
        }
        this.s.children.push(db);
    }

    @classMethod({ callback: false, promise: false, fluent: true }) // fluent?
    db(dbName, options) {
        options = options || {};

        // Copy the options and add out internal override of the not shared flag
        const finalOptions = assign({}, this.options, options);

        // Do we have the db in the cache already
        if (this.s.dbCache[dbName] && finalOptions.returnNonCachedInstance !== true) {
            return this.s.dbCache[dbName];
        }

        // Add current db as parentDb
        if (is.nil(finalOptions.noListener) || finalOptions.noListener === false) {
            finalOptions.parentDb = this;
        }

        // Add promiseLibrary
        finalOptions.promiseLibrary = this.s.promiseLibrary;

        // Return the db object
        const db = new Db(dbName, this.s.topology, finalOptions);

        // Add as child
        if (is.nil(finalOptions.noListener) || finalOptions.noListener === false) {
            this.addChild(db);
        }

        // Add the db to the cache
        this.s.dbCache[dbName] = db;
        // Return the database
        return db;
    }

    _executeAuthCreateUserCommand(username, password, options, callback) {
        // Special case where there is no password ($external users)
        if (is.string(username) && is.object(password)) {
            [options, password] = [password, null];
        }

        if (is.function(options)) {
            [callback, options] = [options, {}];
        }

        // Error out if we digestPassword set
        if (!is.nil(options.digestPassword)) {
            throw toError("The digestPassword option is not supported via add_user. Please use db.command('createUser', ...) instead for this option.");
        }

        // Get additional values
        const customData = !is.nil(options.customData) ? options.customData : {};
        let roles = is.array(options.roles) ? options.roles : [];
        const maxTimeMS = is.number(options.maxTimeMS) ? options.maxTimeMS : null;

        // If not roles defined print deprecated message
        if (roles.length === 0) {
            // console.log("Creating a user without roles is deprecated in MongoDB >= 2.6");
        }

        // Get the error options
        const commandOptions = { writeCommand: true };
        if (options.dbName) {
            commandOptions.dbName = options.dbName;
        }

        // Add maxTimeMS to options if set
        if (!is.nil(maxTimeMS)) {
            commandOptions.maxTimeMS = maxTimeMS;
        }

        // Check the db name and add roles if needed
        if ((this.databaseName.toLowerCase() === "admin" || options.dbName === "admin") && !is.array(options.roles)) {
            roles = ["root"];
        } else if (!is.array(options.roles)) {
            roles = ["dbOwner"];
        }

        // Build the command to execute
        let command = {
            createUser: username,
            customData,
            roles,
            digestPassword: false
        };

        // Apply write concern to command
        command = writeConcern(command, this, options);

        // Use node md5 generator
        const md5 = crypto.createHash("md5");
        // Generate keys used for authentication
        md5.update(`${username}:mongo:${password}`);
        const userPassword = md5.digest("hex");

        // No password
        if (is.string(password)) {
            command.pwd = userPassword;
        }

        // Force write using primary
        commandOptions.readPreference = ReadPreference.primary;

        // Execute the command
        this.command(command, commandOptions, (err, result) => {
            if (err && err.ok === 0 && is.nil(err.code)) {
                return handleCallback(callback, { code: -5000 }, null);
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            handleCallback(
                callback,
                !result.ok ? toError(result) : null,
                result.ok ? [{ user: username, pwd: "" }] : null
            );
        });
    }

    _addUser(username, password, options, callback) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }
        // Attempt to execute auth command
        this._executeAuthCreateUserCommand(username, password, options, (err, r) => {
            // We need to perform the backward compatible insert operation
            if (err && err.code === -5000) {
                const finalOptions = writeConcern(shallowClone(options), this, options);
                // Use node md5 generator
                const md5 = crypto.createHash("md5");
                // Generate keys used for authentication
                md5.update(`${username}:mongo:${password}`);
                const userPassword = md5.digest("hex");

                // If we have another db set
                const db = options.dbName ? this.db(options.dbName) : this;

                // Fetch a user collection
                const collection = db.collection(Db.SYSTEM_USER_COLLECTION);

                // Check if we are inserting the first user
                collection.count({}, (err, count) => {
                    // We got an error (f.ex not authorized)
                    if (!is.nil(err)) {
                        return handleCallback(callback, err, null);
                    }
                    // Check if the user exists and update i
                    collection.find({ user: username }, { dbName: options.dbName }).toArray((err) => {
                        // We got an error (f.ex not authorized)
                        if (!is.nil(err)) {
                            return handleCallback(callback, err, null);
                        }
                        // Add command keys
                        finalOptions.upsert = true;

                        // We have a user, let's update the password or upsert if not
                        collection.update({ user: username }, {
                            $set: { user: username, pwd: userPassword }
                        }, finalOptions, (err) => {
                            if (count === 0 && err) {
                                return handleCallback(callback, null, [{ user: username, pwd: userPassword }]);
                            }
                            if (err) {
                                return handleCallback(callback, err, null);
                            }
                            handleCallback(callback, null, [{ user: username, pwd: userPassword }]);
                        });
                    });
                });

                return;
            }

            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, err, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    addUser(username, password, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._addUser(username, password, options, callback);
        }

        // Return a promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._addUser(username, password, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _executeAuthRemoveUserCommand(username, options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }
        // Get the error options
        const commandOptions = { writeCommand: true };
        if (options.dbName) {
            commandOptions.dbName = options.dbName;
        }

        // Get additional values
        const maxTimeMS = is.number(options.maxTimeMS) ? options.maxTimeMS : null;

        // Add maxTimeMS to options if set
        if (!is.nil(maxTimeMS)) {
            commandOptions.maxTimeMS = maxTimeMS;
        }

        // Build the command to execute
        let command = {
            dropUser: username
        };

        // Apply write concern to command
        command = writeConcern(command, this, options);

        // Force write using primary
        commandOptions.readPreference = ReadPreference.primary;

        // Execute the command
        this.command(command, commandOptions, (err, result) => {
            if (err && !err.ok && is.nil(err.code)) {
                return handleCallback(callback, { code: -5000 });
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            handleCallback(callback, null, result.ok ? true : false);
        });
    }

    _removeUser(username, options, callback) {
        this._executeAuthRemoveUserCommand(username, options, (err, result) => {
            if (err && err.code === -5000) {
                const finalOptions = writeConcern(shallowClone(options), this, options);
                // If we have another db set
                const db = options.dbName ? this.db(options.dbName) : this;

                // Fetch a user collection
                const collection = db.collection(Db.SYSTEM_USER_COLLECTION);

                // Locate the user
                collection.findOne({ user: username }, {}, (err, user) => {
                    if (is.nil(user)) {
                        return handleCallback(callback, err, false);
                    }
                    collection.remove({ user: username }, finalOptions, (err) => {
                        handleCallback(callback, err, true);
                    });
                });

                return;
            }

            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, err, result);
        });
    }

    @classMethod({ callback: true, promise: true })
    removeUser(username, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._removeUser(username, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._removeUser(username, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    authenticate(...args) {
        // console.warn("Db.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.");
        return authenticate.apply(this, [this, ...args]);
    }

    @classMethod({ callback: true, promise: true })
    logout(options, callback) {
        if (is.function(options)) {
            [callback, options] = [options, {}];
        }
        options = options || {};

        // Establish the correct database name
        let dbName = this.s.authSource ? this.s.authSource : this.s.databaseName;
        dbName = options.dbName ? options.dbName : dbName;

        // If we have a callback
        if (is.function(callback)) {
            return this.s.topology.logout(dbName, (err) => {
                if (err) {
                    return callback(err);
                }
                callback(null, true);
            });
        }

        // Return a promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.topology.logout(dbName, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    _indexInformation(name, options, callback) {
        const full = is.nil(options.full) ? false : options.full;

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            return callback(new MongoError("topology was destroyed"));
        }
        // Process all the results from the index command and collection
        const processResults = function (indexes) {
            // Contains all the information
            const info = {};
            // Process all the indexes
            for (let i = 0; i < indexes.length; i++) {
                const index = indexes[i];
                // Let's unpack the object
                info[index.name] = [];
                for (const name in index.key) {
                    info[index.name].push([name, index.key[name]]);
                }
            }

            return info;
        };

        // Get the list of indexes of the specified collection
        this.collection(name).listIndexes(options).toArray((err, indexes) => {
            if (err) {
                return callback(toError(err));
            }
            if (!is.array(indexes)) {
                return handleCallback(callback, null, []);
            }
            if (full) {
                return handleCallback(callback, null, indexes);
            }
            handleCallback(callback, null, processResults(indexes));
        });
    }

    @classMethod({ callback: true, promise: true })
    indexInformation(name, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        if (is.function(callback)) {
            return this._indexInformation(name, options, callback);
        }

        // Return a promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._indexInformation(name, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    unref() {
        this.s.topology.unref();
    }
}


Db.SYSTEM_NAMESPACE_COLLECTION = "system.namespaces";
Db.SYSTEM_INDEX_COLLECTION = "system.indexes";
Db.SYSTEM_PROFILE_COLLECTION = "system.profile";
Db.SYSTEM_USER_COLLECTION = "system.users";
Db.SYSTEM_COMMAND_COLLECTION = "$cmd";
Db.SYSTEM_JS_COLLECTION = "system.js";

module.exports = Db;
