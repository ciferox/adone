const { is, EventEmitter, database: { mongo }, std: { crypto } } = adone;
const { __, MongoError, ObjectId, Code, core, ReadPreference } = mongo;
const {
    utils: {
        getSingleProperty,
        shallowClone,
        parseIndexOptions,
        filterOptions,
        toError,
        mergeOptionsAndWriteConcern
    }
} = __;

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
    "readConcern",
    "retryMiliSeconds",
    "numberOfRetries",
    "parentDb",
    "noListener",
    "promoteBuffers",
    "promoteLongs",
    "promoteValues"
];


const convertReadPreference = (readPreference) => {
    if (readPreference && is.string(readPreference)) {
        return new core.ReadPreference(readPreference);
    } else if (readPreference instanceof ReadPreference) {
        return new core.ReadPreference(readPreference.mode, readPreference.tags, {
            maxStalenessSeconds: readPreference.maxStalenessSeconds
        });
    } else if (readPreference && is.object(readPreference)) {
        const mode = readPreference.mode || readPreference.preference;
        if (mode && is.string(mode)) {
            readPreference = new core.ReadPreference(mode, readPreference.tags, {
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
    const matching = `${databaseName}.`;

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
const validateDatabaseName = (databaseName) => {
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
const writeConcern = (target, db, options) => {
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
const createListener = (self, e, object) => {
    const listener = (err) => {
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

export default class Db extends EventEmitter {
    constructor(databaseName, topology, options = {}) {
        super();

        // Filter the options
        options = filterOptions(options, legalOptionNames);

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

    async open() {
        try {
            await this.s.topology.connect(this, this.s.options);
            return this;
        } catch (err) {
            this.close();
            throw err;
        }
    }

    async command(command, options = {}) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
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
            options.readPreference = core.ReadPreference.primary;
        }
        const result = await this.s.topology.command(`${dbName}.$cmd`, command, options);
        return options.full ? result : result.result;
    }

    close(force) {
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
    }

    admin() {
        return new __.Admin(this, this.s.topology);
    }

    async _strictCollection(name, options) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }
        const collections = await this.listCollections({ name }, options).toArray();
        if (collections.length === 0) {
            throw toError(`Collection ${name} does not exist. Currently in strict mode.`);
        }
        return new __.Collection(
            this,
            this.s.topology,
            this.s.databaseName,
            name,
            this.s.pkFactory,
            options
        );
    }

    collection(name, options = {}) {
        // If we have not set a collection level readConcern set the db level one
        options.readConcern = options.readConcern || this.s.readConcern;

        // Do we have ignoreUndefined set
        if (this.s.options.ignoreUndefined) {
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Merge in all needed options and ensure correct writeConcern merging from db level
        options = mergeOptionsAndWriteConcern(options, this.s.options, collectionKeys, true);

        if (!options.strict) {
            return new __.Collection(
                this,
                this.s.topology,
                this.s.databaseName,
                name,
                this.s.pkFactory,
                options
            );
        }
        return this._strictCollection(name, options);
    }

    async createCollection(name, options = {}) {
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }
        const finalOptions = writeConcern(shallowClone(options), this, options);
        const collections = await this.listCollections({ name })
            .setReadPreference(ReadPreference.PRIMARY)
            .toArray();
        if (collections.length > 0 && finalOptions.strict) {
            throw MongoError.create({
                message: `Collection ${name} already exists. Currently in strict mode.`,
                driver: true
            });
        } else if (collections.length > 0) {
            return new __.Collection(
                this,
                this.s.topology,
                this.s.databaseName,
                name,
                this.s.pkFactory,
                options
            );
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
        finalOptions.readPreference = ReadPreference.PRIMARY;
        await this.command(cmd, finalOptions);
        return new __.Collection(
            this,
            this.s.topology,
            this.s.databaseName,
            name,
            this.s.pkFactory,
            options
        );
    }

    async stats(options) {
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
        return this.command(commandObject, options);
    }

    listCollections(filter, options) {
        filter = filter || {};
        options = options || {};

        // Shallow clone the object
        options = shallowClone(options);

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
            options.cursorFactory = __.CommandCursor;
            // Create the cursor
            cursor = this.s.topology.cursor(`${this.s.databaseName}.$cmd`, command, options);
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
                filter.name = `${this.s.databaseName}.${filter.name}`;
            }
        }

        if (is.nil(filter)) {
            filter.name = `/${this.s.databaseName}/`;
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

    async eval(code, parameters, options = {}) {
        let finalCode = code;
        let finalParameters = [];

        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
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
        options.readPreference = new core.ReadPreference(ReadPreference.PRIMARY);

        // Execute the command
        const result = await this.command(cmd, options);

        if (result && result.ok === 1) {
            return result.retval;
        }
        if (result) {
            throw MongoError.create({
                message: `eval failed: ${result.errmsg}`,
                driver: true
            });
        }
    }

    async renameCollection(fromCollection, toCollection, options) {
        return this.collection(fromCollection).rename(toCollection, options);
    }

    async dropCollection(name, options) {
        options = options || {};

        // Command to execute
        const cmd = { drop: name };

        // Decorate with write concern
        decorateWithWriteConcern(cmd, this, options);

        // options
        options = { ...this.s.options, readPreference: ReadPreference.PRIMARY };

        const result = await this.command(cmd, options);

        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }

        return Boolean(result.ok);
    }

    async dropDatabase(options) {
        options = options || {};
        // Drop database command
        const cmd = { dropDatabase: 1 };

        // Decorate with write concern
        decorateWithWriteConcern(cmd, this, options);

        // Ensure primary only
        options = { ...this.s.options, readPreference: ReadPreference.PRIMARY };

        const result = await this.command(cmd, options);

        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }

        return Boolean(result.ok);
    }

    async collections() {
        const documents = await this.listCollections().toArray();
        return documents.filter((x) => !x.name.includes("$")).map((x) => new __.Collection(
            this,
            this.s.topology,
            this.s.databaseName,
            x.name,
            this.s.pkFactory,
            this.s.options
        ));

    }

    async executeDbAdminCommand(selector, options = {}) {
        if (options.readPreference) {
            options.readPreference = convertReadPreference(options.readPreference);
        }
        try {
            const result = await this.s.topology.command("admin.$cmd", selector, options);
            return result.result;
        } catch (err) {
            if (this.serverConfig && this.serverConfig.isDestroyed()) {
                throw new MongoError("topology was destroyed");
            }
            throw err;
        }
    }

    async createIndex(name, fieldOrSpec, options = {}) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }
        const finalOptions = writeConcern({}, this, options, { readPreference: ReadPreference.PRIMARY });
        // Run only against primary
        options.readPreference = ReadPreference.PRIMARY;
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
            const error = new MongoError("server/primary/mongos does not support collation");
            error.code = 67;
            throw error;
        }

        // Create command, apply write concern to command
        const cmd = writeConcern({ createIndexes: name, indexes }, this, options);

        // Decorate command with writeConcern if supported
        decorateWithWriteConcern(cmd, this, options);

        // ReadPreference primary
        options.readPreference = ReadPreference.PRIMARY;

        // Build the command
        try {
            const result = await this.command(cmd, options);
            if (result.ok === 0) {
                throw toError(result);
            }
            return indexName;
        } catch (err) {
            // 67 = 'CannotCreateIndex' (malformed index options)
            // 85 = 'IndexOptionsConflict' (index already exists with different options)
            // 11000 = 'DuplicateKey' (couldn't build unique index because of dupes)
            // 11600 = 'InterruptedAtShutdown' (interrupted at shutdown)
            // These errors mean that the server recognized `createIndex` as a command
            // and so we don't need to fallback to an insert.
            if (err.code === 67 || err.code === 85 || err.code === 11000 || err.code === 11600) {
                throw err;
            }
        }

        const doc = createCreateIndexCommand(this, name, fieldOrSpec, options);
        // Set no key checking
        finalOptions.checkKeys = false;
        // Insert document
        const result = await this.s.topology.insert(`${this.s.databaseName}.${Db.SYSTEM_INDEX_COLLECTION}`, doc, finalOptions);
        if (is.nil(result)) {
            return null;
        }
        if (result.result.writeErrors) {
            throw MongoError.create(result.result.writeErrors[0]);
        }
        return doc.name;
    }

    async ensureIndex(name, fieldOrSpec, options = {}) {
        // Did the user destroy the topology
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }

        const finalOptions = writeConcern({}, this, options);
        const selector = createCreateIndexCommand(this, name, fieldOrSpec, options);
        const indexName = selector.name;

        finalOptions.readPreference = ReadPreference.PRIMARY;

        let indexInformation;
        try {
            indexInformation = await this.indexInformation(name, finalOptions);
        } catch (err) {
            if (err.code !== 26) {
                throw err;
            }
        }

        // If the index does not exist, create it
        if (is.nil(indexInformation) || !indexInformation[indexName]) {
            await this.createIndex(name, fieldOrSpec, options);
        }
        return indexName;
    }

    addChild(db) {
        if (this.s.parentDb) {
            return this.s.parentDb.addChild(db);
        }
        this.s.children.push(db);
    }

    db(dbName, options) {
        options = options || {};

        // Copy the options and add out internal override of the not shared flag
        const finalOptions = { ...this.options, ...options };

        // Do we have the db in the cache already
        if (this.s.dbCache[dbName] && finalOptions.returnNonCachedInstance !== true) {
            return this.s.dbCache[dbName];
        }

        // Add current db as parentDb
        if (is.nil(finalOptions.noListener) || finalOptions.noListener === false) {
            finalOptions.parentDb = this;
        }

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

    async addUser(username, password, options = {}) {
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }
        // Special case where there is no password ($external users)
        if (is.string(username) && is.object(password)) {
            [options, password] = [password, null];
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
        let r;
        try {
            r = await this.command(command, commandOptions);
            if (!r.ok) {
                throw toError(r);
            }
            return [{ user: username, pwd: "" }];
        } catch (err) {
            if (err.ok !== 0 || !is.nil(err.code)) {
                throw err;
            }
        }
        // We need to perform the backward compatible insert operation
        const finalOptions = writeConcern(shallowClone(options), this, options);

        // If we have another db set
        const db = options.dbName ? this.db(options.dbName) : this;

        // Fetch a user collection
        const collection = db.collection(Db.SYSTEM_USER_COLLECTION);

        // Check if we are inserting the first user
        const count = await collection.count();
        await collection.find({ user: username }, { dbName: options.dbName }).toArray();
        // Add command keys
        finalOptions.upsert = true;

        // We have a user, let's update the password or upsert if not
        const err = await collection.update({ user: username }, {
            $set: { user: username, pwd: userPassword }
        }, finalOptions).then(adone.noop, adone.identity);
        if (err && count !== 0) {
            throw err;
        }
        return [{ user: username, pwd: userPassword }];
    }

    async removeUser(username, options = {}) {
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }

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
        try {
            return Boolean((await this.command(command, commandOptions)).ok);
        } catch (err) {
            if (err.ok !== 0 || !is.nil(err.code)) {
                throw err;
            }
        }
        // fallback
        const finalOptions = writeConcern(shallowClone(options), this, options);
        // If we have another db set
        const db = options.dbName ? this.db(options.dbName) : this;

        // Fetch a user collection
        const collection = db.collection(Db.SYSTEM_USER_COLLECTION);

        // Locate the user
        const user = await collection.findOne({ user: username }, {});
        if (!user) {
            return false;
        }
        await collection.remove({ user: username }, finalOptions);
        return true;
    }

    async authenticate(...args) {
        // console.warn("Db.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.");
        return __.authenticate.apply(this, [this, ...args]);
    }

    async logout(options = {}) {
        // Establish the correct database name
        let dbName = this.s.authSource ? this.s.authSource : this.s.databaseName;
        dbName = options.dbName ? options.dbName : dbName;

        return new Promise((resolve, reject) => {
            this.s.topology.logout(dbName, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    async indexInformation(name, options = {}) {
        if (this.serverConfig && this.serverConfig.isDestroyed()) {
            throw new MongoError("topology was destroyed");
        }

        const full = is.nil(options.full) ? false : options.full;

        const indexes = await this.collection(name).listIndexes(options).toArray();

        if (!is.array(indexes)) {
            return [];
        }
        if (full) {
            return indexes;
        }
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
