const { is, database: { mongo } } = adone;
const { __, ObjectId, Long, Code, MongoError, core, ReadPreference } = mongo;
const {
    bulk,
    metadata,
    utils: {
        checkCollectionName,
        shallowClone,
        isObject,
        toError,
        normalizeHintField,
        handleCallback,
        decorateCommand,
        formattedOrderClause,
        assign
    }
} = __;
const { classMethod } = metadata;

const mergeKeys = ["readPreference", "ignoreUndefined"];

// Get write concern
const writeConcern = function (target, db, col, options) {
    if (!is.nil(options.w) || !is.nil(options.j) || !is.nil(options.fsync)) {
        const opts = {};
        if (!is.nil(options.w)) {
            opts.w = options.w;
        }
        if (!is.nil(options.wtimeout)) {
            opts.wtimeout = options.wtimeout;
        }
        if (!is.nil(options.j)) {
            opts.j = options.j;
        }
        if (!is.nil(options.fsync)) {
            opts.fsync = options.fsync;
        }
        target.writeConcern = opts;
    } else if (!is.nil(col.writeConcern.w) || !is.nil(col.writeConcern.j) || !is.nil(col.writeConcern.fsync)) {
        target.writeConcern = col.writeConcern;
    } else if (!is.nil(db.writeConcern.w) || !is.nil(db.writeConcern.j) || !is.nil(db.writeConcern.fsync)) {
        target.writeConcern = db.writeConcern;
    }

    return target;
};

// Figure out the read preference
const getReadPreference = function (self, options, db) {
    let r = null;
    if (options.readPreference) {
        r = options.readPreference;
    } else if (self.s.readPreference) {
        r = self.s.readPreference;
    } else if (db.s.readPreference) {
        r = db.s.readPreference;
    }

    if (r instanceof ReadPreference) {
        options.readPreference = new core.ReadPreference(r.mode, r.tags, {
            maxStalenessSeconds: r.maxStalenessSeconds
        });
    } else if (is.string(r)) {
        options.readPreference = new core.ReadPreference(r);
    } else if (r && !(r instanceof ReadPreference) && is.object(r)) {
        const mode = r.mode || r.preference;
        if (mode && is.string(mode)) {
            options.readPreference = new core.ReadPreference(mode, r.tags, {
                maxStalenessSeconds: r.maxStalenessSeconds
            });
        }
    }

    return options;
};

const mapInserManyResults = function (docs, r) {
    const ids = r.getInsertedIds();
    const keys = Object.keys(ids);
    const finalIds = new Array(keys.length);

    for (let i = 0; i < keys.length; i++) {
        if (ids[keys[i]]._id) {
            finalIds[ids[keys[i]].index] = ids[keys[i]]._id;
        }
    }

    const finalResult = {
        result: { ok: 1, n: r.insertedCount },
        ops: docs,
        insertedCount: r.insertedCount,
        insertedIds: finalIds
    };

    if (r.getLastOp()) {
        finalResult.result.opTime = r.getLastOp();
    }

    return finalResult;
};

const testForFields = {
    limit: 1,
    sort: 1,
    fields: 1,
    skip: 1,
    hint: 1,
    explain: 1,
    snapshot: 1,
    timeout: 1,
    tailable: 1,
    tailableRetryInterval: 1,
    numberOfRetries: 1,
    awaitdata: 1,
    awaitData: 1,
    exhaust: 1,
    batchSize: 1,
    returnKey: 1,
    maxScan: 1,
    min: 1,
    max: 1,
    showDiskLoc: 1,
    comment: 1,
    raw: 1,
    readPreference: 1,
    partial: 1,
    read: 1,
    dbName: 1,
    oplogReplay: 1,
    connection: 1,
    maxTimeMS: 1,
    transforms: 1,
    collation: 1
};

const decorateWithWriteConcern = (command, self, options) => {
    // Do we support collation 3.4 and higher
    const capabilities = self.s.topology.capabilities();
    // Do we support write concerns 3.4 and higher
    if (capabilities && capabilities.commandsTakeWriteConcern) {
        // Get the write concern settings
        const finalOptions = writeConcern(shallowClone(options), self.s.db, self, options);
        // Add the write concern to the command
        if (finalOptions.writeConcern) {
            command.writeConcern = finalOptions.writeConcern;
        }
    }
};

const decorateWithCollation = (command, self, options) => {
    // Do we support collation 3.4 and higher
    const capabilities = self.s.topology.capabilities();
    // Do we support write concerns 3.4 and higher
    if (capabilities && capabilities.commandsTakeCollation) {
        if (options.collation && is.object(options.collation)) {
            command.collation = options.collation;
        }
    }
};

const groupFunction = "function () {\nvar c = db[ns].find(condition);\nvar map = new Map();\nvar reduce_function = reduce;\n\nwhile (c.hasNext()) {\nvar obj = c.next();\nvar key = {};\n\nfor (var i = 0, len = keys.length; i < len; ++i) {\nvar k = keys[i];\nkey[k] = obj[k];\n}\n\nvar aggObj = map.get(key);\n\nif (aggObj == null) {\nvar newObj = Object.extend({}, key);\naggObj = Object.extend(newObj, initial);\nmap.put(key, aggObj);\n}\n\nreduce_function(obj, aggObj);\n}\n\nreturn { \"result\": map.values() };\n}";

const processScope = (scope) => {
    if (!isObject(scope) || scope._bsontype === "ObjectId") {
        return scope;
    }

    const keys = Object.keys(scope);
    let i = keys.length;
    let key;
    const newScope = {};

    while (i--) {
        key = keys[i];
        if (is.function(scope[key])) {
            newScope[key] = new Code(String(scope[key]));
        } else {
            newScope[key] = processScope(scope[key]);
        }
    }

    return newScope;
};

@metadata("Collection")
export default class Collection {
    constructor(db, topology, dbName, name, pkFactory, options) {
        checkCollectionName(name);
        const internalHint = null;
        const slaveOk = is.nil(options) || is.nil(options.slaveOk)
            ? db.slaveOk
            : options.slaveOk;
        const serializeFunctions = is.nil(options) || is.nil(options.serializeFunctions)
            ? db.s.options.serializeFunctions
            : options.serializeFunctions;
        const raw = is.nil(options) || is.nil(options.raw)
            ? db.s.options.raw
            : options.raw;
        const promoteLongs = is.nil(options) || is.nil(options.promoteLongs)
            ? db.s.options.promoteLongs
            : options.promoteLongs;
        const promoteValues = is.nil(options) || is.nil(options.promoteValues)
            ? db.s.options.promoteValues
            : options.promoteValues;
        const promoteBuffers = is.nil(options) || is.nil(options.promoteBuffers)
            ? db.s.options.promoteBuffers
            : options.promoteBuffers;
        let readPreference = null;
        const collectionHint = null;
        const namespace = `${dbName}.${name}`;

        let promiseLibrary = options.promiseLibrary;

        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        if (options && options.readPreference) {
            readPreference = options.readPreference;
        } else if (db.options.readPreference) {
            readPreference = db.options.readPreference;
        }

        pkFactory = is.nil(pkFactory) ? ObjectId : pkFactory;

        this.s = {
            pkFactory,
            db,
            topology,
            dbName,
            options,
            namespace,
            readPreference,
            slaveOk,
            serializeFunctions,
            raw,
            promoteLongs,
            promoteValues,
            promoteBuffers,
            internalHint,
            collectionHint,
            name,
            promiseLibrary,
            readConcern: options.readConcern
        };
    }

    get collectionName() {
        return this.s.name;
    }

    get namespace() {
        return this.s.namespace;
    }

    get readConcern() {
        return this.s.readConcern || { level: "local" };
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

    get hint() {
        return this.s.collectionHint;
    }

    set hint(v) {
        this.s.collectionHint = normalizeHintField(v);
    }

    @classMethod({ callback: false, promise: false, returns: [__.Cursor] })
    find(...args) {
        let options;
        const hasCallback = is.function(args[args.length - 1]);
        const hasWeirdCallback = is.function(args[0]);
        const callback = hasCallback ? args.pop() : (hasWeirdCallback ? args.shift() : null);
        const len = args.length;
        let selector = len >= 1 ? args[0] : {};
        let fields = len >= 2 ? args[1] : undefined;

        if (len === 1 && hasWeirdCallback) {
            // backwards compat for callback?, options case
            selector = {};
            options = args[0];
        }

        if (len === 2 && !is.undefined(fields) && !is.array(fields)) {
            const fieldKeys = Object.keys(fields);
            let isOption = false;

            for (let i = 0; i < fieldKeys.length; i++) {
                if (!is.nil(testForFields[fieldKeys[i]])) {
                    isOption = true;
                    break;
                }
            }

            if (isOption) {
                options = fields;
                fields = undefined;
            } else {
                options = {};
            }
        } else if (len === 2 && is.array(fields) && !is.array(fields[0])) {
            const newFields = {};
            // Rewrite the array
            for (let i = 0; i < fields.length; i++) {
                newFields[fields[i]] = 1;
            }
            // Set the fields
            fields = newFields;
        }

        if (len === 3) {
            options = args[2];
        }

        selector = is.nil(selector) ? {} : selector;

        let object = selector;
        if (is.buffer(object)) {
            const objectSize = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;
            if (objectSize !== object.length) {
                const error = new Error(`query selector raw message size does not match message header size [${object.length}] != [${objectSize}]`);
                error.name = "MongoError";
                throw error;
            }
        }

        // Validate correctness of the field selector
        object = fields;
        if (is.buffer(object)) {
            const objectSize = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;
            if (objectSize !== object.length) {
                const error = new Error(`query fields raw message size does not match message header size [${object.length}] != [${objectSize}]`);
                error.name = "MongoError";
                throw error;
            }
        }

        if (!is.nil(selector) && selector._bsontype === "ObjectId") {
            selector = { _id: selector };
        }

        // If it's a serialized fields field we need to just let it through
        // user be warned it better be good
        if (options && options.fields && !(is.buffer(options.fields))) {
            fields = {};

            if (is.array(options.fields)) {
                if (!options.fields.length) {
                    fields._id = 1;
                } else {
                    const l = options.fields.length;
                    for (let i = 0; i < l; i++) {
                        fields[options.fields[i]] = 1;
                    }
                }
            } else {
                fields = options.fields;
            }
        }

        if (!options) {
            options = {};
        }

        let newOptions = {};

        // Make a shallow copy of the collection options
        for (const key in this.s.options) {
            if (mergeKeys.includes(key)) {
                newOptions[key] = this.s.options[key];
            }
        }


        // Make a shallow copy of options
        for (const key in options) {
            newOptions[key] = options[key];
        }

        // Unpack options
        newOptions.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
        newOptions.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
        newOptions.raw = !is.nil(options.raw) && is.boolean(options.raw) ? options.raw : this.s.raw;
        newOptions.hint = !is.nil(options.hint) ? normalizeHintField(options.hint) : this.s.collectionHint;
        newOptions.timeout = len === 5 ? args[4] : is.undefined(options.timeout) ? undefined : options.timeout;
        // If we have overridden slaveOk otherwise use the default db setting
        newOptions.slaveOk = !is.nil(options.slaveOk) ? options.slaveOk : this.s.db.slaveOk;

        // Add read preference if needed
        newOptions = getReadPreference(this, newOptions, this.s.db, this);

        // Set slave ok to true if read preference different from primary
        if (
            !is.nil(newOptions.readPreference) &&
            (newOptions.readPreference !== "primary" || newOptions.readPreference.mode !== "primary")
        ) {
            newOptions.slaveOk = true;
        }

        // Ensure the query is an object
        if (!is.nil(selector) && !is.object(selector)) {
            throw MongoError.create({ message: "query selector must be an object", driver: true });
        }

        // Build the find command
        const findCommand = {
            find: this.s.namespace,
            limit: newOptions.limit,
            skip: newOptions.skip,
            query: selector
        };

        // Ensure we use the right await data option
        if (is.boolean(newOptions.awaitdata)) {
            newOptions.awaitData = newOptions.awaitdata;
        }

        // Translate to new command option noCursorTimeout
        if (is.boolean(newOptions.timeout)) {
            newOptions.noCursorTimeout = newOptions.timeout;
        }

        // Merge in options to command
        for (const name in newOptions) {
            if (!is.nil(newOptions[name])) {
                findCommand[name] = newOptions[name];
            }
        }

        // Format the fields
        const formatFields = function (fields) {
            let object = {};
            if (is.array(fields)) {
                for (let i = 0; i < fields.length; i++) {
                    if (is.array(fields[i])) {
                        object[fields[i][0]] = fields[i][1];
                    } else {
                        object[fields[i][0]] = 1;
                    }
                }
            } else {
                object = fields;
            }

            return object;
        };

        // Special treatment for the fields selector
        if (fields) {
            findCommand.fields = formatFields(fields);
        }

        // Add db object to the new options
        newOptions.db = this.s.db;

        // Add the promise library
        newOptions.promiseLibrary = this.s.promiseLibrary;

        // Set raw if available at collection level
        if (is.nil(newOptions.raw) && is.boolean(this.s.raw)) {
            newOptions.raw = this.s.raw;
        }
        // Set promoteLongs if available at collection level
        if (is.nil(newOptions.promoteLongs) && is.boolean(this.s.promoteLongs)) {
            newOptions.promoteLongs = this.s.promoteLongs;
        }
        if (is.nil(newOptions.promoteValues) && is.boolean(this.s.promoteValues)) {
            newOptions.promoteValues = this.s.promoteValues;
        }
        if (is.nil(newOptions.promoteBuffers) && is.boolean(this.s.promoteBuffers)) {
            newOptions.promoteBuffers = this.s.promoteBuffers;
        }

        // Sort options
        if (findCommand.sort) {
            findCommand.sort = formattedOrderClause(findCommand.sort);
        }

        // Set the readConcern
        if (this.s.readConcern) {
            findCommand.readConcern = this.s.readConcern;
        }

        // Decorate find command with collation options
        decorateWithCollation(findCommand, this, options);
        // Create the cursor
        if (is.function(callback)) {
            return handleCallback(callback, null, this.s.topology.cursor(this.s.namespace, findCommand, newOptions));
        }
        return this.s.topology.cursor(this.s.namespace, findCommand, newOptions);
    }

    _insertDocuments(docs, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};
        // Ensure we are operating on an array op docs
        docs = is.array(docs) ? docs : [docs];

        // Get the write concern options
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);
        if (!is.boolean(finalOptions.checkKeys)) {
            finalOptions.checkKeys = true;
        }

        // If keep going set unordered
        if (finalOptions.keepGoing === true) {
            finalOptions.ordered = false;
        }
        finalOptions.serializeFunctions = options.serializeFunctions || this.s.serializeFunctions;

        // Set up the force server object id

        const forceServerObjectId = is.boolean(options.forceServerObjectId)
            ? options.forceServerObjectId : this.s.db.options.forceServerObjectId;

        // Add _id if not specified
        if (forceServerObjectId !== true) {
            for (let i = 0; i < docs.length; i++) {
                if (is.nil(docs[i]._id)) {
                    docs[i]._id = this.s.pkFactory.createPk();
                }
            }
        }
        // File inserts
        this.s.topology.insert(this.s.namespace, docs, finalOptions, (err, result) => {
            if (is.nil(callback)) {
                return;
            }
            if (err) {
                return handleCallback(callback, err);
            }
            if (is.nil(result)) {
                return handleCallback(callback, null, null);
            }
            if (result.result.code) {
                return handleCallback(callback, toError(result.result));
            }
            if (result.result.writeErrors) {
                return handleCallback(callback, toError(result.result.writeErrors[0]));
            }
            // Add docs to the list
            result.ops = docs;
            // Return the results
            handleCallback(callback, null, result);
        });
    }

    _insertOne(doc, options, callback) {
        this._insertDocuments([doc], options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            // Workaround for pre 2.6 servers
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }
            // Add values to top level to ensure crud spec compatibility
            r.insertedCount = r.result.n;
            r.insertedId = doc._id;
            if (callback) {
                callback(null, r);
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    insertOne(doc, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};
        if (is.array(doc) && is.function(callback)) {
            return callback(MongoError.create({ message: "doc parameter must be an object", driver: true }));
        } else if (is.array(doc)) {
            return new this.s.promiseLibrary((resolve, reject) => {
                reject(MongoError.create({ message: "doc parameter must be an object", driver: true }));
            });
        }

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._insertOne(doc, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._insertOne(doc, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _bulkWrite(operations, options, callback) {
        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Create the bulk operation
        const bulk = options.ordered === true || is.nil(options.ordered)
            ? this.initializeOrderedBulkOp(options)
            : this.initializeUnorderedBulkOp(options);

        // Do we have a collation
        let collation = false;

        // for each op go through and add to the bulk
        try {
            for (let i = 0; i < operations.length; i++) {
                // Get the operation type
                const key = Object.keys(operations[i])[0];
                // Check if we have a collation
                if (operations[i][key].collation) {
                    collation = true;
                }

                // Pass to the raw bulk
                bulk.raw(operations[i]);
            }
        } catch (err) {
            return callback(err, null);
        }

        // Final options for write concern
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);
        const writeCon = finalOptions.writeConcern ? finalOptions.writeConcern : {};
        const capabilities = this.s.topology.capabilities();

        // Did the user pass in a collation, check if our write server supports it
        if (collation && capabilities && !capabilities.commandsTakeCollation) {
            return callback(new MongoError("server/primary/mongos does not support collation"));
        }

        // Execute the bulk
        bulk.execute(writeCon, (err, r) => {
            // We have connection level error
            if (!r && err) {
                return callback(err, null);
            }
            // We have single error
            if (r && r.hasWriteErrors() && r.getWriteErrorCount() === 1) {
                return callback(toError(r.getWriteErrorAt(0)), r);
            }

            r.insertedCount = r.nInserted;
            r.matchedCount = r.nMatched;
            r.modifiedCount = r.nModified || 0;
            r.deletedCount = r.nRemoved;
            r.upsertedCount = r.getUpsertedIds().length;
            r.upsertedIds = {};
            r.insertedIds = {};

            // Update the n
            r.n = r.insertedCount;

            // Inserted documents
            const inserted = r.getInsertedIds();
            // Map inserted ids
            for (let i = 0; i < inserted.length; i++) {
                r.insertedIds[inserted[i].index] = inserted[i]._id;
            }

            // Upserted documents
            const upserted = r.getUpsertedIds();
            // Map upserted ids
            for (let i = 0; i < upserted.length; i++) {
                r.upsertedIds[upserted[i].index] = upserted[i]._id;
            }

            // Check if we have write errors
            if (r.hasWriteErrors()) {
                // Get all the errors
                const errors = r.getWriteErrors();
                // Return the MongoError object
                return callback(toError({
                    message: "write operation failed",
                    code: errors[0].code, writeErrors: errors
                }), r);
            }

            // Check if we have a writeConcern error
            if (r.getWriteConcernError()) {
                // Return the MongoError object
                return callback(toError(r.getWriteConcernError()), r);
            }

            // Return the results
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    insertMany(docs, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options ? shallowClone(options) : { ordered: true };
        if (!is.array(docs) && is.function(callback)) {
            return callback(MongoError.create({ message: "docs parameter must be an array of documents", driver: true }));
        } else if (!is.array(docs)) {
            return new this.s.promiseLibrary((resolve, reject) => {
                reject(MongoError.create({ message: "docs parameter must be an array of documents", driver: true }));
            });
        }

        if (!is.boolean(options.checkKeys)) {
            options.checkKeys = true;
        }

        // If keep going set unordered
        options.serializeFunctions = options.serializeFunctions || this.s.serializeFunctions;

        // Set up the force server object id
        const forceServerObjectId = is.boolean(options.forceServerObjectId)
            ? options.forceServerObjectId
            : this.s.db.options.forceServerObjectId;

        // Do we want to force the server to assign the _id key
        if (forceServerObjectId !== true) {
            // Add _id if not specified
            for (let i = 0; i < docs.length; i++) {
                if (is.undefined(docs[i]._id)) {
                    docs[i]._id = this.s.pkFactory.createPk();
                }
            }
        }

        // Generate the bulk write operations
        const operations = [{
            insertMany: docs
        }];

        // Execute using callback
        if (is.function(callback)) {
            return this._bulkWrite(operations, options, (err, r) => {
                if (err) {
                    return callback(err, r);
                }
                callback(null, mapInserManyResults(docs, r));
            });
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._bulkWrite(operations, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(mapInserManyResults(docs, r));
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    bulkWrite(operations, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || { ordered: true };

        if (!is.array(operations)) {
            throw MongoError.create({ message: "operations must be an array of documents", driver: true });
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._bulkWrite(operations, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._bulkWrite(operations, options, (err, r) => {
                if (err && is.nil(r)) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    insert(docs, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || { ordered: false };
        docs = !is.array(docs) ? [docs] : docs;

        if (options.keepGoing === true) {
            options.ordered = false;
        }

        return this.insertMany(docs, options, callback);
    }

    _updateDocuments(selector, document, options, callback) {
        if (is.function(options)) {
            callback = options, options = null;
        }
        if (is.nil(options)) {
            options = {};
        }
        if (!(is.function(callback))) {
            callback = null;
        }

        // If we are not providing a selector or document throw
        if (is.nil(selector) || !is.object(selector)) {
            return callback(toError("selector must be a valid JavaScript object"));
        }
        if (is.nil(document) || !is.object(document)) {
            return callback(toError("document must be a valid JavaScript object"));
        }

        // Get the write concern options
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);

        // Do we return the actual result document
        // Either use override on the function, or go back to default on either the collection
        // level or db
        finalOptions.serializeFunctions = options.serializeFunctions || this.s.serializeFunctions;

        // Execute the operation
        const op = { q: selector, u: document };
        op.upsert = is.boolean(options.upsert) ? options.upsert : false;
        op.multi = is.boolean(options.multi) ? options.multi : false;

        // Have we specified collation
        decorateWithCollation(finalOptions, this, options);

        // Update options
        this.s.topology.update(this.s.namespace, [op], finalOptions, (err, result) => {
            if (is.nil(callback)) {
                return;
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            if (is.nil(result)) {
                return handleCallback(callback, null, null);
            }
            if (result.result.code) {
                return handleCallback(callback, toError(result.result));
            }
            if (result.result.writeErrors) {
                return handleCallback(callback, toError(result.result.writeErrors[0]));
            }
            // Return the results
            handleCallback(callback, null, result);
        });
    }

    _updateOne(filter, update, options, callback) {
        // Set single document update
        options.multi = false;
        // Execute update
        this._updateDocuments(filter, update, options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }
            r.modifiedCount = !is.nil(r.result.nModified) ? r.result.nModified : r.result.n;
            r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
            r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
            r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    updateOne(filter, update, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._updateOne(filter, update, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._updateOne(filter, update, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _replaceOne(filter, doc, options, callback) {
        // Set single document update
        options.multi = false;

        // Execute update
        this._updateDocuments(filter, doc, options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }

            r.modifiedCount = !is.nil(r.result.nModified) ? r.result.nModified : r.result.n;
            r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
            r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
            r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
            r.ops = [doc];
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    replaceOne(filter, doc, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._replaceOne(filter, doc, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._replaceOne(filter, doc, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _updateMany(filter, update, options, callback) {
        // Set single document update
        options.multi = true;
        // Execute update
        this._updateDocuments(filter, update, options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }
            r.modifiedCount = !is.nil(r.result.nModified) ? r.result.nModified : r.result.n;
            r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
            r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
            r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    updateMany(filter, update, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._updateMany(filter, update, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._updateMany(filter, update, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    update(selector, document, options, callback) {
        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._updateDocuments(selector, document, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._updateDocuments(selector, document, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _removeDocuments(selector, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        } else if (is.function(selector)) {
            callback = selector;
            options = {};
            selector = {};
        }

        // Create an empty options object if the provided one is null
        options = options || {};

        // Get the write concern options
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);

        // If selector is null set empty
        if (is.nil(selector)) {
            selector = {};
        }

        // Build the op
        const op = { q: selector, limit: 0 };
        if (options.single) {
            op.limit = 1;
        }

        // Have we specified collation
        decorateWithCollation(finalOptions, this, options);

        // Execute the remove
        this.s.topology.remove(this.s.namespace, [op], finalOptions, (err, result) => {
            if (is.nil(callback)) {
                return;
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            if (is.nil(result)) {
                return handleCallback(callback, null, null);
            }
            if (result.result.code) {
                return handleCallback(callback, toError(result.result));
            }
            if (result.result.writeErrors) {
                return handleCallback(callback, toError(result.result.writeErrors[0]));
            }
            // Return the results
            handleCallback(callback, null, result);
        });
    }

    _deleteOne(filter, options, callback) {
        options.single = true;
        this._removeDocuments(filter, options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }
            r.deletedCount = r.result.n;
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    deleteOne(filter, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._deleteOne(filter, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._deleteOne(filter, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _deleteMany(filter, options, callback) {
        options.single = false;

        this._removeDocuments(filter, options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (err && callback) {
                return callback(err);
            }
            if (is.nil(r)) {
                return callback(null, { result: { ok: 1 } });
            }
            r.deletedCount = r.result.n;
            callback(null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    deleteMany(filter, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._deleteMany(filter, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._deleteMany(filter, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    remove(selector, options, callback) {
        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._removeDocuments(selector, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._removeDocuments(selector, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _save(doc, options, callback) {
        // Get the write concern options
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);
        // Establish if we need to perform an insert or update
        if (!is.nil(doc._id)) {
            finalOptions.upsert = true;
            return this._updateDocuments({ _id: doc._id }, doc, finalOptions, callback);
        }

        // Insert the document
        this._insertDocuments([doc], options, (err, r) => {
            if (is.nil(callback)) {
                return;
            }
            if (is.nil(doc)) {
                return handleCallback(callback, null, null);
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            handleCallback(callback, null, r);
        });
    }

    @classMethod({ callback: true, promise: true })
    save(doc, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._save(doc, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._save(doc, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findOne(args, callback) {
        const cursor = this.find.apply(this, args).limit(-1).batchSize(1);
        // Return the item
        cursor.next((err, item) => {
            if (!is.nil(err)) {
                return handleCallback(callback, toError(err), null);
            }
            handleCallback(callback, null, item);
        });
    }

    @classMethod({ callback: true, promise: true })
    findOne(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._findOne(args, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._findOne(args, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _rename(newName, opt, callback) {
        // Check the collection name
        checkCollectionName(newName);
        // Build the command
        const renameCollection = `${this.s.dbName}.${this.s.name}`;
        const toCollection = `${this.s.dbName}.${newName}`;
        const dropTarget = is.boolean(opt.dropTarget) ? opt.dropTarget : false;
        const cmd = { renameCollection, to: toCollection, dropTarget };

        // Execute against admin
        this.s.db.admin().command(cmd, opt, (err, doc) => {
            if (err) {
                return handleCallback(callback, err, null);
            }
            // We have an error
            if (doc.errmsg) {
                return handleCallback(callback, toError(doc), null);
            }
            try {
                return handleCallback(
                    callback,
                    null,
                    new Collection(
                        this.s.db,
                        this.s.topology,
                        this.s.dbName,
                        newName,
                        this.s.pkFactory,
                        this.s.options
                    )
                );
            } catch (err) {
                return handleCallback(callback, toError(err), null);
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    rename(newName, opt, callback) {
        if (is.function(opt)) {
            callback = opt, opt = {};
        }
        opt = assign({}, opt, { readPreference: ReadPreference.PRIMARY });

        // Execute using callback
        if (is.function(callback)) {
            return this._rename(newName, opt, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._rename(newName, opt, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    drop(options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Execute using callback
        if (is.function(callback)) {
            return this.s.db.dropCollection(this.s.name, options, callback);
        }
        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.dropCollection(this.s.name, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _options(callback) {
        this.s.db.listCollections({ name: this.s.name }).toArray((err, collections) => {
            if (err) {
                return handleCallback(callback, err);
            }
            if (collections.length === 0) {
                return handleCallback(callback, MongoError.create({
                    message: `collection ${this.s.namespace} not found`,
                    driver: true
                }));
            }

            handleCallback(callback, err, collections[0].options || null);
        });
    }

    @classMethod({ callback: true, promise: true })
    options(callback) {
        if (is.function(callback)) {
            return this._options(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._options((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _isCapped(callback) {
        this.options((err, document) => {
            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, null, document && document.capped);
        });
    }

    @classMethod({ callback: true, promise: true })
    isCapped(callback) {
        if (is.function(callback)) {
            return this._isCapped(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._isCapped((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _createIndex(fieldOrSpec, options, callback) {
        this.s.db.createIndex(this.s.name, fieldOrSpec, options, callback);
    }

    @classMethod({ callback: true, promise: true })
    createIndex(fieldOrSpec, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() || {} : {};
        options = is.function(callback) ? options : callback;
        options = is.nil(options) ? {} : options;

        if (is.function(callback)) {
            return this._createIndex(fieldOrSpec, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._createIndex(fieldOrSpec, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _createIndexes(indexSpecs, callback) {
        const capabilities = this.s.topology.capabilities();

        // Ensure we generate the correct name if the parameter is not set
        for (let i = 0; i < indexSpecs.length; i++) {
            if (is.nil(indexSpecs[i].name)) {
                const keys = [];

                // Did the user pass in a collation, check if our write server supports it
                if (indexSpecs[i].collation && capabilities && !capabilities.commandsTakeCollation) {
                    return callback(new MongoError("server/primary/mongos does not support collation"));
                }

                for (const name in indexSpecs[i].key) {
                    keys.push(`${name}_${indexSpecs[i].key[name]}`);
                }

                // Set the name
                indexSpecs[i].name = keys.join("_");
            }
        }

        // Execute the index
        this.s.db.command({
            createIndexes: this.s.name, indexes: indexSpecs
        }, { readPreference: ReadPreference.PRIMARY }, callback);
    }

    @classMethod({ callback: true, promise: true })
    createIndexes(indexSpecs, callback) {
        if (is.function(callback)) {
            return this._createIndexes(indexSpecs, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._createIndexes(indexSpecs, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _dropIndex(indexName, options, callback) {
        // Delete index command
        const cmd = { dropIndexes: this.s.name, index: indexName };

        // Decorate command with writeConcern if supported
        decorateWithWriteConcern(cmd, this, options);

        this.s.db.command(cmd, options, (err, result) => {
            if (is.nil(callback)) {
                return;
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            handleCallback(callback, null, result);
        });
    }

    @classMethod({ callback: true, promise: true })
    dropIndex(indexName, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};
        // Run only against primary
        options.readPreference = ReadPreference.PRIMARY;

        // Execute using callback
        if (is.function(callback)) {
            return this._dropIndex(indexName, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._dropIndex(indexName, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _dropIndexes(options, callback) {
        this.dropIndex("*", options, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            handleCallback(callback, null, true);
        });
    }

    @classMethod({ callback: true, promise: true })
    dropIndexes(options, callback) {
        // Do we have options
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Execute using callback
        if (is.function(callback)) {
            return this._dropIndexes(options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._dropIndexes(options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _reIndex(options, callback) {
        // Reindex
        const cmd = { reIndex: this.s.name };

        // Decorate command with writeConcern if supported
        decorateWithWriteConcern(cmd, this, options);

        // Execute the command
        this.s.db.command(cmd, options, (err, result) => {
            if (is.nil(callback)) {
                return;
            }
            if (err) {
                return handleCallback(callback, err, null);
            }
            handleCallback(callback, null, result.ok ? true : false);
        });
    }

    @classMethod({ callback: true, promise: true })
    reIndex(options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Execute using callback
        if (is.function(callback)) {
            return this._reIndex(options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._reIndex(options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: false, promise: false, returns: [__.CommandCursor] })
    listIndexes(options) {
        options = options || {};
        options = shallowClone(options);
        options = getReadPreference(this, options, this.s.db, this);
        options.cursorFactory = __.CommandCursor;
        options.promiseLibrary = this.s.promiseLibrary;

        if (!this.s.topology.capabilities()) {
            throw new MongoError("cannot connect to server");
        }

        // We have a list collections command
        if (this.s.topology.capabilities().hasListIndexesCommand) {
            // Cursor options
            let cursor = options.batchSize ? { batchSize: options.batchSize } : {};
            // Build the command
            const command = { listIndexes: this.s.name, cursor };
            // Execute the cursor
            cursor = this.s.topology.cursor(`${this.s.dbName}.$cmd`, command, options);
            // Do we have a readPreference, apply it
            if (options.readPreference) {
                cursor.setReadPreference(options.readPreference);
            }
            // Return the cursor
            return cursor;
        }

        // Get the namespace
        const ns = `${this.s.dbName}.system.indexes`;
        // Get the query
        let cursor = this.s.topology.cursor(ns, { find: ns, query: { ns: this.s.namespace } }, options);
        // Do we have a readPreference, apply it
        if (options.readPreference) {
            cursor.setReadPreference(options.readPreference);
        }
        // Set the passed in batch size if one was provided
        if (options.batchSize) {
            cursor = cursor.batchSize(options.batchSize);
        }
        // Return the cursor
        return cursor;
    }

    _ensureIndex(fieldOrSpec, options, callback) {
        this.s.db.ensureIndex(this.s.name, fieldOrSpec, options, callback);
    }

    @classMethod({ callback: true, promise: true })
    ensureIndex(fieldOrSpec, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Execute using callback
        if (is.function(callback)) {
            return this._ensureIndex(fieldOrSpec, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._ensureIndex(fieldOrSpec, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _indexExists(indexes, callback) {
        this.indexInformation((err, indexInformation) => {
            // If we have an error return
            if (!is.nil(err)) {
                return handleCallback(callback, err, null);
            }
            // Let's check for the index names
            if (!is.array(indexes)) {
                return handleCallback(callback, null, !is.nil(indexInformation[indexes]));
            }
            // Check in list of indexes
            for (let i = 0; i < indexes.length; i++) {
                if (is.nil(indexInformation[indexes[i]])) {
                    return handleCallback(callback, null, false);
                }
            }

            // All keys found return true
            return handleCallback(callback, null, true);
        });
    }

    @classMethod({ callback: true, promise: true })
    indexExists(indexes, callback) {
        // Execute using callback
        if (is.function(callback)) {
            return this._indexExists(indexes, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._indexExists(indexes, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _indexInformation(options, callback) {
        this.s.db.indexInformation(this.s.name, options, callback);
    }

    @classMethod({ callback: true, promise: true })
    indexInformation(...args) {
        // Unpack calls
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};

        // Execute using callback
        if (is.function(callback)) {
            return this._indexInformation(options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._indexInformation(options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _count(query, options, callback) {
        const skip = options.skip;
        const limit = options.limit;
        const hint = options.hint;
        const maxTimeMS = options.maxTimeMS;

        // Final query
        const cmd = {
            count: this.s.name, query
        };

        // Add limit, skip and maxTimeMS if defined
        if (is.number(skip)) {
            cmd.skip = skip;
        }
        if (is.number(limit)) {
            cmd.limit = limit;
        }
        if (is.number(maxTimeMS)) {
            cmd.maxTimeMS = maxTimeMS;
        }
        if (hint) {
            cmd.hint = hint;
        }

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Do we have a readConcern specified
        if (this.s.readConcern) {
            cmd.readConcern = this.s.readConcern;
        }

        // Have we specified collation
        decorateWithCollation(cmd, this, options);

        // Execute command
        this.s.db.command(cmd, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, null, result.n);
        });
    }

    @classMethod({ callback: true, promise: true })
    count(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const queryOption = args.length ? args.shift() || {} : {};
        const optionsOption = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._count(queryOption, optionsOption, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._count(queryOption, optionsOption, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _distinct(key, query, options, callback) {
        // maxTimeMS option
        const maxTimeMS = options.maxTimeMS;

        // Distinct command
        const cmd = {
            distinct: this.s.name, key, query
        };

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Add maxTimeMS if defined
        if (is.number(maxTimeMS)) {
            cmd.maxTimeMS = maxTimeMS;
        }

        // Do we have a readConcern specified
        if (this.s.readConcern) {
            cmd.readConcern = this.s.readConcern;
        }

        // Have we specified collation
        decorateWithCollation(cmd, this, options);

        // Execute the command
        this.s.db.command(cmd, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, null, result.values);
        });
    }

    @classMethod({ callback: true, promise: true })
    distinct(key, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const queryOption = args.length ? args.shift() || {} : {};
        const optionsOption = args.length ? args.shift() || {} : {};

        // Execute using callback
        if (is.function(callback)) {
            return this._distinct(key, queryOption, optionsOption, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._distinct(key, queryOption, optionsOption, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _indexes(callback) {
        this.s.db.indexInformation(this.s.name, { full: true }, callback);
    }

    @classMethod({ callback: true, promise: true })
    indexes(callback) {
        if (is.function(callback)) {
            return this._indexes(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._indexes((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _stats(options, callback) {
        // Build command object
        const commandObject = {
            collStats: this.s.name
        };

        // Check if we have the scale value
        if (!is.nil(options.scale)) {
            commandObject.scale = options.scale;
        }

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Execute the command
        this.s.db.command(commandObject, options, callback);
    }

    @classMethod({ callback: true, promise: true })
    stats(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        // Fetch all commands
        const options = args.length ? args.shift() || {} : {};

        // Execute using callback
        if (is.function(callback)) {
            return this._stats(options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._stats(options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findOneAndDelete(filter, options, callback) {
        // Final options
        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.remove = true;
        // Execute find and Modify
        this.findAndModify(filter, options.sort, null, finalOptions, callback);
    }

    @classMethod({ callback: true, promise: true })
    findOneAndDelete(filter, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Basic validation
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }

        if (is.function(callback)) {
            return this._findOneAndDelete(filter, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._findOneAndDelete(filter, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findOneAndReplace(filter, replacement, options, callback) {
        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.update = true;
        finalOptions.new = is.boolean(options.returnOriginal) ? !options.returnOriginal : false;
        finalOptions.upsert = is.boolean(options.upsert) ? options.upsert : false;

        this.findAndModify(filter, options.sort, replacement, finalOptions, callback);
    }

    @classMethod({ callback: true, promise: true })
    findOneAndReplace(filter, replacement, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Basic validation
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }
        if (is.nil(replacement) || !is.object(replacement)) {
            throw toError("replacement parameter must be an object");
        }

        if (is.function(callback)) {
            return this._findOneAndReplace(filter, replacement, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._findOneAndReplace(filter, replacement, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findOneAndUpdate(filter, update, options, callback) {
        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.update = true;
        finalOptions.new = is.boolean(options.returnOriginal) ? !options.returnOriginal : false;
        finalOptions.upsert = is.boolean(options.upsert) ? options.upsert : false;
        this.findAndModify(filter, options.sort, update, finalOptions, callback);
    }

    @classMethod({ callback: true, promise: true })
    findOneAndUpdate(filter, update, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        options = options || {};

        // Basic validation
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }
        if (is.nil(update) || !is.object(update)) {
            throw toError("update parameter must be an object");
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._findOneAndUpdate(filter, update, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._findOneAndUpdate(filter, update, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findAndModify(query, sort, doc, options, callback) {
        // Create findAndModify command object
        const queryObject = {
            findandmodify: this.s.name,
            query
        };

        sort = formattedOrderClause(sort);
        if (sort) {
            queryObject.sort = sort;
        }

        queryObject.new = options.new ? true : false;
        queryObject.remove = options.remove ? true : false;
        queryObject.upsert = options.upsert ? true : false;

        if (options.fields) {
            queryObject.fields = options.fields;
        }

        if (doc && !options.remove) {
            queryObject.update = doc;
        }

        if (options.maxTimeMS) {
            queryObject.maxTimeMS = options.maxTimeMS;
        }

        // Either use override on the function, or go back to default on either the collection
        // level or db
        if (!is.nil(options.serializeFunctions)) {
            options.serializeFunctions = options.serializeFunctions;
        } else {
            options.serializeFunctions = this.s.serializeFunctions;
        }

        // No check on the documents
        options.checkKeys = false;

        // Get the write concern settings
        const finalOptions = writeConcern(options, this.s.db, this, options);

        // Decorate the findAndModify command with the write Concern
        if (finalOptions.writeConcern) {
            queryObject.writeConcern = finalOptions.writeConcern;
        }

        // Have we specified bypassDocumentValidation
        if (is.boolean(finalOptions.bypassDocumentValidation)) {
            queryObject.bypassDocumentValidation = finalOptions.bypassDocumentValidation;
        }

        // Have we specified collation
        decorateWithCollation(queryObject, this, options);

        // Execute the command
        this.s.db.command(queryObject, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err, null);
            }
            return handleCallback(callback, null, result);
        });
    }

    @classMethod({ callback: true, promise: true })
    findAndModify(query, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const sort = args.length ? args.shift() || [] : [];
        const doc = args.length ? args.shift() : null;
        let options = args.length ? args.shift() || {} : {};

        options = shallowClone(options);
        options.readPreference = ReadPreference.PRIMARY;

        // Execute using callback
        if (is.function(callback)) {
            return this._findAndModify(query, sort, doc, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._findAndModify(query, sort, doc, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _findAndRemove(query, sort, options, callback) {
        // Add the remove option
        options.remove = true;
        // Execute the callback
        this.findAndModify(query, sort, null, options, callback);
    }

    @classMethod({ callback: true, promise: true })
    findAndRemove(query, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const sort = args.length ? args.shift() || [] : [];
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._findAndRemove(query, sort, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._findAndRemove(query, sort, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: false })
    aggregate(...args) {
        let pipeline;
        let callback;
        let options;
        if (is.array(args[0])) {
            [pipeline, options, callback] = args;
            // Set up callback if one is provided
            if (is.function(options)) {
                callback = options;
                options = {};
            }

            // If we have no options or callback we are doing
            // a cursor based aggregation
            if (is.nil(options) && is.nil(callback)) {
                options = {};
            }
        } else {
            // Get the callback
            callback = args.pop();
            // Get the possible options object
            const opts = args[args.length - 1];
            // If it contains any of the admissible options pop it of the args
            options = opts && (
                opts.readPreference ||
                opts.explain ||
                opts.cursor ||
                opts.out ||
                opts.maxTimeMS ||
                opts.allowDiskUse
            ) ? args.pop() : {};
            // Left over arguments is the pipeline
            pipeline = args;
        }

        // Ignore readConcern option
        let ignoreReadConcern = false;

        // Build the command
        const command = { aggregate: this.s.name, pipeline };

        // If out was specified
        if (is.string(options.out)) {
            pipeline.push({ $out: options.out });
            // Ignore read concern
            ignoreReadConcern = true;
        } else if (pipeline.length > 0 && pipeline[pipeline.length - 1].$out) {
            ignoreReadConcern = true;
        }

        // Decorate command with writeConcern if out has been specified
        if (pipeline.length > 0 && pipeline[pipeline.length - 1].$out) {
            decorateWithWriteConcern(command, this, options);
        }

        // Have we specified collation
        decorateWithCollation(command, this, options);

        // If we have bypassDocumentValidation set
        if (is.boolean(options.bypassDocumentValidation)) {
            command.bypassDocumentValidation = options.bypassDocumentValidation;
        }

        // Do we have a readConcern specified
        if (!ignoreReadConcern && this.s.readConcern) {
            command.readConcern = this.s.readConcern;
        }

        // If we have allowDiskUse defined
        if (options.allowDiskUse) {
            command.allowDiskUse = options.allowDiskUse;
        }
        if (is.number(options.maxTimeMS)) {
            command.maxTimeMS = options.maxTimeMS;
        }

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // If explain has been specified add it
        if (options.explain) {
            command.explain = options.explain;
        }

        // Validate that cursor options is valid
        if (!is.nil(options.cursor) && !is.object(options.cursor)) {
            throw toError("cursor options must be an object");
        }

        // promiseLibrary
        options.promiseLibrary = this.s.promiseLibrary;

        // Set the AggregationCursor constructor
        options.cursorFactory = __.AggregationCursor;
        if (!is.function(callback)) {
            if (!this.s.topology.capabilities()) {
                throw new MongoError("cannot connect to server");
            }

            if (this.s.topology.capabilities().hasAggregationCursor) {
                options.cursor = options.cursor || { batchSize: 1000 };
                command.cursor = options.cursor;
            }

            // Allow disk usage command
            if (is.boolean(options.allowDiskUse)) {
                command.allowDiskUse = options.allowDiskUse;
            }
            if (is.number(options.maxTimeMS)) {
                command.maxTimeMS = options.maxTimeMS;
            }

            // Execute the cursor
            return this.s.topology.cursor(this.s.namespace, command, options);
        }

        // We do not allow cursor
        if (options.cursor) {
            return this.s.topology.cursor(this.s.namespace, command, options);
        }
        // Execute the command
        this.s.db.command(command, options, (err, result) => {
            if (err) {
                handleCallback(callback, err);
            } else if (result.err || result.errmsg) {
                handleCallback(callback, toError(result));
            } else if (is.object(result) && result.serverPipeline) {
                handleCallback(callback, null, result.serverPipeline);
            } else if (is.object(result) && result.stages) {
                handleCallback(callback, null, result.stages);
            } else {
                handleCallback(callback, null, result.result);
            }
        });
    }

    _parallelCollectionScan(options, callback) {
        // Create command object
        const commandObject = {
            parallelCollectionScan: this.s.name,
            numCursors: options.numCursors
        };

        // Do we have a readConcern specified
        if (this.s.readConcern) {
            commandObject.readConcern = this.s.readConcern;
        }

        // Store the raw value
        const raw = options.raw;
        delete options.raw;

        // Execute the command
        this.s.db.command(commandObject, options, (err, result) => {
            if (err) {
                return handleCallback(callback, err, null);
            }
            if (is.nil(result)) {
                return handleCallback(callback, new Error("no result returned for parallelCollectionScan"), null);
            }

            const cursors = [];
            // Add the raw back to the option
            if (raw) {
                options.raw = raw;
            }
            // Create command cursors for each item
            for (let i = 0; i < result.cursors.length; i++) {
                const rawId = result.cursors[i].cursor.id;
                // Convert cursorId to Long if needed
                const cursorId = is.number(rawId) ? Long.fromNumber(rawId) : rawId;
                // Add a command cursor
                cursors.push(this.s.topology.cursor(this.s.namespace, cursorId, options));
            }

            handleCallback(callback, null, cursors);
        });
    }

    @classMethod({ callback: true, promise: true })
    parallelCollectionScan(options, callback) {
        if (is.function(options)) {
            callback = options, options = { numCursors: 1 };
        }
        // Set number of cursors to 1
        options.numCursors = options.numCursors || 1;
        options.batchSize = options.batchSize || 1000;

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Add a promiseLibrary
        options.promiseLibrary = this.s.promiseLibrary;

        // Execute using callback
        if (is.function(callback)) {
            return this._parallelCollectionScan(options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._parallelCollectionScan(options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _geoNear(x, y, point, options, callback) {
        // Build command object
        let commandObject = {
            geoNear: this.s.name,
            near: point || [x, y]
        };

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Exclude readPreference and existing options to prevent user from
        // shooting themselves in the foot
        const exclude = {
            readPreference: true,
            geoNear: true,
            near: true
        };

        // Filter out any excluded objects
        commandObject = decorateCommand(commandObject, options, exclude);

        // Do we have a readConcern specified
        if (this.s.readConcern) {
            commandObject.readConcern = this.s.readConcern;
        }

        // Have we specified collation
        decorateWithCollation(commandObject, this, options);

        // Execute the command
        this.s.db.command(commandObject, options, (err, res) => {
            if (err) {
                return handleCallback(callback, err);
            }
            if (res.err || res.errmsg) {
                return handleCallback(callback, toError(res));
            }
            // should we only be returning res.results here? Not sure if the user
            // should see the other return information
            handleCallback(callback, null, res);
        });
    }

    @classMethod({ callback: true, promise: true })
    geoNear(...args) {
        let x;
        let y;
        let point;
        if (is.object(args[0])) {
            point = args.shift();
        } else {
            x = args.shift();
            y = args.shift();
        }
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._geoNear(x, y, point, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._geoNear(x, y, point, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _geoHaystackSearch(x, y, options, callback) {
        // Build command object
        let commandObject = {
            geoSearch: this.s.name,
            near: [x, y]
        };

        // Remove read preference from hash if it exists
        commandObject = decorateCommand(commandObject, options, { readPreference: true });

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // Do we have a readConcern specified
        if (this.s.readConcern) {
            commandObject.readConcern = this.s.readConcern;
        }

        // Execute the command
        this.s.db.command(commandObject, options, (err, res) => {
            if (err) {
                return handleCallback(callback, err);
            }
            if (res.err || res.errmsg) {
                handleCallback(callback, toError(res));
            }
            // should we only be returning res.results here? Not sure if the user
            // should see the other return information
            handleCallback(callback, null, res);
        });
    }

    @classMethod({ callback: true, promise: true })
    geoHaystackSearch(x, y, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() || {} : {};

        if (is.function(callback)) {
            return this._geoHaystackSearch(x, y, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._geoHaystackSearch(x, y, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _group(keys, condition, initial, reduce, finalize, command, options, callback) {
        // Execute using the command
        if (command) {
            const reduceFunction = reduce && reduce._bsontype === "Code"
                ? reduce
                : new Code(reduce);

            const selector = {
                group: {
                    ns: this.s.name,
                    $reduce: reduceFunction,
                    cond: condition,
                    initial,
                    out: "inline"
                }
            };

            // if finalize is defined
            if (!is.nil(finalize)) {
                selector.group.finalize = finalize;
            }
            // Set up group selector
            if (is.function(keys) || (keys && keys._bsontype === "Code")) {
                selector.group.$keyf = keys && keys._bsontype === "Code"
                    ? keys
                    : new Code(keys);
            } else {
                const hash = {};
                keys.forEach((key) => {
                    hash[key] = 1;
                });
                selector.group.key = hash;
            }

            options = shallowClone(options);
            // Ensure we have the right read preference inheritance
            options = getReadPreference(this, options, this.s.db, this);

            // Do we have a readConcern specified
            if (this.s.readConcern) {
                selector.readConcern = this.s.readConcern;
            }

            // Have we specified collation
            decorateWithCollation(selector, this, options);

            // Execute command
            this.s.db.command(selector, options, (err, result) => {
                if (err) {
                    return handleCallback(callback, err, null);
                }
                handleCallback(callback, null, result.retval);
            });
        } else {
            // Create execution scope
            const scope = !is.nil(reduce) && reduce._bsontype === "Code"
                ? reduce.scope
                : {};

            scope.ns = this.s.name;
            scope.keys = keys;
            scope.condition = condition;
            scope.initial = initial;

            // Pass in the function text to execute within mongodb.
            const groupfn = groupFunction.replace(/ reduce;/, `${reduce.toString()};`);

            this.s.db.eval(new Code(groupfn, scope), (err, results) => {
                if (err) {
                    return handleCallback(callback, err, null);
                }
                handleCallback(callback, null, results.result || results);
            });
        }
    }

    @classMethod({ callback: true, promise: true })
    group(keys, condition, initial, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let reduce = args.length ? args.shift() : null;
        let finalize = args.length ? args.shift() : null;
        let command = args.length ? args.shift() : null;
        const options = args.length ? args.shift() || {} : {};

        // Make sure we are backward compatible
        if (!(is.function(finalize))) {
            command = finalize;
            finalize = null;
        }

        if (!is.array(keys) && is.object(keys) && !is.function(keys) && keys._bsontype !== "Code") {
            keys = Object.keys(keys);
        }

        if (is.function(reduce)) {
            reduce = reduce.toString();
        }

        if (is.function(finalize)) {
            finalize = finalize.toString();
        }

        // Set up the command as default
        command = is.nil(command) ? true : command;

        if (is.function(callback)) {
            return this._group(keys, condition, initial, reduce, finalize, command, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._group(keys, condition, initial, reduce, finalize, command, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _mapReduce(map, reduce, options, callback) {
        const mapCommandHash = {
            mapreduce: this.s.name,
            map,
            reduce
        };


        // Exclusion list
        const exclusionList = ["readPreference"];

        // Add any other options passed in
        for (const n in options) {
            if (n === "scope") {
                mapCommandHash[n] = processScope(options[n]);
            } else {
                // Only include if not in exclusion list
                if (!exclusionList.includes(n)) {
                    mapCommandHash[n] = options[n];
                }
            }
        }

        options = shallowClone(options);
        // Ensure we have the right read preference inheritance
        options = getReadPreference(this, options, this.s.db, this);

        // If we have a read preference and inline is not set as output fail hard
        if ((options.readPreference !== false && options.readPreference !== "primary")
            && options.out && (options.out.inline !== 1 && options.out !== "inline")) {
            // Force readPreference to primary
            options.readPreference = "primary";
            // Decorate command with writeConcern if supported
            decorateWithWriteConcern(mapCommandHash, this, options);
        } else if (this.s.readConcern) {
            mapCommandHash.readConcern = this.s.readConcern;
        }

        // Is bypassDocumentValidation specified
        if (is.boolean(options.bypassDocumentValidation)) {
            mapCommandHash.bypassDocumentValidation = options.bypassDocumentValidation;
        }

        // Have we specified collation
        decorateWithCollation(mapCommandHash, this, options);

        // Execute command
        this.s.db.command(mapCommandHash, { readPreference: options.readPreference }, (err, result) => {
            if (err) {
                return handleCallback(callback, err);
            }
            // Check if we have an error
            if (result.ok !== 1 || result.err || result.errmsg) {
                return handleCallback(callback, toError(result));
            }

            // Create statistics value
            const stats = {};
            if (result.timeMillis) {
                stats.processtime = result.timeMillis;
            }
            if (result.counts) {
                stats.counts = result.counts;
            }
            if (result.timing) {
                stats.timing = result.timing;
            }

            // invoked with inline?
            if (result.results) {
                // If we wish for no verbosity
                if (is.nil(options.verbose) || !options.verbose) {
                    return handleCallback(callback, null, result.results);
                }

                return handleCallback(callback, null, result.results, stats);
            }

            // The returned collection
            let collection = null;

            // If we have an object it's a different db
            if (!is.nil(result.result) && is.object(result.result)) {
                const doc = result.result;
                collection = this.s.db.db(doc.db).collection(doc.collection);
            } else {
                // Create a collection object that wraps the result collection
                collection = this.s.db.collection(result.result);
            }

            // If we wish for no verbosity
            if (is.nil(options.verbose) || !options.verbose) {
                return handleCallback(callback, err, collection);
            }

            // Return stats as third set of values
            handleCallback(callback, err, collection, stats);
        });
    }

    @classMethod({ callback: true, promise: true })
    mapReduce(map, reduce, options, callback) {
        if (is.function(options)) {
            callback = options, options = {};
        }
        // Out must allways be defined (make sure we don't break weirdly on pre 1.8+ servers)
        if (is.nil(options.out)) {
            throw new Error("the out option parameter must be defined, see mongodb docs for possible values");
        }

        if (is.function(map)) {
            map = map.toString();
        }

        if (is.function(reduce)) {
            reduce = reduce.toString();
        }

        if (is.function(options.finalize)) {
            options.finalize = options.finalize.toString();
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._mapReduce(map, reduce, options, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._mapReduce(map, reduce, options, (err, r, r1) => {
                if (err) {
                    return reject(err);
                }
                if (!r1) {
                    return resolve(r);
                }
                resolve({ results: r, stats: r1 });
            });
        });
    }

    @classMethod({ callback: false, promise: false, returns: [bulk.UnorderedBulkOperation] })
    initializeUnorderedBulkOp(options) {
        options = options || {};
        options.promiseLibrary = this.s.promiseLibrary;
        return bulk.initializeUnorderedBulkOp(this.s.topology, this, options);
    }

    @classMethod({ callback: false, promise: false, returns: [bulk.OrderedBulkOperation] })
    initializeOrderedBulkOp(options) {
        options = options || {};
        options.promiseLibrary = this.s.promiseLibrary;
        return bulk.initializeOrderedBulkOp(this.s.topology, this, options);
    }
}

Collection.prototype.removeOne = Collection.prototype.deleteOne;
Collection.define.classMethod("removeOne", { callback: true, promise: true });

Collection.prototype.removeMany = Collection.prototype.deleteMany;
Collection.define.classMethod("removeMany", { callback: true, promise: true });

Collection.prototype.dropAllIndexes = Collection.prototype.dropIndexes;
Collection.define.classMethod("dropAllIndexes", { callback: true, promise: true });
