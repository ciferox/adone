const {
    database: {
        local: {
            Storage, Model, Index
        }
    },
    is, x, identity, fs, util
} = adone;

export default class Persistence {
    constructor({ db, corruptAlertThreshold = null, afterSerialization = null, beforeDeserialization = null }) {
        this.db = db;
        this.inMemoryOnly = this.db.inMemoryOnly;
        this.filename = this.db.filename;
        this.corruptAlertThreshold = is.null(corruptAlertThreshold) ? 0.1 : corruptAlertThreshold;

        if (!this.inMemoryOnly && this.filename && this.filename[this.filename.length - 1] === "~") {
            throw new x.InvalidArgument("The datafile name can't end with a ~, which is reserved for crash safe backup files");
        }

        // After serialization and before deserialization hooks with some basic sanity checks
        if (afterSerialization && !beforeDeserialization) {
            throw new x.IllegalState("Serialization hook defined but deserialization hook undefined, cautiously refusing to start to prevent dataloss");
        }
        if (!afterSerialization && beforeDeserialization) {
            throw new x.IllegalState("Serialization hook undefined but deserialization hook defined, cautiously refusing to start to prevent dataloss");
        }
        this.afterSerialization = afterSerialization || identity;
        this.beforeDeserialization = beforeDeserialization || identity;
    }

    /*
     * This serves as a compaction function since the cache always contains only the number of documents in the collection
     * while the data file is append-only so it may grow larger
     */
    async persistCachedDatabase() {
        if (this.inMemoryOnly) {
            return;
        }

        let toPersist = "";

        const docs = this.db.getAllData();

        for (let i = 0; i < docs.length; ++i) {
            toPersist += `${this.afterSerialization(Model.serialize(docs[i]))}\n`;
        }

        for (const [fieldName, index] of this.db.indexes.entries()) {
            if (fieldName !== "_id") {   // The special _id index is managed by datastore.js, the others need to be persisted
                toPersist += `${this.afterSerialization(Model.serialize({
                    $$indexCreated: {
                        fieldName,
                        unique: index.unique,
                        sparse: index.sparse
                    }
                }))}\n`;
            }
        }

        return Storage.crashSafeWriteFile(this.filename, toPersist);
    }

    compactDatafile() {
        return this.db.executor.push(() => this.persistCachedDatabase());
    }

    setAutocompactionInterval(interval) {
        const minInterval = 5000;
        const realInterval = Math.max(interval || 0, minInterval);

        this.stopAutocompaction();

        this.autocompactionIntervalId = setInterval(() => this.compactDatafile(), realInterval);
    }

    stopAutocompaction() {
        if (this.autocompactionIntervalId) {
            clearInterval(this.autocompactionIntervalId);
        }
    }

    async persistNewState(newDocs) {
        if (this.inMemoryOnly) {
            return;
        }

        let toPersist = "";

        for (let i = 0; i < newDocs.length; ++i) {
            toPersist += `${this.afterSerialization(Model.serialize(newDocs[i]))}\n`;
        }

        if (toPersist.length === 0) {
            return;
        }

        await fs.appendFile(this.filename, toPersist, "utf8");
    }

    treatRawData(rawData) {
        const data = rawData.split("\n");
        let corruptItems = -1;  // Last line of every data file is usually blank so not really corrupt
        const dataById = {};
        const indexes = {};
        for (let i = 0; i < data.length; ++i) {
            const rawDoc = data[i];
            try {
                const doc = Model.deserialize(this.beforeDeserialization(rawDoc));
                if (doc._id) {
                    if (doc.$$deleted === true) {
                        delete dataById[doc._id];
                    } else {
                        dataById[doc._id] = doc;
                    }
                } else if (doc.$$indexCreated && !is.undefined(doc.$$indexCreated.fieldName)) {
                    indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
                } else if (is.string(doc.$$indexRemoved)) {
                    delete indexes[doc.$$indexRemoved];
                }
            } catch (err) {
                ++corruptItems;
            }
        }

        // A bit lenient on corruption
        if (data.length > 0 && corruptItems / data.length > this.corruptAlertThreshold) {
            throw new x.IllegalState(`More than ${Math.floor(100 * this.corruptAlertThreshold)} % of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start DB to prevent dataloss`);
        }

        return { data: util.values(dataById), indexes };
    }

    /**
     * Load the database
     * 1) Create all indexes
     * 2) Insert all data
     * 3) Compact the database
     * This means pulling data out of the data file or creating it if it doesn't exist
     * Also, all data is persisted right away, which has the effect of compacting the database file
     * This operation is very quick at startup for a big collection (60ms for ~10k docs)
     */
    async loadDatabase() {
        this.db.resetIndexes();

        if (this.inMemoryOnly) {
            return;
        }

        await Persistence.ensureDirectoryExists(adone.std.path.dirname(this.filename));

        await Storage.ensureDatafileIntegrity(this.filename);

        const rawData = await fs.readFile(this.filename, { encoding: "utf-8" });
        const treatedData = this.treatRawData(rawData);

        const indexes = util.keys(treatedData.indexes);
        for (let i = 0; i < indexes.length; ++i) {
            this.db.indexes.set(indexes[i], new Index(treatedData.indexes[indexes[i]]));
        }

        try {
            this.db.resetIndexes(treatedData.data);
        } catch (err) {
            this.db.resetIndexes();
            throw err;
        }

        await this.db.persistence.persistCachedDatabase();

        this.db.executor.processBuffer();
    }

    static ensureDirectoryExists(dir) {
        return adone.fs.mkdirp(dir);
    }
}
