const { is } = adone;
const ReadPreference = require("./read_preference");
const MongoError = require("../core").MongoError;
const Define = require("./metadata");
const CoreCursor = require("./cursor");
const CoreReadPreference = require("../core").ReadPreference;
const { metadata } = Define;
const { classMethod } = metadata;

@metadata("CommandCursor")
class CommandCursor extends CoreCursor {
    constructor(bson, ns, cmd, options, topology, topologyOptions) {
        super(bson, ns, cmd, options, topology, topologyOptions);
        const state = CommandCursor.INIT;
        const streamOptions = {};

        const maxTimeMS = null;

        let promiseLibrary = options.promiseLibrary;

        if (!promiseLibrary) {
            promiseLibrary = Promise;
        }

        this.s = {
            maxTimeMS,
            state,
            streamOptions,
            bson,
            ns,
            cmd,
            options,
            topology,
            topologyOptions,
            promiseLibrary
        };
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    setReadPreference(r) {
        if (this.s.state === CommandCursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (this.s.state !== CommandCursor.INIT) {
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

    @classMethod({ callback: false, promise: false, fluent: true })
    batchSize(value) {
        if (this.s.state === CommandCursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!is.number(value)) {
            throw MongoError.create({ message: "batchSize requires an integer", driver: true });
        }
        if (this.s.cmd.cursor) {
            this.s.cmd.cursor.batchSize = value;
        }
        this.setCursorBatchSize(value);
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    maxTimeMS(value) {
        if (this.s.topology.lastIsMaster().minWireVersion > 2) {
            this.s.cmd.maxTimeMS = value;
        }
        return this;
    }
}

// inherits(CommandCursor, Readable);

// Set the methods to inherit from prototype
// const methodsToInherit = ["_next", "next", "hasNext", "each", "forEach", "toArray",
//     "rewind", "bufferedCount", "readBufferedDocuments", "close", "isClosed", "kill", "setCursorBatchSize",
//     "_find", "_getmore", "_killcursor", "isDead", "explain", "isNotified", "isKilled"];

// // Only inherit the types we need
// for (let i = 0; i < methodsToInherit.length; i++) {
//     CommandCursor.prototype[methodsToInherit[i]] = CoreCursor.prototype[methodsToInherit[i]];
// }

CommandCursor.prototype.get = CommandCursor.prototype.toArray;
CommandCursor.define.classMethod("get", { callback: true, promise: false });
CommandCursor.define.classMethod("toArray", { callback: true, promise: true });
CommandCursor.define.classMethod("each", { callback: true, promise: false });
CommandCursor.define.classMethod("forEach", { callback: true, promise: false });
CommandCursor.define.classMethod("next", { callback: true, promise: true });
CommandCursor.define.classMethod("hasNext", { callback: true, promise: true });
CommandCursor.define.classMethod("close", { callback: true, promise: true });
CommandCursor.define.classMethod("isClosed", { callback: false, promise: false, returns: [Boolean] });
CommandCursor.define.classMethod("rewind", { callback: false, promise: false });
CommandCursor.define.classMethod("bufferedCount", { callback: false, promise: false, returns: [Number] });
CommandCursor.define.classMethod("readBufferedDocuments", { callback: false, promise: false, returns: [Array] });

CommandCursor.INIT = 0;
CommandCursor.OPEN = 1;
CommandCursor.CLOSED = 2;

module.exports = CommandCursor;
