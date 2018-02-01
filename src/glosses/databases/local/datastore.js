const {
    database: {
        local: {
            Persistence, Executor, Index, Cursor, Model
        }
    },
    is,
    exception,
    util,
    text,
    event
} = adone;

export default class Datastore extends event.Emitter {
    constructor(options) {
        super();

        options = options || {};
        const { filename } = options;
        this.inMemoryOnly = options.inMemoryOnly || false;
        this.timestampData = options.timestampData || false;

        // Determine whether in memory or persistent
        if (!filename || !is.string(filename) || filename.length === 0) {
            this.filename = null;
            this.inMemoryOnly = true;
        } else {
            this.filename = filename;
        }

        // String comparison function
        this.compareStrings = options.compareStrings;

        this.persistence = new Persistence({
            db: this,
            afterSerialization: options.afterSerialization,
            beforeDeserialization: options.beforeDeserialization,
            corruptAlertThreshold: options.corruptAlertThreshold
        });

        // This new executor is ready if we don't use persistence
        // If we do, it will only be ready once loadDatabase is called
        this.executor = new Executor();
        if (this.inMemoryOnly) {
            this.executor.ready = true;
        }

        // Indexed by field name, dot notation can be used
        // _id is always indexed and since _ids are generated randomly the underlying
        // binary is always well-balanced
        this.indexes = new Map([
            ["_id", new Index({ fieldName: "_id", unique: true })]
        ]);
        this.ttlIndexes = new Map();
    }

    load() {
        // Load the database from the datafile, and trigger the execution of buffered commands if any
        return new Promise((resolve) => this.executor.push(() => resolve(this.persistence.loadDatabase()), true));
    }

    getAllData() {
        return this.indexes.get("_id").getAll();
    }

    resetIndexes(newData) {
        for (const index of this.indexes.values()) {
            index.reset(newData);
        }
    }

    ensureIndex(options = {}) {
        if (!options.fieldName) {
            const err = new exception.InvalidArgument("Cannot create an index without a fieldName");
            err.missingFieldName = true;
            throw err;
        }
        if (this.indexes.has(options.fieldName)) {
            return;
        }

        const index = new Index(options);
        this.indexes.set(options.fieldName, index);
        if (!is.undefined(options.expireAfterSeconds)) {
            this.ttlIndexes.set(options.fieldName, options.expireAfterSeconds);
        }   // With this implementation index creation is not necessary to ensure TTL but we stick with MongoDB's API here

        try {
            index.insert(this.getAllData());
        } catch (e) {
            this.indexes.delete(options.fieldName);
            throw e;
        }

        // We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
        return this.persistence.persistNewState([{ $$indexCreated: options }]);
    }

    removeIndex(fieldName) {
        this.indexes.delete(fieldName);
        return this.persistence.persistNewState([{ $$indexRemoved: fieldName }]);
    }

    addToIndexes(doc) {
        const inserted = [];
        let error;

        for (const index of this.indexes.values()) {
            try {
                index.insert(doc);
                inserted.push(index);
            } catch (err) {
                error = err;
                break;
            }
        }

        if (error) {
            for (let i = 0; i < inserted.length; ++i) {
                inserted[i].remove(doc);
            }
            throw error;
        }
    }

    removeFromIndexes(doc) {
        for (const index of this.indexes.values()) {
            index.remove(doc);
        }
    }

    updateIndexes(oldDoc, newDoc) {
        const inserted = [];
        let error;

        for (const index of this.indexes.values()) {
            try {
                index.update(oldDoc, newDoc);
                inserted.push(index);
            } catch (err) {
                error = err;
                break;
            }
        }

        if (error) {
            for (let i = 0; i < inserted.length; ++i) {
                inserted[i].revertUpdate(oldDoc, newDoc);
            }
            throw error;
        }
    }

    async getCandidates(query, dontExpireStaleDocs = false) {
        // For a basic match
        const queryKeys = util.keys(query);

        for (let i = 0; i < queryKeys.length; ++i) {
            const k = queryKeys[i];
            const value = query[k];
            if (is.string(value) || is.number(value) || is.boolean(value) || is.date(value) || is.null(value)) {
                if (this.indexes.has(k)) {
                    return this.indexes.get(k).getMatching(value);
                }
            }
        }

        // For a $in match
        for (let i = 0; i < queryKeys.length; ++i) {
            const k = queryKeys[i];
            const value = query[k];
            if (value && value.hasOwnProperty("$in") && this.indexes.has(k)) {
                return this.indexes.get(k).getMatching(value.$in);
            }
        }

        for (let i = 0; i < queryKeys.length; ++i) {
            const k = queryKeys[i];
            const value = query[k];
            if (!value) {
                continue;
            }
            if (value.hasOwnProperty("$lt") || value.hasOwnProperty("$lte") || value.hasOwnProperty("$gt") || value.hasOwnProperty("$gte")) {
                if (this.indexes.has(k)) {
                    return this.indexes.get(k).getBetweenBounds(value);
                }
            }
        }

        // By default, return all the DB data
        const docs = await this.getAllData();

        if (dontExpireStaleDocs) {
            return docs;
        }

        const expiredDocsIds = [];
        const validDocs = [];
        const ttlIndexesFieldNames = [...this.ttlIndexes.keys()];

        for (let i = 0; i < docs.length; ++i) {
            const doc = docs[i];
            let valid = true;
            for (let i = 0; i < ttlIndexesFieldNames.length; ++i) {
                const fieldName = ttlIndexesFieldNames[i];
                if (
                    !is.undefined(doc) &&
                    is.date(doc[fieldName]) &&
                    Date.now() > doc[fieldName].getTime() + this.ttlIndexes.get(fieldName) * 1000
                ) {
                    valid = false;
                }
            }
            if (valid) {
                validDocs.push(doc);
            } else {
                expiredDocsIds.push(doc._id);
            }
        }

        return Promise.all(expiredDocsIds.map((_id) => this._remove({ _id }))).then(() => validDocs);
    }

    async _insert(newDoc) {
        const preparedDoc = this.prepareDocumentForInsertion(newDoc);
        this._insertInCache(preparedDoc);

        await this.persistence.persistNewState(is.array(preparedDoc) ? preparedDoc : [preparedDoc]);
        return Model.deepCopy(preparedDoc);
    }

    createNewId() {
        for (; ;) {
            const id = text.random(16);
            if (this.indexes.get("_id").getMatching(id).length === 0) {
                return id;
            }
        }
    }

    prepareDocumentForInsertion(newDoc) {
        let preparedDoc;

        if (is.array(newDoc)) {
            preparedDoc = newDoc.map((doc) => this.prepareDocumentForInsertion(doc));
        } else {
            preparedDoc = Model.deepCopy(newDoc);
            if (is.undefined(preparedDoc._id)) {
                preparedDoc._id = this.createNewId();
            }
            const now = new Date();
            if (this.timestampData && is.undefined(preparedDoc.createdAt)) {
                preparedDoc.createdAt = now;
            }
            if (this.timestampData && is.undefined(preparedDoc.updatedAt)) {
                preparedDoc.updatedAt = now;
            }
            Model.checkObject(preparedDoc);
        }
        return preparedDoc;
    }

    _insertInCache(preparedDoc) {
        if (is.array(preparedDoc)) {
            this._insertMultipleDocsInCache(preparedDoc);
        } else {
            this.addToIndexes(preparedDoc);
        }
    }

    _insertMultipleDocsInCache(preparedDocs) {
        let failingIndex;
        let error;

        for (let i = 0; i < preparedDocs.length; ++i) {
            try {
                this.addToIndexes(preparedDocs[i]);
            } catch (e) {
                error = e;
                failingIndex = i;
                break;
            }
        }

        if (error) {
            for (let i = 0; i < failingIndex; ++i) {
                this.removeFromIndexes(preparedDocs[i]);
            }

            throw error;
        }
    }

    insert(newDoc) {
        return this.executor.push(() => this._insert(newDoc));
    }

    count(query, { exec = true } = {}) {
        const cursor = new Cursor(this, query, (docs) => docs.length);
        if (exec) {
            return cursor.exec();
        }
        return cursor;
    }

    find(query, projection = {}, { exec = true } = {}) {
        const cursor = new Cursor(this, query, (docs) => docs.map(Model.deepCopy));
        cursor.projection(projection);
        if (exec) {
            return cursor.exec();
        }
        return cursor;
    }

    findOne(query, projection = {}, { exec = true } = {}) {
        const cursor = new Cursor(this, query, (docs) => {
            if (docs.length === 1) {
                return Model.deepCopy(docs[0]);
            }
            return null;
        });

        cursor.projection(projection).limit(1);
        if (exec) {
            return cursor.exec();
        }
        return cursor;
    }

    async _update(query, updateQuery, { multi = false, upsert = false, returnUpdatedDocs = false } = {}) {
        const update = async () => {
            const candidates = await this.getCandidates(query);
            let numReplaced = 0;
            let modifiedDoc;
            const modifications = [];
            let createdAt;
            for (const candidate of candidates) {
                if (Model.match(candidate, query) && (multi || numReplaced === 0)) {
                    numReplaced += 1;
                    if (this.timestampData) {
                        createdAt = candidate.createdAt;
                    }
                    modifiedDoc = Model.modify(candidate, updateQuery);
                    if (this.timestampData) {
                        modifiedDoc.createdAt = createdAt;
                        modifiedDoc.updatedAt = new Date();
                    }
                    modifications.push({ oldDoc: candidate, newDoc: modifiedDoc });
                }
            }
            this.updateIndexes(modifications);
            const updatedDocs = modifications.map((x) => x.newDoc);
            await this.persistence.persistNewState(updatedDocs);

            if (!returnUpdatedDocs) {
                return [numReplaced];
            }

            let updatedDocsDC = updatedDocs.map(Model.deepCopy);

            if (!multi) {
                updatedDocsDC = updatedDocsDC[0];
            }

            return [numReplaced, updatedDocsDC];
        };

        if (!upsert) {
            return update();
        }

        // Need to use an internal function not tied to the executor to avoid deadlock
        const cursor = new Cursor(this, query);
        const docs = await cursor.limit(1).exec();
        if (docs.length === 1) {
            return update();
        }
        let toBeInserted;

        try {
            Model.checkObject(updateQuery);
            // updateQuery is a simple object with no modifier, use it as the document to insert
            toBeInserted = updateQuery;
        } catch (e) {
            // updateQuery contains modifiers, use the find query as the base,
            // strip it from all operators and update it according to updateQuery
            toBeInserted = Model.modify(Model.deepCopy(query, true), updateQuery);
        }

        const updatedDoc = await this._insert(toBeInserted);

        return [1, updatedDoc, true];
    }

    update(...args) {
        return this.executor.push(() => this._update.apply(this, args));
    }

    async _remove(query, { multi = false } = {}) {
        const candidates = await this.getCandidates(query, true);
        let numRemoved = 0;
        const removedDocs = [];
        for (let i = 0; i < candidates.length; ++i) {
            const candidate = candidates[i];
            if (Model.match(candidate, query) && (multi || numRemoved === 0)) {
                numRemoved += 1;
                removedDocs.push({ $$deleted: true, _id: candidate._id });
                this.removeFromIndexes(candidate);
            }
        }

        await this.persistence.persistNewState(removedDocs);

        return numRemoved;
    }

    remove(...args) {
        return this.executor.push(() => this._remove.apply(this, args));
    }
}
