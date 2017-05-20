export const document = require("./document");
export const schemas = require("./schemas");
const async = require("async");
const bagpipe = require("bagpipe");
export const Index = require("./indexes");
const util = require("util");
const path = require("path");
const _ = require("underscore");
const events = require("events");
const Cursor = require("./cursor");
const levelup = require("levelup");
const hat = require("hat");

const stores = {}; // We have to keep those unique by filename because they're locked

const LEVELUP_RETR_CONCURRENCY = 10; // We'll use that on a bagpipe instance regulating findById


class Model extends events.EventEmitter {
    constructor(name, schema, options) {
        super();

        if (typeof (name) !== "string") {
            throw "model name must be provided and a string";
        }
        if (arguments.length === 1) {
            options = {};
            schema = {};
        }
        if (arguments.length === 2) {
            options = schema;
            schema = {};
        }

        // var self = function Document(raw) {
        //     return document.Document.call(this, self, raw);
        // }; // Call the Document builder
        // _.extend(self, Model.prototype); // Ugly but works - we need to return a function but still inherit prototype
        this.setMaxListeners(0);

        this.modelName = name;
        this.schema = schemas.normalize(schema); // Normalize to allow for short-hands
        this.filename = path.normalize(options.filename || path.join(Model.dbPath || ".", `${name}.db`));
        this.options = _.extend({}, Model.defaults, options);

        // Indexed by field name, dot notation can be used
        // _id is always indexed and since _ids are generated randomly the underlying
        // binary is always well-balanced
        this.indexes = {};
        this.indexes._id = new Index({ fieldName: "_id", unique: true });
        schemas.indexes(schema).forEach((idx) => {
            this.ensureIndex(idx);
        });

        // Concurrency control for 1) index building and 2) pulling objects from LevelUP
        this._pipe = new bagpipe(1);
        this._pipe.pause();
        this._retrQueue = new bagpipe(LEVELUP_RETR_CONCURRENCY);
        this._retrQueue._locked = {};
        this._retrQueue._locks = {}; // Hide those in ._retrQueue
        this._methods = {};

        if (this.options.autoLoad) {
            this.initStore();
        }
    }

    /**
     * Load the store for the set filename
     */
    initStore() {
        const filename = this.filename;

        // LevelUP ; the safety we have here to re-use instance is right now only because of the tests
        this.store = stores[path.resolve(filename)];
        this.store = stores[path.resolve(filename)] = (this.store && this.store.isOpen()) ? this.store : levelup(filename, this.options.store || {});

        this._pipe.resume();
    }

    /**
     * Re-load the database by rebuilding indexes
     */
    reload(cb) {
        const self = this;
        self.emit("reset");
        this.resetIndexes();
        this._pipe.push(this.buildIndexes.bind(this), () => {
            cb(null);
            self.emit("reload");
        });
    }

    /**
     * Define a new static method for our Model
     * And then a instance-specific method
     */
    static(name, fn) {
        if (!Model.prototype.hasOwnProperty(name) && typeof (fn) === "function") {
            this[name] = fn;
        }
    }

    method(name, fn) {
        if (!Model.prototype.hasOwnProperty(name) && typeof (fn) === "function") {
            this._methods[name] = fn;
        }
    }

    /**
     * Build new indexes from a full scan
     */
    buildIndexes(cb) {
        const self = this;

        const toBuild = _.filter(self.indexes, (idx) => {
            return !idx.ready;
        });
        if (!toBuild.length) {
            return setTimeout(() => {
                cb(null);
            });
        }

        // Rebuild the new indexes
        _.each(toBuild, (idx) => {
            idx.reset();
        });

        self.emit("indexesBuild", toBuild);

        self.store.createReadStream()
            .on("data", (data) => {
                const doc = schemas.construct(document.deserialize(data.value), self.schema);
                self.emit("construct", doc);
                self.emit("indexesConstruct", doc, toBuild);
                _.each(toBuild, (idx) => {
                    try {
                        idx.insert(doc);
                    } catch (e) { }
                });
            })
            .on("end", () => {
                _.each(toBuild, (idx) => {
                    idx.ready = true;
                });
                self.emit("indexesReady", toBuild);
                cb(null);
            });
    }


    /**
     * Get an array of all the data in the database
     */
    getAllData() {
        return this.indexes._id.getAll();
    }

    /**
     * Reset all currently defined indexes
     */
    resetIndexes() {
        const self = this;
        Object.keys(this.indexes).forEach((i) => {
            self.indexes[i].reset();
        });
    }

    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it takes
     * We use an async API for consistency with the rest of the code
     * @param {String} options.fieldName
     * @param {Boolean} options.unique
     * @param {Boolean} options.sparse
     * @param {Function} cb Optional callback, signature: err
     */
    ensureIndex(options, cb) {
        const callback = cb || function () { };

        options = options || {};

        if (!options.fieldName) {
            return callback({ missingFieldName: true });
        }
        if (this.indexes[options.fieldName]) {
            return callback(null);
        }

        this.indexes[options.fieldName] = new Index(options);

        callback(null);
    }

    /**
     * Remove an index
     * @param {String} fieldName
     * @param {Function} cb Optional callback, signature: err 
     */
    removeIndex(fieldName, cb) {
        const callback = cb || function () { };

        delete this.indexes[fieldName];
        callback(null);
    }

    /**
     * Add one or several document(s) to all indexes
     */
    addToIndexes(doc) {
        let i, failingIndex, error,
            keys = Object.keys(this.indexes)
        ;

        for (i = 0; i < keys.length; i += 1) {
            try {
                this.indexes[keys[i]].insert(doc);
            } catch (e) {
                failingIndex = i;
                error = e;
                break;
            }
        }

        // If an error happened, we need to rollback the insert on all other indexes
        if (error) {
            for (i = 0; i < failingIndex; i += 1) {
                this.indexes[keys[i]].remove(doc);
            }

            throw error;
        }
    }

    /**
     * Remove one or several document(s) from all indexes
     */
    removeFromIndexes(doc) {
        const self = this;

        Object.keys(this.indexes).forEach((i) => {
            self.indexes[i].remove(doc);
        });
    }

    /**
     * Update one or several documents in all indexes
     * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
     * If one update violates a constraint, all changes are rolled back
     */
    updateIndexes(oldDoc, newDoc) {
        let i, failingIndex, error,
            keys = Object.keys(this.indexes)
        ;

        const skipId = (oldDoc && oldDoc._id) === (newDoc && newDoc._id);

        for (i = 0; i < keys.length; i += 1) {
            try {
                // if (! (skipId && keys[i] == '_id')) this.indexes[keys[i]].update(oldDoc, newDoc);
                this.indexes[keys[i]].update(oldDoc, newDoc);
            } catch (e) {
                failingIndex = i;
                error = e;
                break;
            }
        }

        // If an error happened, we need to rollback the update on all other indexes
        if (error) {
            for (i = 0; i < failingIndex; i += 1) {
                this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
            }

            throw error;
        }
    }

    /**
     * Insert a new document
     * @param {Function} cb Optional callback, signature: err, insertedDoc
     *
     */
    insert(newDoc, cb) {
        const callback = cb || function () { };
        const self = this;

        newDoc = (util.isArray(newDoc) ? newDoc : [newDoc]).map((d) => {
            return new self(d);
        });

        // This is a suboptimal way to do it, but wait for indexes to be up to date in order to avoid mid-insert index reset
        // We also have to ensure indexes are up-to-date
        self._pipe.push(this.buildIndexes.bind(this), () => {
            try {
                self._insertInIdx(newDoc);
            } catch (e) {
                return callback(e);
            }

            // Persist the document
            async.map(newDoc, (d, cb) => {
                self.emit("insert", d);
                d._persist(cb);
            }, (err, docs) => {
                self.emit("inserted", docs);
                callback(err || null, err ? undefined : docs[0]);
            });
        });
    }

    /**
     * Create a new _id that's not already in use
     */
    createNewId() {
        let tentativeId = hat(64);
        if (this.indexes._id.getMatching(tentativeId).length > 0) {
            tentativeId = this.createNewId();
        }
        return tentativeId;
    }

    /**
     * Prepare a document (or array of documents) to be inserted in a database - add _id and check them
     * @api private
     */
    prepareDocumentForInsertion(newDoc) {
        const self = this;

        (util.isArray(newDoc) ? newDoc : [newDoc]).forEach((doc) => {
            if (doc._id === undefined) {
                doc._id = self.createNewId();
            }
            document.checkObject(doc);
        });

        return newDoc;
    }

    /**
     * If newDoc is an array of documents, this will insert all documents in the cache
     * @api private
     */
    _insertInIdx(newDoc) {
        if (util.isArray(newDoc)) {
            this._insertMultipleDocsInIdx(newDoc);
        } else {
            this.addToIndexes(this.prepareDocumentForInsertion(newDoc));
        }
    }

    /**
     * If one insertion fails (e.g. because of a unique constraint), roll back all previous
     * inserts and throws the error
     * @api private
     */
    _insertMultipleDocsInIdx(newDocs) {
        let i, failingI, error,
            preparedDocs = this.prepareDocumentForInsertion(newDocs)
        ;

        for (i = 0; i < preparedDocs.length; i += 1) {
            try {
                this.addToIndexes(preparedDocs[i]);
            } catch (e) {
                error = e;
                failingI = i;
                break;
            }
        }

        if (error) {
            for (i = 0; i < failingI; i += 1) {
                this.removeFromIndexes(preparedDocs[i]);
            }

            throw error;
        }
    }

    /* 
    * Beginning of the public functions
    * 
    * Find a document by ID
    * This function is also used internally after looking up indexes to retrieve docs
    * @param {Object} ID 
    */
    findById(id, callback) {
        return this.findOne({ _id: id }, callback);
    }

    /**
     * Count all documents matching the query
     * @param {Object} query MongoDB-style query
     */
    count(query, callback, quiet) {
        const cursor = new Cursor(this, query);
        cursor._quiet = quiet; // Used in special circumstances, such as sync  
        if (typeof callback === "function") {
            cursor.count(callback);
        }
        return cursor;
    }

    /**
     * Find all documents matching the query
     * If no callback is passed, we return the cursor so that user can limit, skip and finally exec
     * @param {Object} query MongoDB-style query
     */
    find(query, callback, quiet) {
        const cursor = new Cursor(this, query, (err, docs, callback) => {
            return callback(err ? err : null, err ? undefined : docs);
        });

        cursor._quiet = quiet; // Used in special circumstances, such as sync

        if (typeof callback === "function") {
            cursor.exec(callback);
        }
        return cursor;
    }

    /**
     * Find one document matching the query
     * @param {Object} query MongoDB-style query
     */
    findOne(query, callback) {
        const cursor = new Cursor(this, query, (err, docs, callback) => {
            if (err) {
                return callback(err);
            }
            return callback(null, docs.length ? docs[0] : null);
        });

        if (typeof callback === "function") {
            cursor.exec(callback);
        }
        return cursor;
    }

    /**
     * Live query shorthand
     * @param {Object} query MongoDB-style query
     */
    live(query) {
        return this.find(query).live();
    }

    /**
     * Update all docs matching query
     * @param {Object} query
     * @param {Object} updateQuery
     * @param {Object} options Optional options
     *                 options.multi If true, can update multiple documents (defaults to false)
     *                 options.upsert If true, document is inserted if the query doesn't match anything
     * @param {Function} cb Optional callback, signature: err, numReplaced, upsert (set to true if the update was in fact an upsert)
     *
     * @api private Use Model.update which has the same signature
     * 
     * NOTE things are a bit wonky here with atomic updating and lock/unlock mechanisms; I'm not sure how it will fare with deep object
     * updating, since constructing a new document instance via the constructor does shallow copy; but seems it will be OK, since
     * we only do that at the end, when everything is successful
     */
    update(query, updateQuery, options, cb) {
        const self = this;
        let err;


        if (typeof options === "function") {
            cb = options; options = {};
        }
        const callback = _.once(cb || (() => { }));
        const multi = options.multi !== undefined ? options.multi : false;
        const upsert = options.upsert !== undefined ? options.upsert : false;

        const stream = Cursor.getMatchesStream(self, query);
        stream.on("error", (e) => {
            err = e; stream.close(); callback(err);
        });
        stream.on("ids", (ids) => {
            const indexed = ids._indexed;

            // Special case - upsert and no found docs, which means we do an insert
            if (upsert && !ids.length) {
                let toBeInserted;

                if (typeof (updateQuery) === "function") {
                    // updateQuery is a function, we have to initialize schema from query
                    toBeInserted = new self(document.deepCopy(query, true));
                    updateQuery(toBeInserted);
                } else {
                    try {
                        document.checkObject(updateQuery);
                        // updateQuery is a simple object with no modifier, use it as the document to insert
                        toBeInserted = updateQuery;
                    } catch (e) {
                        // updateQuery contains modifiers, use the find query as the base,
                        // strip it from all operators and update it according to updateQuery
                        try {
                            toBeInserted = document.modify(document.deepCopy(query, true), updateQuery);
                        } catch (e) {
                            stream.close(); callback(e);
                        }
                    }
                }

                return self.insert(toBeInserted, (err, newDoc) => {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, 1, newDoc);
                });
            }

            // Go on with our update; treat the error handling gingerly
            const modifications = [];
            stream.on("data", (data) => {
                try {
                    if (!indexed && !document.match(data.val(), query)) {
                        return;
                    } // Not a match, ignore
                } catch (e) {
                    err = e; stream.close(); return;
                }

                try {
                    const val = data.lock(); // we're doing a modification, grab the lock - ensures we get the safe reference to the object until it's unlocked

                    if (typeof (updateQuery) === "function") {
                        updateQuery(val); if (data.id != val._id) {
                            throw "update function cannot change _id";
                        }
                        data.newDoc = val;
                    } else {
                        data.newDoc = document.modify(val, updateQuery);
                    }

                    data.oldDoc = val.copy();
                    _.extend(val, data.newDoc); // IMPORTANT: don't update on .modify, in case we emit an error while modifying
                    modifications.push(data);

                    if (!multi) {
                        stream.close();
                    } // Not a multi update, close after one valid modification
                } catch (e) {
                    err = e; stream.close(); data.unlock(); 
                }
            });

            stream.on("ready", () => {
                if (err) {
                    return callback(err);
                }

                // Change the docs in memory
                try {
                    self.updateIndexes(modifications);
                } catch (e) {
                    return callback(e);
                }

                // Persist document
                async.map(modifications, (d, cb) => {
                    (new self(d.newDoc))._persist((e, doc) => {
                        d.unlock(); cb(e, doc);
                    });
                }, (e, docs) => {
                    if (docs) {
                        self.emit("updated", docs);
                    }

                    callback(e || null,
                        e ? undefined : docs.length,
                        (!e && docs.length) ? docs[0] : undefined
                    );
                });
            });
        });
    }

    /**
     * Save a document - insert it into the DB or update in-place
     * @param {Object} document
     */
    save(docs, cb, quiet) {
        const self = this;
        cb = cb || function () { };

        docs = (Array.isArray(docs) ? docs : [docs]).map((d) => {
            return (d.constructor.modelName == self.modelName) ? d : new self(d);
        });
        this.prepareDocumentForInsertion(docs);

        const existingDocs = {};
        const stream = Cursor.getMatchesStream(this, { _id: { $in: _.chain(docs).pluck("_id").compact().value() } });
        stream.on("error", (err) => {
            stream.close(); cb(err);
        });
        stream.on("data", (d) => {
            existingDocs[d.id] = d.val();
        });
        stream.on("ready", () => {
            const insert = [];
            const modifications = [];
            docs.forEach((d) => {
                modifications.push({ oldDoc: existingDocs[d._id], newDoc: d });
            });

            try {
                self.updateIndexes(modifications);
            } catch (err) {
                return cb(err);
            }

            async.each(modifications, (m, cb) => {
                if (!m.oldDoc && !quiet) {
                    self.emit("insert", m.newDoc);
                }
                m.newDoc._persist(cb, quiet);
            }, (err) => {
                if (err) {
                    return cb(err);
                }

                let inserted = modifications.filter((x) => {
                        return !x.oldDoc;
                    }).map((x) => {
                        return x.newDoc;
                    }),
                    updated = modifications.filter((x) => {
                        return x.oldDoc;
                    }).map((x) => {
                        return x.newDoc;
                    });
                if (inserted.length) {
                    self.emit("inserted", inserted, quiet);
                }
                if (updated.length) {
                    self.emit("updated", updated, quiet);
                }

                cb(null, docs.length <= 1 ? docs[0] : docs, { inserted: inserted.length, updated: updated.length });
            });
        });
    }

    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     * @param {Object} query
     * @param {Object} options Optional options
     *                 options.multi If true, can update multiple documents (defaults to false)
     * @param {Function} cb Optional callback, signature: err, numRemoved
     *
     * @api private Use Model.remove which has the same signature
     */
    remove(query, options, cb) {
        let callback,
            self = this,
            removed = [],
            err
            ;

        if (typeof options === "function") {
            cb = options; options = {};
        }
        callback = cb || function () { };
        const multi = options.multi !== undefined ? options.multi : false;

        let stream = Cursor.getMatchesStream(this, query), indexed;
        stream.on("ids", (ids) => {
            indexed = ids._indexed;
        });
        stream.on("data", (d) => {
            try {
                const v = d.val();
                if ((indexed || document.match(v, query)) && (multi || removed.length === 0)) {
                    removed.push(v._id);
                    self.removeFromIndexes(v);
                    self.emit("remove", v);
                }
            } catch (e) {
                err = e;
            }
        });
        stream.on("ready", () => {
            if (err) {
                return callback(err);
            }

            // Persist in LevelUP; do this after error check
            async.each(removed, (id, cb) => {
                self.store.del(id, cb);
            }, (e) => {
                self.emit("removed", removed);
                callback(e || null, e ? undefined : removed.length);
            });
        });
        stream.on("error", (e) => {
            stream.close();
            callback(e);
        });
    }
}
Model.defaults = { autoIndexing: true, autoLoad: true };

module.exports.Cursor = Cursor;
module.exports.DB = Model;
