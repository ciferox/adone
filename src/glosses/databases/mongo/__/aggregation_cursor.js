const { is, database: { mongo } } = adone;
const { MongoError, __ } = mongo;
const { Cursor } = __;

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

    geoNear(document) {
        this.s.cmd.pipeline.push({ $geoNear: document });
        return this;
    }

    group(document) {
        this.s.cmd.pipeline.push({ $group: document });
        return this;
    }

    limit(value) {
        this.s.cmd.pipeline.push({ $limit: value });
        return this;
    }

    match(document) {
        this.s.cmd.pipeline.push({ $match: document });
        return this;
    }

    maxTimeMS(value) {
        if (this.s.topology.lastIsMaster().minWireVersion > 2) {
            this.s.cmd.maxTimeMS = value;
        }
        return this;
    }

    out(destination) {
        this.s.cmd.pipeline.push({ $out: destination });
        return this;
    }

    project(document) {
        this.s.cmd.pipeline.push({ $project: document });
        return this;
    }

    lookup(document) {
        this.s.cmd.pipeline.push({ $lookup: document });
        return this;
    }

    redact(document) {
        this.s.cmd.pipeline.push({ $redact: document });
        return this;
    }

    skip(value) {
        this.s.cmd.pipeline.push({ $skip: value });
        return this;
    }

    sort(document) {
        this.s.cmd.pipeline.push({ $sort: document });
        return this;
    }

    unwind(field) {
        this.s.cmd.pipeline.push({ $unwind: field });
        return this;
    }
}

AggregationCursor.prototype.get = AggregationCursor.prototype.toArray;

AggregationCursor.INIT = 0;
AggregationCursor.OPEN = 1;
AggregationCursor.CLOSED = 2;
