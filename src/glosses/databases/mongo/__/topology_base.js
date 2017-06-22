const { is, database: { mongo: { MongoError } } } = adone;

const primaryOptions = ["primary", "primaryPreferred", "nearest", "secondaryPreferred"];
const secondaryOptions = ["secondary", "secondaryPreferred"];

export class Store {
    constructor(topology, storeOptions) {
        const storedOps = [];
        storeOptions = storeOptions || { force: false, bufferMaxEntries: -1 };

        this.s = {
            storedOps,
            storeOptions,
            topology
        };
    }

    get length() {
        return this.s.storedOps.length;
    }

    add(opType, ns, ops, options, callback) {
        if (this.s.storeOptions.force) {
            return callback(MongoError.create({ message: "db closed by application", driver: true }));
        }

        if (this.s.storeOptions.bufferMaxEntries === 0) {
            return callback(MongoError.create({
                message: `no connection available for operation and number of stored operation > ${this.s.storeOptions.bufferMaxEntries}`,
                driver: true
            }));
        }

        if (
            this.s.storeOptions.bufferMaxEntries > 0 &&
            this.s.storedOps.length > this.s.storeOptions.bufferMaxEntries
        ) {
            while (this.s.storedOps.length > 0) {
                const op = this.s.storedOps.shift();
                op.c(MongoError.create({
                    message: `no connection available for operation and number of stored operation > ${this.s.storeOptions.bufferMaxEntries}`,
                    driver: true
                }));
            }

            return;
        }

        this.s.storedOps.push({ t: opType, n: ns, o: ops, op: options, c: callback });
    }

    addObjectAndMethod(opType, object, method, params, callback) {
        if (this.s.storeOptions.force) {
            return callback(MongoError.create({ message: "db closed by application", driver: true }));
        }

        if (this.s.storeOptions.bufferMaxEntries === 0) {
            return callback(MongoError.create({
                message: `no connection available for operation and number of stored operation > ${this.s.storeOptions.bufferMaxEntries}`,
                driver: true
            }));
        }

        if (
            this.s.storeOptions.bufferMaxEntries > 0 &&
            this.s.storedOps.length > this.s.storeOptions.bufferMaxEntries
        ) {
            while (this.s.storedOps.length > 0) {
                const op = this.s.storedOps.shift();
                op.c(MongoError.create({
                    message: `no connection available for operation and number of stored operation > ${this.s.storeOptions.bufferMaxEntries}`,
                    driver: true
                }));
            }

            return;
        }

        this.s.storedOps.push({ t: opType, m: method, o: object, p: params, c: callback });
    }

    flush(err) {
        while (this.s.storedOps.length > 0) {
            this.s.storedOps.shift().c(err || MongoError.create({
                message: "no connection available for operation",
                driver: true
            }));
        }
    }

    execute(options) {
        options = options || {};
        // Get current ops
        const ops = this.s.storedOps;
        // Reset the ops
        this.s.storedOps = [];

        // Unpack options
        const executePrimary = is.boolean(options.executePrimary)
            ? options.executePrimary
            : true;
        const executeSecondary = is.boolean(options.executeSecondary)
            ? options.executeSecondary
            : true;

        // Execute all the stored ops
        while (ops.length > 0) {
            const op = ops.shift();

            if (op.t === "cursor") {
                if (executePrimary && executeSecondary) {
                    op.o[op.m].apply(op.o, op.p);
                } else if (
                    executePrimary &&
                    op.o.options &&
                    op.o.options.readPreference &&
                    primaryOptions.includes(op.o.options.readPreference.mode)
                ) {
                    op.o[op.m].apply(op.o, op.p);
                } else if (
                    !executePrimary &&
                    executeSecondary &&
                    op.o.options &&
                    op.o.options.readPreference &&
                    secondaryOptions.includes(op.o.options.readPreference.mode)
                ) {
                    op.o[op.m].apply(op.o, op.p);
                }
            } else if (op.t === "auth") {
                this.s.topology[op.t].apply(this.s.topology, op.o);
            } else {
                if (executePrimary && executeSecondary) {
                    this.s.topology[op.t](op.n, op.o, op.op, op.c);
                } else if (
                    executePrimary &&
                    op.op &&
                    op.op.readPreference &&
                    primaryOptions.includes(op.op.readPreference.mode)
                ) {
                    this.s.topology[op.t](op.n, op.o, op.op, op.c);
                } else if (
                    !executePrimary &&
                    executeSecondary &&
                    op.op &&
                    op.op.readPreference &&
                    secondaryOptions.includes(op.op.readPreference.mode)
                ) {
                    this.s.topology[op.t](op.n, op.o, op.op, op.c);
                }
            }
        }
    }

    all() {
        return this.s.storedOps;
    }
}

export class ServerCapabilities {
    constructor(ismaster) {
        this.ismaster = ismaster;
        this.aggregationCursor = false;
        this.writeCommands = false;
        this.textSearch = false;
        this.authCommands = false;
        this.listCollections = false;
        this.listIndexes = false;
        this._maxNumberOfDocsInBatch = ismaster.maxWriteBatchSize || 1000;
        this._commandsTakeWriteConcern = false;
        this._commandsTakeCollation = false;

        if (ismaster.minWireVersion >= 0) {
            this.textSearch = true;
        }

        if (ismaster.maxWireVersion >= 1) {
            this.aggregationCursor = true;
            this.authCommands = true;
        }

        if (ismaster.maxWireVersion >= 2) {
            this.writeCommands = true;
        }

        if (ismaster.maxWireVersion >= 3) {
            this.listCollections = true;
            this.listIndexes = true;
        }

        if (ismaster.maxWireVersion >= 5) {
            this._commandsTakeWriteConcern = true;
            this._commandsTakeCollation = true;
        }

        // If no min or max wire version set to 0
        if (is.nil(ismaster.minWireVersion)) {
            ismaster.minWireVersion = 0;
        }

        if (is.nil(ismaster.maxWireVersion)) {
            ismaster.maxWireVersion = 0;
        }
    }

    get hasAggregationCursor() {
        return this.aggregationCursor;
    }

    get hasWriteCommands() {
        return this.writeCommands;
    }

    get hasTextSearch() {
        return this.textSearch;
    }

    get hasAuthCommands() {
        return this.authCommands;
    }

    get hasListCollectionsCommand() {
        return this.listCollections;
    }

    get hasListIndexesCommand() {
        return this.listIndexes;
    }

    get minWireVersion() {
        return this.ismaster.minWireVersion;
    }

    get maxWireVersion() {
        return this.ismaster.maxWireVersion;
    }

    get maxNumberOfDocsInBatch() {
        return this._maxNumberOfDocsInBatch;
    }

    get commandsTakeWriteConcern() {
        return this._commandsTakeWriteConcern;
    }

    get commandsTakeCollation() {
        return this._commandsTakeCollation;
    }
}
