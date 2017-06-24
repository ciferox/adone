const { is, database: { mongo }, util } = adone;
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
        decorateCommand,
        formattedOrderClause
    }
} = __;
const { classMethod } = metadata;

const mergeKeys = ["readPreference", "ignoreUndefined"];

// Get write concern
const writeConcern = (target, db, col, options) => {
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
const getReadPreference = (self, options, db) => {
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

const mapInsertManyResults = (docs, r) => {
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

const groupFunction = `function () {
    var c = db[ns].find(condition);
    var map = new Map();
    var reduce_function = reduce;
    while (c.hasNext()) {
        var obj = c.next();
        var key = {};
        for (var i = 0, len = keys.length; i < len; ++i) {
            var k = keys[i];
            key[k] = obj[k];
        }
        var aggObj = map.get(key);
        if (aggObj == null) {
            var newObj = Object.extend({}, key);
            aggObj = Object.extend(newObj, initial);
            map.put(key, aggObj);
        }
        reduce_function(obj, aggObj);
    }
    return { result: map.values() };
}`;

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
    find(selector = {}, fields, options) {
        if (is.undefined(options) && !is.undefined(fields) && !is.array(fields)) {
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
        } else if (is.array(fields) && !is.array(fields[0])) {
            const newFields = {};
            // Rewrite the array
            for (let i = 0; i < fields.length; i++) {
                newFields[fields[i]] = 1;
            }
            // Set the fields
            fields = newFields;
        }

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
        if (options && options.fields && !is.buffer(options.fields)) {
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
        newOptions.skip = options.skip ? options.skip : 0;
        newOptions.limit = options.limit ? options.limit : 0;
        newOptions.raw = !is.nil(options.raw) && is.boolean(options.raw) ? options.raw : this.s.raw;
        newOptions.hint = !is.nil(options.hint) ? normalizeHintField(options.hint) : this.s.collectionHint;
        newOptions.timeout = is.undefined(options.timeout) ? undefined : options.timeout;
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

        return this.s.topology.cursor(this.s.namespace, findCommand, newOptions);
    }

    _insertDocuments(docs, options) {
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
        return new Promise((resolve, reject) => {
            this.s.topology.insert(this.s.namespace, docs, finalOptions, (err, result) => {
                if (err) {
                    return reject(err);
                }
                if (is.nil(result)) {
                    return resolve(null);
                }
                if (result.result.code) {
                    return reject(toError(result.result));
                }
                if (result.result.writeErrors) {
                    return reject(toError(result.result.writeErrors[0]));
                }
                // Add docs to the list
                result.ops = docs;
                resolve(result);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    async insertOne(doc, options = {}) {
        if (is.array(doc)) {
            throw MongoError.create({ message: "doc parameter must be an object", driver: true });
        }

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        const r = await this._insertDocuments([doc], options);

        // Workaround for pre 2.6 servers
        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }
        // Add values to top level to ensure crud spec compatibility
        r.insertedCount = r.result.n;
        r.insertedId = doc._id;
        return r;
    }

    async _bulkWrite(operations, options) {
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

        // Final options for write concern
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);
        const writeCon = finalOptions.writeConcern ? finalOptions.writeConcern : {};
        const capabilities = this.s.topology.capabilities();

        // Did the user pass in a collation, check if our write server supports it
        if (collation && capabilities && !capabilities.commandsTakeCollation) {
            throw new MongoError("server/primary/mongos does not support collation");
        }

        // Execute the bulk
        return new Promise((resolve, reject) => {
            bulk.execute(writeCon, (err, r) => {
                // We have connection level error
                if (!r && err) {
                    return reject(err);
                }
                // We have single error
                if (r && r.hasWriteErrors() && r.getWriteErrorCount() === 1) {
                    const err = toError(r.getWriteErrorAt(0));
                    err.result = r;
                    return reject(err);
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
                    const err = toError({
                        message: "write operation failed",
                        code: errors[0].code, writeErrors: errors
                    });
                    err.result = r;
                    return reject(err);
                }

                // Check if we have a writeConcern error
                if (r.getWriteConcernError()) {
                    const err = toError(r.getWriteConcernError());
                    err.result = r;
                    return reject(err);
                }

                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    async insertMany(docs, options) {
        if (!is.array(docs)) {
            throw MongoError.create({ message: "docs parameter must be an array of documents", driver: true });
        }
        options = options ? shallowClone(options) : { ordered: true };

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

        return mapInsertManyResults(docs, await this._bulkWrite(operations, options));
    }

    @classMethod({ callback: true, promise: true })
    async bulkWrite(operations, options = { ordered: true }) {
        if (!is.array(operations)) {
            throw MongoError.create({ message: "operations must be an array of documents", driver: true });
        }
        return this._bulkWrite(operations, options).catch((err) => {
            if (!is.nil(err.result)) {
                return err.result;
            }
            return Promise.reject(err);
        });
    }

    @classMethod({ callback: true, promise: true })
    async insert(docs, options = { ordered: true }) {
        if (options.keepGoing === true) {
            options.ordered = false;
        }

        return this.insertMany(util.arrify(docs), options);
    }

    async _updateDocuments(selector, document, options = {}) {
        // If we are not providing a selector or document throw
        if (is.nil(selector) || !is.object(selector)) {
            throw toError("selector must be a valid JavaScript object");
        }
        if (is.nil(document) || !is.object(document)) {
            throw toError("document must be a valid JavaScript object");
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

        return new Promise((resolve, reject) => {
            // Update options
            this.s.topology.update(this.s.namespace, [op], finalOptions, (err, result) => {
                if (err) {
                    return reject(err);
                }
                if (is.nil(result)) {
                    return resolve(null);
                }
                if (result.result.code) {
                    return reject(toError(result.result));
                }
                if (result.result.writeErrors) {
                    return reject(toError(result.result.writeErrors[0]));
                }
                // Return the results
                resolve(result);
            });
        });
    }

    async _updateOne(filter, update, options) {
        // Set single document update
        options.multi = false;

        const r = await this._updateDocuments(filter, update, options);

        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }

        r.modifiedCount = !is.nil(r.result.nModified)
            ? r.result.nModified
            : r.result.n;

        r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0
            ? r.result.upserted[0]
            : null;

        r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length
            ? r.result.upserted.length
            : 0;

        r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0
            ? 0
            : r.result.n;

        return r;
    }

    @classMethod({ callback: true, promise: true })
    async updateOne(filter, update, options = {}) {
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        return this._updateOne(filter, update, options);
    }

    @classMethod({ callback: true, promise: true })
    async replaceOne(filter, doc, options = {}) {
        options = shallowClone(options);

        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        options.multi = false;

        // Execute update
        const r = await this._updateDocuments(filter, doc, options);

        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }

        r.modifiedCount = !is.nil(r.result.nModified) ? r.result.nModified : r.result.n;
        r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
        r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
        r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;
        r.ops = [doc];

        return r;
    }

    @classMethod({ callback: true, promise: true })
    async updateMany(filter, update, options = {}) {
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Set single document update
        options.multi = true;
        // Execute update
        const r = await this._updateDocuments(filter, update, options);

        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }

        r.modifiedCount = !is.nil(r.result.nModified) ? r.result.nModified : r.result.n;
        r.upsertedId = is.array(r.result.upserted) && r.result.upserted.length > 0 ? r.result.upserted[0] : null;
        r.upsertedCount = is.array(r.result.upserted) && r.result.upserted.length ? r.result.upserted.length : 0;
        r.matchedCount = is.array(r.result.upserted) && r.result.upserted.length > 0 ? 0 : r.result.n;

        return r;
    }

    @classMethod({ callback: true, promise: true })
    async update(selector, document, options = {}) {
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        return this._updateDocuments(selector, document, options);
    }

    _removeDocuments(selector = {}, options = {}) {
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
        return new Promise((resolve, reject) => {
            this.s.topology.remove(this.s.namespace, [op], finalOptions, (err, result) => {
                if (err) {
                    return reject(err);
                }
                if (is.nil(result)) {
                    return resolve(null);
                }
                if (result.result.code) {
                    return reject(toError(result.result));
                }
                if (result.result.writeErrors) {
                    return reject(toError(result.result.writeErrors[0]));
                }
                // Return the results
                resolve(result);
            });
        });
    }

    async _deleteOne(filter, options) {
        options.single = true;
        const r = await this._removeDocuments(filter, options);
        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }
        r.deletedCount = r.result.n;
        return r;
    }

    @classMethod({ callback: true, promise: true })
    async deleteOne(filter, options = {}) {
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        return this._deleteOne(filter, options);
    }

    @classMethod({ callback: true, promise: true })
    async deleteMany(filter, options = {}) {
        options = shallowClone(options);

        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        options.single = false;

        const r = await this._removeDocuments(filter, options);
        if (is.nil(r)) {
            return { result: { ok: 1 } };
        }
        r.deletedCount = r.result.n;
        return r;
    }

    @classMethod({ callback: true, promise: true })
    async remove(selector, options = {}) {
        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        return this._removeDocuments(selector, options);
    }

    @classMethod({ callback: true, promise: true })
    async save(doc, options = {}) {
        // Add ignoreUndfined
        if (this.s.options.ignoreUndefined) {
            options = shallowClone(options);
            options.ignoreUndefined = this.s.options.ignoreUndefined;
        }

        // Get the write concern options
        const finalOptions = writeConcern(shallowClone(options), this.s.db, this, options);
        // Establish if we need to perform an insert or update
        if (!is.nil(doc._id)) {
            finalOptions.upsert = true;
            return this._updateDocuments({ _id: doc._id }, doc, finalOptions);
        }

        // Insert the document
        return this._insertDocuments([doc], options);
    }

    @classMethod({ callback: true, promise: true })
    async findOne(selector, fields, options) {
        const cursor = this.find(selector, fields, options).limit(-1).batchSize(1);
        return cursor.next();
    }

    @classMethod({ callback: true, promise: true })
    async rename(newName, options = {}) {
        checkCollectionName(newName);
        options = { ...options, readPreference: ReadPreference.PRIMARY };
        const renameCollection = `${this.s.dbName}.${this.s.name}`;
        const toCollection = `${this.s.dbName}.${newName}`;
        const dropTarget = is.boolean(options.dropTarget) ? options.dropTarget : false;
        const cmd = { renameCollection, to: toCollection, dropTarget };

        // Execute against admin
        const doc = await this.s.db.admin().command(cmd, options);
        // We have an error
        if (doc.errmsg) {
            throw toError(doc);
        }
        return new Collection(
            this.s.db,
            this.s.topology,
            this.s.dbName,
            newName,
            this.s.pkFactory,
            this.s.options
        );
    }

    @classMethod({ callback: true, promise: true })
    async drop(options = {}) {
        return this.s.db.dropCollection(this.s.name, options);
    }

    @classMethod({ callback: true, promise: true })
    async options() {
        const collections = await this.s.db.listCollections({ name: this.s.name }).toArray();
        if (collections.length === 0) {
            throw MongoError.create({
                message: `collection ${this.s.namespace} not found`,
                driver: true
            });
        }
        return collections[0].options || null;
    }

    @classMethod({ callback: true, promise: true })
    async isCapped() {
        const options = await this.options();
        return options && options.capped;
    }

    @classMethod({ callback: true, promise: true })
    async createIndex(fieldOrSpec, options = {}) {
        return this.s.db.createIndex(this.s.name, fieldOrSpec, options);
    }

    @classMethod({ callback: true, promise: true })
    async createIndexes(indexSpecs) {
        const capabilities = this.s.topology.capabilities();

        // Ensure we generate the correct name if the parameter is not set
        for (let i = 0; i < indexSpecs.length; i++) {
            if (is.nil(indexSpecs[i].name)) {
                const keys = [];

                // Did the user pass in a collation, check if our write server supports it
                if (indexSpecs[i].collation && capabilities && !capabilities.commandsTakeCollation) {
                    throw new MongoError("server/primary/mongos does not support collation");
                }

                for (const name in indexSpecs[i].key) {
                    keys.push(`${name}_${indexSpecs[i].key[name]}`);
                }

                // Set the name
                indexSpecs[i].name = keys.join("_");
            }
        }

        return this.s.db.command({
            createIndexes: this.s.name,
            indexes: indexSpecs
        }, { readPreference: ReadPreference.PRIMARY });
    }

    @classMethod({ callback: true, promise: true })
    async dropIndex(indexName, options = {}) {
        // Run only against primary
        options.readPreference = ReadPreference.PRIMARY;
        // Delete index command
        const cmd = { dropIndexes: this.s.name, index: indexName };
        // Decorate command with writeConcern if supported
        decorateWithWriteConcern(cmd, this, options);
        return this.s.db.command(cmd, options);
    }

    @classMethod({ callback: true, promise: true })
    async dropIndexes(options = {}) {
        await this.dropIndex("*", options);
        return true;
    }

    @classMethod({ callback: true, promise: true })
    async reIndex(options = {}) {
        const cmd = { reIndex: this.s.name };
        decorateWithWriteConcern(cmd, this, options);
        const result = await this.s.db.command(cmd, options);
        return Boolean(result.ok);
    }

    @classMethod({ callback: false, promise: false, returns: [__.CommandCursor] })
    listIndexes(options = {}) {
        options = shallowClone(options);
        options = getReadPreference(this, options, this.s.db, this);
        options.cursorFactory = __.CommandCursor;

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

    @classMethod({ callback: true, promise: true })
    async ensureIndex(fieldOrSpec, options = {}) {
        return this.s.db.ensureIndex(this.s.name, fieldOrSpec, options);
    }

    @classMethod({ callback: true, promise: true })
    async indexExists(indexes) {
        const indexInformation = await this.indexInformation();
        // Let's check for the index names
        if (!is.array(indexes)) {
            return !is.nil(indexInformation[indexes]);
        }
        // Check in list of indexes
        for (let i = 0; i < indexes.length; i++) {
            if (is.nil(indexInformation[indexes[i]])) {
                return false;
            }
        }
        // All keys found
        return true;
    }

    @classMethod({ callback: true, promise: true })
    async indexInformation(options = {}) {
        return this.s.db.indexInformation(this.s.name, options);
    }

    @classMethod({ callback: true, promise: true })
    async count(query = {}, options = {}) {
        const { skip, limit, hint, maxTimeMS } = options;

        const cmd = {
            count: this.s.name,
            query
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

        const result = await this.s.db.command(cmd, options);
        return result.n;
    }

    @classMethod({ callback: true, promise: true })
    async distinct(key, query = {}, options = {}) {
        const { maxTimeMS } = options;

        // Distinct command
        const cmd = {
            distinct: this.s.name,
            key,
            query
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

        const result = await this.s.db.command(cmd, options);
        return result.values;
    }

    @classMethod({ callback: true, promise: true })
    async indexes() {
        return this.s.db.indexInformation(this.s.name, { full: true });
    }

    @classMethod({ callback: true, promise: true })
    async stats(options = {}) {
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

        return this.s.db.command(commandObject, options);
    }

    @classMethod({ callback: true, promise: true })
    async findOneAndDelete(filter, options = {}) {
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }

        // Final options
        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.remove = true;
        // Execute find and Modify
        return this.findAndModify(filter, options.sort, null, finalOptions);
    }

    @classMethod({ callback: true, promise: true })
    async findOneAndReplace(filter, replacement, options = {}) {
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }
        if (is.nil(replacement) || !is.object(replacement)) {
            throw toError("replacement parameter must be an object");
        }

        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.update = true;
        finalOptions.new = is.boolean(options.returnOriginal) ? !options.returnOriginal : false;
        finalOptions.upsert = is.boolean(options.upsert) ? options.upsert : false;

        return this.findAndModify(filter, options.sort, replacement, finalOptions);
    }

    @classMethod({ callback: true, promise: true })
    async findOneAndUpdate(filter, update, options = {}) {
        if (is.nil(filter) || !is.object(filter)) {
            throw toError("filter parameter must be an object");
        }
        if (is.nil(update) || !is.object(update)) {
            throw toError("update parameter must be an object");
        }

        const finalOptions = shallowClone(options);
        finalOptions.fields = options.projection;
        finalOptions.update = true;
        finalOptions.new = is.boolean(options.returnOriginal) ? !options.returnOriginal : false;
        finalOptions.upsert = is.boolean(options.upsert) ? options.upsert : false;
        return this.findAndModify(filter, options.sort, update, finalOptions);
    }

    @classMethod({ callback: true, promise: true })
    async findAndModify(query, sort, doc = null, options = {}) {
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
        return this.s.db.command(queryObject, options);
    }

    @classMethod({ callback: true, promise: true })
    async findAndRemove(query, sort = [], options = {}) {
        // Add the remove option
        options.remove = true;
        // Execute the callback
        return this.findAndModify(query, sort, null, options);
    }

    @classMethod({ callback: true, promise: false })
    aggregate(...args) {
        let pipeline;
        let options;
        if (is.array(args[0])) {
            [pipeline, options = {}] = args;
        } else {
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

        // Set the AggregationCursor constructor
        options.cursorFactory = __.AggregationCursor;

        if (options.cursor) {
            options.cursor = is.object(options.cursor) ? options.cursor : { batchSize: 1000 };

            if (!this.s.topology.capabilities()) {
                throw new MongoError("cannot connect to server");
            }

            if (this.s.topology.capabilities().hasAggregationCursor) {
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

        return this.s.db.command(command, options).then((result) => {
            if (result.err || result.errmsg) {
                throw toError(result);
            }
            if (result.serverPipeline) {
                return result.serverPipeline;
            }
            if (result.stages) {
                return result.stages;
            }
            return result.result;
        });
    }

    @classMethod({ callback: true, promise: true })
    async parallelCollectionScan(options = {}) {
        options = shallowClone(options);
        options.numCursors = options.numCursors || 1;
        options.batchSize = options.batchSize || 1000;
        options = getReadPreference(this, options, this.s.db, this);

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
        const result = await this.s.db.command(commandObject, options);
        if (is.nil(result)) {
            return toError("no result returned for parallelCollectionScan");
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

        return cursors;
    }

    @classMethod({ callback: true, promise: true })
    async geoNear(x, y, options = {}) {
        let point;
        if (is.object(x)) {
            [point, options = {}] = [x, y];
        }

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
        const result = await this.s.db.command(commandObject, options);
        if (result.err || result.errmsg) {
            throw toError(result);
        }
        // should we only be returning res.results here? Not sure if the user
        // should see the other return information
        return result;
    }

    @classMethod({ callback: true, promise: true })
    async geoHaystackSearch(x, y, options = {}) {
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
        const result = await this.s.db.command(commandObject, options);
        if (result.err || result.errmsg) {
            throw toError(result);
        }
        // should we only be returning res.results here? Not sure if the user
        // should see the other return information
        return result;
    }

    @classMethod({ callback: true, promise: true })
    async group(keys, condition, initial, reduce = null, finalize = null, command = null, options = {}) {
        // Make sure we are backward compatible
        if (!is.function(finalize)) {
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
            const result = await this.s.db.command(selector, options);
            return result.retval;
        }

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
        const results = await this.s.db.eval(new Code(groupfn, scope));
        return results.result || results;
    }

    @classMethod({ callback: true, promise: true })
    async mapReduce(map, reduce, options = {}) {
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
        if (
            (options.readPreference !== false && options.readPreference !== "primary") &&
            options.out &&
            (options.out.inline !== 1 && options.out !== "inline")
        ) {
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
        const result = await this.s.db.command(mapCommandHash, { readPreference: options.readPreference });
        // Check if we have an error
        if (result.ok !== 1 || result.err || result.errmsg) {
            throw toError(result);
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
                return result.results;
            }

            return { results: result.results, stats };
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
            return collection;
        }

        return { results: collection, stats };
    }

    @classMethod({ callback: false, promise: false, returns: [bulk.UnorderedBulkOperation] })
    initializeUnorderedBulkOp(options) {
        options = options || {};
        return bulk.initializeUnorderedBulkOp(this.s.topology, this, options);
    }

    @classMethod({ callback: false, promise: false, returns: [bulk.OrderedBulkOperation] })
    initializeOrderedBulkOp(options) {
        options = options || {};
        return bulk.initializeOrderedBulkOp(this.s.topology, this, options);
    }
}

Collection.prototype.removeOne = Collection.prototype.deleteOne;
Collection.define.classMethod("removeOne", { callback: true, promise: true });

Collection.prototype.removeMany = Collection.prototype.deleteMany;
Collection.define.classMethod("removeMany", { callback: true, promise: true });

Collection.prototype.dropAllIndexes = Collection.prototype.dropIndexes;
Collection.define.classMethod("dropAllIndexes", { callback: true, promise: true });
