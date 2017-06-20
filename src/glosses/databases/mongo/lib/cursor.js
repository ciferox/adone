const { is } = adone;
const f = require("util").format;
const formattedOrderClause = require("./utils").formattedOrderClause;
const handleCallback = require("./utils").handleCallback;
const ReadPreference = require("./read_preference");
const MongoError = require("../core").MongoError;
const Readable = require("stream").Readable;
const Define = require("./metadata");
const CoreCursor = require("../core").Cursor;
const Map = adone.data.bson.Map;
const CoreReadPreference = require("../core").ReadPreference;

const flags = ["tailable", "oplogReplay", "noCursorTimeout", "awaitData", "exhaust", "partial"];
const fields = ["numberOfRetries", "tailableRetryInterval"];
const push = Array.prototype.push;

const { metadata } = Define;
const { classMethod } = metadata;

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
            const obj = await this.cursor.nextObject();
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

@metadata("Cursor")
class Cursor extends CoreCursor {
    constructor(bson, ns, cmd, options, topology, topologyOptions) {
        super(bson, ns, cmd, options, topology, topologyOptions);
        const state = Cursor.INIT;
        const streamOptions = {};

        // Tailable cursor options
        const numberOfRetries = options.numberOfRetries || 5;
        const tailableRetryInterval = options.tailableRetryInterval || 500;
        const currentNumberOfRetries = numberOfRetries;

        let promiseLibrary = options.promiseLibrary;

        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

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
            promiseLibrary,
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

    _nextObject(callback) {
        if (this.s.state === Cursor.CLOSED || this.isDead && this.isDead()) {
            return handleCallback(callback, MongoError.create({ message: "Cursor is closed", driver: true }));
        }
        if (this.s.state === Cursor.INIT && this.s.cmd.sort) {
            try {
                this.s.cmd.sort = formattedOrderClause(this.s.cmd.sort);
            } catch (err) {
                return handleCallback(callback, err);
            }
        }

        // Get the next object
        this._next((err, doc) => {
            this.s.state = Cursor.OPEN;
            if (err) {
                return handleCallback(callback, err);
            }
            handleCallback(callback, null, doc);
        });
    }

    @classMethod({ callback: true, promise: true })
    hasNext(callback) {
        if (is.function(callback)) {
            if (this.s.currentDoc) {
                return callback(null, true);
            }
            return this._nextObject((err, doc) => {
                if (!doc) {
                    return callback(null, false);
                }
                this.s.currentDoc = doc;
                callback(null, true);
            });

        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            if (this.s.currentDoc) {
                resolve(true);
            } else {
                this._nextObject((err, doc) => {
                    if (this.s.state === Cursor.CLOSED || this.isDead()) {
                        return resolve(false);
                    }
                    if (err) {
                        return reject(err);
                    }
                    if (!doc) {
                        return resolve(false);
                    }
                    this.s.currentDoc = doc;
                    resolve(true);
                });
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    next(callback) {
        if (is.function(callback)) {
            // Return the currentDoc if someone called hasNext first
            if (this.s.currentDoc) {
                const doc = this.s.currentDoc;
                this.s.currentDoc = null;
                return callback(null, doc);
            }

            // Return the next object
            return this._nextObject(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            // Return the currentDoc if someone called hasNext first
            if (this.s.currentDoc) {
                const doc = this.s.currentDoc;
                this.s.currentDoc = null;
                return resolve(doc);
            }

            this._nextObject((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    filter(filter) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.query = filter;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    maxScan(maxScan) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.maxScan = maxScan;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    hint(hint) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.hint = hint;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    min(min) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.min = min;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    max(max) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.max = max;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    returnKey(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.returnKey = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    showRecordId(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.showDiskLoc = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    snapshot(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.snapshot = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    setCursorOption(field, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!fields.includes(field)) {
            throw MongoError.create({ message: f("option %s not a supported option %s", field, fields), driver: true });
        }
        this.s[field] = value;
        if (field === "numberOfRetries") {
            this.s.currentNumberOfRetries = value;
        }
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    addCursorFlag(flag, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!flags.includes(flag)) {
            throw MongoError.create({ message: f("flag %s not a supported flag %s", flag, flags), driver: true });
        }
        if (!is.boolean(value)) {
            throw MongoError.create({ message: f("flag %s must be a boolean value", flag), driver: true });
        }
        this.s.cmd[flag] = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    addQueryModifier(name, value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (name[0] !== "$") {
            throw MongoError.create({ message: f("%s is not a valid query modifier"), driver: true });
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

    @classMethod({ callback: false, promise: false, fluent: true })
    comment(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.comment = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
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

    @classMethod({ callback: false, promise: false, fluent: true })
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

    @classMethod({ callback: false, promise: false, fluent: true })
    project(value) {
        if (this.s.state === Cursor.CLOSED || this.s.state === Cursor.OPEN || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        this.s.cmd.fields = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
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
            order = new Map(order.map((x) => {
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

    @classMethod({ callback: false, promise: false, fluent: true })
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

    @classMethod({ callback: false, promise: false, fluent: true })
    collation(value) {
        this.s.cmd.collation = value;
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
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

    @classMethod({ callback: false, promise: false, fluent: true })
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
                this._next(callback);
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

    @classMethod({ callback: true, promise: false })
    each(callback) {
        this.rewind();
        this.s.state = Cursor.INIT;
        this._each(callback);
    }

    @classMethod({ callback: true, promise: false })
    forEach(iterator, callback) {
        this.each((err, doc) => {
            if (err) {
                callback(err); return false;
            }
            if (!is.nil(doc)) {
                iterator(doc);
                return true;
            }
            if (is.nil(doc) && callback) {
                const internalCallback = callback;
                callback = null;
                internalCallback(null);
                return false;
            }
        });
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    setReadPreference(r) {
        if (this.s.state !== Cursor.INIT) {
            throw MongoError.create({ message: "cannot change cursor readPreference after cursor has been accessed", driver: true });
        }
        if (r instanceof ReadPreference) {
            this.s.options.readPreference = new CoreReadPreference(r.mode, r.tags, {
                maxStalenessSeconds: r.maxStalenessSeconds
            });
        } else if (is.string(r)) {
            this.s.options.readPreference = new CoreReadPreference(r);
        } else if (r instanceof CoreReadPreference) {
            this.s.options.readPreference = r;
        }

        return this;
    }

    _toArray(callback) {
        const items = [];

        // Reset cursor
        this.rewind();
        this.s.state = Cursor.INIT;

        // Fetch all the documents
        const fetchDocs = () => {
            this._next((err, doc) => {
                if (err) {
                    return handleCallback(callback, err);
                }
                if (is.nil(doc)) {
                    this.s.state = Cursor.CLOSED;
                    return handleCallback(callback, null, items);
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

                    push.apply(items, docs);
                }

                // Attempt a fetch
                fetchDocs();
            });
        };

        fetchDocs();
    }

    @classMethod({ callback: true, promise: true })
    toArray(callback) {
        if (this.s.options.tailable) {
            throw MongoError.create({ message: "Tailable cursor cannot be converted to array", driver: true });
        }

        // Execute using callback
        if (is.function(callback)) {
            return this._toArray(callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._toArray((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _count(applySkipLimit, opts, callback) {
        if (is.function(applySkipLimit)) {
            callback = applySkipLimit;
            applySkipLimit = true;
        }

        if (applySkipLimit) {
            if (is.number(this.cursorSkip())) {
                opts.skip = this.cursorSkip();
            }
            if (is.number(this.cursorLimit())) {
                opts.limit = this.cursorLimit();
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


        if (is.number(opts.maxTimeMS)) {
            command.maxTimeMS = opts.maxTimeMS;
        } else if (this.s.cmd && is.number(this.s.cmd.maxTimeMS)) {
            command.maxTimeMS = this.s.cmd.maxTimeMS;
        }

        // Merge in any options
        if (opts.skip) {
            command.skip = opts.skip;
        }
        if (opts.limit) {
            command.limit = opts.limit;
        }
        if (this.s.options.hint) {
            command.hint = this.s.options.hint;
        }

        // Set cursor server to the same as the topology
        this.server = this.topology;

        // Execute the command
        this.topology.command(f("%s.$cmd", this.s.ns.substr(0, delimiter)), command, (err, result) => {
            callback(err, result ? result.result.n : null);
        }, this.options);
    }

    @classMethod({ callback: true, promise: true })
    count(applySkipLimit = true, opts, callback) {
        if (is.nil(this.s.cmd.query)) {
            throw MongoError.create({ message: "count can only be used with find command", driver: true });
        }
        if (is.function(opts)) {
            [callback, opts] = [opts, {}];
        }
        opts = opts || {};

        if (is.function(callback)) {
            return this._count(applySkipLimit, opts, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._count(applySkipLimit, opts, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    close(callback) {
        this.s.state = Cursor.CLOSED;
        this.kill();
        if (is.function(callback)) {
            return handleCallback(callback, null, this);
        }
        // Return a Promise
        return new this.s.promiseLibrary((resolve) => {
            resolve();
        });
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    map(transform) {
        if (this.cursorState.transforms && this.cursorState.transforms.doc) {
            const oldTransform = this.cursorState.transforms.doc;
            this.cursorState.transforms.doc = (doc) => transform(oldTransform(doc));
        } else {
            this.cursorState.transforms = { doc: transform };
        }
        return this;
    }

    @classMethod({ callback: false, promise: false, returns: [Boolean] })
    isClosed() {
        return this.isDead();
    }

    @classMethod({ callback: false, promise: false })
    destroy(err) {
        if (err) {
            // this.emit("error", err);
        }
        // this.pause();
        // this.close();
    }

    @classMethod({ callback: false, promise: false, returns: [CursorStream] })
    stream(options) {
        return new CursorStream(this, options);
    }

    @classMethod({ callback: true, promise: true })
    explain(callback) {
        this.s.cmd.explain = true;

        // Do we have a readConcern
        if (this.s.cmd.readConcern) {
            delete this.s.cmd.readConcern;
        }

        if (is.function(callback)) {
            return this._next(callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this._next((err, r) => {
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

CoreCursor.prototype._next = CoreCursor.prototype.next;

Cursor.prototype.maxTimeMs = Cursor.prototype.maxTimeMS;
Cursor.define.classMethod("maxTimeMs", { callback: false, promise: false, fluent: true });

Cursor.prototype.nextObject = Cursor.prototype.next;

Cursor.define.classMethod("nextObject", { callback: true, promise: true });

Cursor.prototype.next = Cursor.prototype.nextObject;

Cursor.define.classMethod("next", { callback: true, promise: true });

Cursor.INIT = 0;
Cursor.OPEN = 1;
Cursor.CLOSED = 2;
Cursor.GET_MORE = 3;

module.exports = Cursor;
