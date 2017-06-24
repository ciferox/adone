const { is, database: { mongo } } = adone;
const { MongoError, __ } = mongo;
const { Cursor, metadata } = __;
const { classMethod } = metadata;

@metadata("AggregationCursor")
export default class AggregationCursor extends Cursor {
    constructor(bson, ns, cmd, options, topology, topologyOptions) {
        super(bson, ns, cmd, options, topology, topologyOptions);

        const state = AggregationCursor.INIT;
        const streamOptions = {};

        this.s = {
            maxTimeMS: null,
            state,
            streamOptions,
            bson,
            ns,
            cmd,
            options,
            topology,
            topologyOptions
        };
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    batchSize(value) {
        if (this.s.state === AggregationCursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (!is.number(value)) {
            throw MongoError.create({ message: "batchSize requires an integer", drvier: true });
        }
        if (this.s.cmd.cursor) {
            this.s.cmd.cursor.batchSize = value;
        }
        this.setCursorBatchSize(value);
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    geoNear(document) {
        this.s.cmd.pipeline.push({ $geoNear: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    group(document) {
        this.s.cmd.pipeline.push({ $group: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    limit(value) {
        this.s.cmd.pipeline.push({ $limit: value });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    match(document) {
        this.s.cmd.pipeline.push({ $match: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    maxTimeMS(value) {
        if (this.s.topology.lastIsMaster().minWireVersion > 2) {
            this.s.cmd.maxTimeMS = value;
        }
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    out(destination) {
        this.s.cmd.pipeline.push({ $out: destination });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    project(document) {
        this.s.cmd.pipeline.push({ $project: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    lookup(document) {
        this.s.cmd.pipeline.push({ $lookup: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    redact(document) {
        this.s.cmd.pipeline.push({ $redact: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    skip(value) {
        this.s.cmd.pipeline.push({ $skip: value });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    sort(document) {
        this.s.cmd.pipeline.push({ $sort: document });
        return this;
    }

    @classMethod({ callback: false, promise: false, fluent: true })
    unwind(field) {
        this.s.cmd.pipeline.push({ $unwind: field });
        return this;
    }
}

AggregationCursor.prototype.get = AggregationCursor.prototype.toArray;

AggregationCursor.define.classMethod("toArray", { callback: true, promise: true });
AggregationCursor.define.classMethod("each", { callback: true, promise: false });
AggregationCursor.define.classMethod("forEach", { callback: true, promise: false });
AggregationCursor.define.classMethod("hasNext", { callback: true, promise: true });
AggregationCursor.define.classMethod("next", { callback: true, promise: true });
AggregationCursor.define.classMethod("close", { callback: true, promise: true });
AggregationCursor.define.classMethod("isClosed", { callback: false, promise: false, returns: [Boolean] });
AggregationCursor.define.classMethod("rewind", { callback: false, promise: false });
AggregationCursor.define.classMethod("bufferedCount", { callback: false, promise: false, returns: [Number] });
AggregationCursor.define.classMethod("readBufferedDocuments", { callback: false, promise: false, returns: [Array] });

AggregationCursor.INIT = 0;
AggregationCursor.OPEN = 1;
AggregationCursor.CLOSED = 2;
