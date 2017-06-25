const { is, database: { mongo }, std: { stream: { Readable } } } = adone;
const { __, MongoError, core, ReadPreference } = mongo;
const { utils: { formattedOrderClause, handleCallback } } = __;

const flags = ["tailable", "oplogReplay", "noCursorTimeout", "awaitData", "exhaust", "partial"];
const fields = ["numberOfRetries", "tailableRetryInterval"];

class CursorStream extends Readable {
    constructor(cursor, opts) {
        super(Object.assign({}, opts, { objectMode: true }));
        this.cursor = cursor;
        this.cursor.once("close", () => {
            this.emit("close");
            this.push(null);
        });
    }

    async _read() {
        const { cursor } = this;
        // eslint-disable-next-line no-use-before-define
        if (cursor.s.state === Cursor.CLOSED || cursor.isDead()) {
            return this.push(null);
        }

        try {
            const obj = await this.cursor.next();
            if (is.function(cursor.s.streamOptions.transform) && !is.null(obj)) {
                return this.push(cursor.s.streamOptions.transform(obj));
            }
            if (cursor.cursorState.transforms && is.function(cursor.cursorState.transforms.doc) && !is.null(obj)) {
                return this.push(cursor.cursorState.transforms.doc(obj));
            }
            this.push(obj);
        } catch (err) {
            process.nextTick(() => {
                this.emit("error", err);
                this.push(null); // ?
            });
        }
    }
}

export default class Cursor extends core.Cursor {
    constructor(bson, ns, cmd, options, topology, topologyOptions) {
        super(bson, ns, cmd, options, topology, topologyOptions);
        const state = Cursor.INIT;
        const streamOptions = {};

        // Tailable cursor options
        const numberOfRetries = options.numberOfRetries || 5;
        const tailableRetryInterval = options.tailableRetryInterval || 500;
        const currentNumberOfRetries = numberOfRetries;

        this.s = {
            numberOfRetries,
            tailableRetryInterval,
            currentNumberOfRetries,
            state,
            streamOptions,
            bson,
            ns,
            cmd,
            options,
            topology,
            topologyOptions,
            currentDoc: null
        };

        // Translate correctly
        if (this.s.options.noCursorTimeout === true) {
            this.addCursorFlag("noCursorTimeout", true);
        }

        // Set the sort value
        this.sortValue = this.s.cmd.sort;

        // Get the batchSize
        const batchSize = cmd.cursor && cmd.cursor.batchSize
            ? cmd.cursor && cmd.cursor.batchSize
            : (options.cursor && options.cursor.batchSize ? options.cursor.batchSize : 1000);

        // Set the batchSize
        this.setCursorBatchSize(batchSize);
    }

    _nextObject() {
        return new Promise((resolve, reject) => {
            if (this.s.state === Cursor.CLOSED || this.isDead && this.isDead()) {
                return reject(MongoError.create({ message: "Cursor is closed", driver: true }));
            }
            if (this.s.state === Cursor.INIT && this.s.cmd.sort) {
                this.s.cmd.sort = formattedOrderClause(this.s.cmd.sort);
            }

            // Get the next object
            super.next((err, doc) => {
                this.s.state = Cursor.OPEN;
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            });
        });
    }

    async hasNext() {
        if (this.s.currentDoc) {
            return true;
        }
        try {
            const doc = await this._nextObject();
            if (!doc) {
                return false;
            }
            this.s.currentDoc = doc;
            return true;
        } catch (err) {
            if (this.s.state === Cursor.CLOSED || this.isDead()) {
                return false;
            }
            throw err;
        }
    }

    next(callback) {
        // have to have callback support for the core
        if (is.function(callback)) {
            // Return the currentDoc if someone called hasNext first
            if (this.s.currentDoc) {
                const doc = this.s.currentDoc;
                this.s.currentDoc = null;
                return callback(null, doc);
            }

            // Return the next object
            return this._nextObject().then((r) => callback(null, r), callback);
        }

        return new Promise((resolve) => {
            // Return the currentDoc if someone called hasNext first
            if (this.s.currentDoc) {
                const doc = this.s.currentDoc;
                this.s.currentDoc = null;
                return resolve(doc);
            }
            resolve(this._nextObject());
        });
    }

    filter(filter) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.query = filter;
        return this;
    }

    maxScan(maxScan) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.maxScan = maxScan;
        return this;
    }

    hint(hint) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.hint = hint;
        return this;
    }

    min(min) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.min = min;
        return this;
    }

    max(max) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.max = max;
        return this;
    }

    returnKey(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.returnKey = value;
        return this;
    }

    showRecordId(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.showDiskLoc = value;
        return this;
    }

    snapshot(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.snapshot = value;
        return this;
    }

    setCursorOption(field, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!fields.includes(field)) {
            throw MongoError.create({ message: `option ${field} not a supported option ${fields.join(", ")}`, driver: true });
        }
        this.s[field] = value;
        if (field === "numberOfRetries") {
            this.s.currentNumberOfRetries = value;
        }
        return this;
    }

    addCursorFlag(flag, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!flags.includes(flag)) {
            throw MongoError.create({ message: `flag ${flag} not a supported flag ${flags.join(", ")}`, driver: true });
        }
        if (!is.boolean(value)) {
            throw MongoError.create({ message: `flag ${flag} must be a boolean value`, driver: true });
        }
        this.s.cmd[flag] = value;
        return this;
    }

    addQueryModifier(name, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (name[0] !== "$") {
            throw MongoError.create({ message: `${name} is not a valid query modifier`, driver: true });
        }
        // Strip of the $
        const field = name.substr(1);
        // Set on the command
        this.s.cmd[field] = value;
        // Deal with the special case for sort
        if (field === "orderby") {
            this.s.cmd.sort = this.s.cmd[field];
        }
        return this;
    }

    comment(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.comment = value;
        return this;
    }

    maxAwaitTimeMS(value) {
        if (!is.number(value)) {
            throw MongoError.create({ message: "maxAwaitTimeMS must be a number", driver: true });
        }
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.maxAwaitTimeMS = value;
        return this;
    }

    maxTimeMS(value) {
        if (!is.number(value)) {
            throw MongoError.create({ message: "maxTimeMS must be a number", driver: true });
        }
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.maxTimeMS = value;
        return this;
    }

    project(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.fields = value;
        return this;
    }

    sort(keyOrList, direction) {
        if (this.s.options.tailable) {
            throw MongoError.create({ message: "Tailable cursor doesn't support sorting", driver: true });
        }
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        let order = keyOrList;

        // We have an array of arrays, we need to preserve the order of the sort
        // so we will us a Map
        if (is.array(order) && is.array(order[0])) {
            order = new mongo.Map(order.map((x) => {
                const value = [x[0], null];
                if (x[1] === "asc") {
                    value[1] = 1;
                } else if (x[1] === "desc") {
                    value[1] = -1;
                } else if (x[1] === 1 || x[1] === -1) {
                    value[1] = x[1];
                } else {
                    throw new MongoError("Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]");
                }

                return value;
            }));
        }

        if (!is.nil(direction)) {
            order = [[keyOrList, direction]];
        }

        this.s.cmd.sort = order;
        this.sortValue = order;
        return this;
    }

    batchSize(value) {
        if (this.s.options.tailable) {
            throw MongoError.create({ message: "Tailable cursor doesn't support batchSize", driver: true });
        }
        if (this.s.state === Cursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!is.number(value)) {
            throw MongoError.create({ message: "batchSize requires an integer", driver: true });
        }
        this.s.cmd.batchSize = value;
        this.setCursorBatchSize(value);
        return this;
    }

    collation(value) {
        this.s.cmd.collation = value;
        return this;
    }

    limit(value) {
        if (this.s.options.tailable) {
            throw MongoError.create({ message: "Tailable cursor doesn't support limit", driver: true });
        }
        if (this.s.state === Cursor.OPEN || this.s.state === Cursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!is.number(value)) {
            throw MongoError.create({ message: "limit requires an integer", driver: true });
        }
        this.s.cmd.limit = value;
        // this.cursorLimit = value;
        this.setCursorLimit(value);
        return this;
    }

    skip(value) {
        if (this.s.options.tailable) {
            throw MongoError.create({ message: "Tailable cursor doesn't support skip", driver: true });
        }
        if (this.s.state === Cursor.OPEN || this.s.state === Cursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!is.number(value)) {
            throw MongoError.create({ message: "skip requires an integer", driver: true });
        }
        this.s.cmd.skip = value;
        this.setCursorSkip(value);
        return this;
    }

    _each(callback) {
        if (!callback) {
            throw MongoError.create({ message: "callback is mandatory", driver: true });
        }
        if (this.isNotified()) {
            return;
        }
        if (this.s.state === Cursor.CLOSED || this.isDead()) {
            return handleCallback(callback, MongoError.create({ message: "Cursor is closed", driver: true }));
        }

        if (this.s.state === Cursor.INIT) {
            this.s.state = Cursor.OPEN;
        }

        if (this.bufferedCount() > 0) {
            do {
                super.next(callback);
            } while (this.bufferedCount() !== 0);
            this._each(callback);
        } else {
            this.next((err, item) => {
                if (err) {
                    return handleCallback(callback, err);
                }
                if (is.nil(item)) {
                    this.s.state = Cursor.CLOSED;
                    return handleCallback(callback, null, null);
                }

                if (handleCallback(callback, null, item) === false) {
                    return;
                }
                this._each(callback);
            });
        }
    }

    each(callback) {
        this.rewind();
        this.s.state = Cursor.INIT;
        this._each(callback);
    }

    forEach(iterator) {
        return new Promise((resolve, reject) => {
            this.each((err, doc) => {
                if (err) {
                    reject(err);
                    return false;
                }
                if (!is.nil(doc)) {
                    try {
                        iterator(doc);
                    } catch (err) {
                        reject(err);
                        return false;
                    }
                    return true;
                }
                if (is.nil(doc)) {
                    resolve();
                    return false;
                }
            });
        });
    }

    setReadPreference(r) {
        if (this.s.state !== Cursor.INIT) {
            throw MongoError.create({ message: "cannot change cursor readPreference after cursor has been accessed", driver: true });
        }
        if (r instanceof ReadPreference) {
            this.s.options.readPreference = new core.ReadPreference(r.mode, r.tags, {
                maxStalenessSeconds: r.maxStalenessSeconds
            });
        } else if (is.string(r)) {
            this.s.options.readPreference = new core.ReadPreference(r);
        } else if (r instanceof core.ReadPreference) {
            this.s.options.readPreference = r;
        }

        return this;
    }

    toArray() {
        return new Promise((resolve, reject) => {
            if (this.s.options.tailable) {
                return reject(MongoError.create({ message: "Tailable cursor cannot be converted to array", driver: true }));
            }

            const items = [];

            // Reset cursor
            this.rewind();
            this.s.state = Cursor.INIT;

            // Fetch all the documents
            const fetchDocs = () => {
                super.next((err, doc) => {
                    if (err) {
                        return reject(err);
                    }
                    if (is.nil(doc)) {
                        this.s.state = Cursor.CLOSED;
                        return resolve(items);
                    }

                    // Add doc to items
                    items.push(doc);

                    // Get all buffered objects
                    if (this.bufferedCount() > 0) {
                        let docs = this.readBufferedDocuments(this.bufferedCount());

                        // Transform the doc if transform method added
                        if (this.s.transforms && is.function(this.s.transforms.doc)) {
                            docs = docs.map(this.s.transforms.doc);
                        }

                        items.push(...docs);
                    }

                    // Attempt a fetch
                    fetchDocs();
                });
            };

            fetchDocs();
        });
    }

    async count(applySkipLimit = true, options = {}) {
        if (is.nil(this.s.cmd.query)) {
            throw MongoError.create({ message: "count can only be used with find command", driver: true });
        }

        if (applySkipLimit) {
            if (is.number(this.cursorSkip())) {
                options.skip = this.cursorSkip();
            }
            if (is.number(this.cursorLimit())) {
                options.limit = this.cursorLimit();
            }
        }

        // Command
        const delimiter = this.s.ns.indexOf(".");

        const command = {
            count: this.s.ns.substr(delimiter + 1), query: this.s.cmd.query
        };

        // Apply a readConcern if set
        if (this.s.cmd.readConcern) {
            command.readConcern = this.s.cmd.readConcern;
        }

        // Apply a hint if set
        if (this.s.cmd.hint) {
            command.hint = this.s.cmd.hint;
        }


        if (is.number(options.maxTimeMS)) {
            command.maxTimeMS = options.maxTimeMS;
        } else if (this.s.cmd && is.number(this.s.cmd.maxTimeMS)) {
            command.maxTimeMS = this.s.cmd.maxTimeMS;
        }

        // Merge in any options
        if (options.skip) {
            command.skip = options.skip;
        }
        if (options.limit) {
            command.limit = options.limit;
        }
        if (this.s.options.hint) {
            command.hint = this.s.options.hint;
        }

        // Set cursor server to the same as the topology
        this.server = this.topology;

        return new Promise((resolve, reject) => {
            this.topology.command(`${this.s.ns.substr(0, delimiter)}.$cmd`, command, (err, result) => {
                err ? reject(err) : resolve(result ? result.result.n : null);
            }, this.options);
        });
    }

    close() {
        this.s.state = Cursor.CLOSED;
        this.kill();
    }

    map(transform) {
        if (this.cursorState.transforms && this.cursorState.transforms.doc) {
            const oldTransform = this.cursorState.transforms.doc;
            this.cursorState.transforms.doc = (doc) => transform(oldTransform(doc));
        } else {
            this.cursorState.transforms = { doc: transform };
        }
        return this;
    }

    isClosed() {
        return this.isDead();
    }

    destroy(err) {
        if (err) {
            // this.emit("error", err);
        }
        // this.pause();
        // this.close();
    }

    stream(options) {
        return new CursorStream(this, options);
    }

    explain() {
        this.s.cmd.explain = true;

        // Do we have a readConcern
        if (this.s.cmd.readConcern) {
            delete this.s.cmd.readConcern;
        }

        return new Promise((resolve, reject) => {
            super.next((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    get readPreference() {
        if (!this || !this.s) {
            return null;
        }

        return this.s.options.readPreference;
    }

    get namespace() {
        if (!this || !this.s) {
            return null;
        }

        // TODO: refactor this logic into core
        const ns = this.s.ns || "";
        const firstDot = ns.indexOf(".");
        if (firstDot < 0) {
            return {
                database: this.s.ns,
                collection: ""
            };
        }
        return {
            database: ns.substr(0, firstDot),
            collection: ns.substr(firstDot + 1)
        };
    }
}

Cursor.prototype.maxTimeMs = Cursor.prototype.maxTimeMS;
Cursor.prototype.nextObject = Cursor.prototype.next;

Cursor.INIT = 0;
Cursor.OPEN = 1;
Cursor.CLOSED = 2;
Cursor.GET_MORE = 3;
