const {
    is,
    database: { mongo }
} = adone;
const {
    MongoError,
    ReadPreference
} = mongo;
const {
    Cursor,
    core
} = adone.private(mongo);

export default class CommandCursor extends Cursor {
    constructor(bson, ns, cmd, options, topology, topologyOptions) {
        super(bson, ns, cmd, options, topology, topologyOptions);
        const state = CommandCursor.INIT;
        const streamOptions = {};

        const maxTimeMS = null;

        this.s = {
            maxTimeMS,
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

    setReadPreference(r) {
        if (this.s.state === CommandCursor.CLOSED || this.isDead()) {
            throw MongoError.create({ message: "Cursor is closed", driver: true });
        }
        if (this.s.state !== CommandCursor.INIT) {
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

    maxTimeMS(value) {
        if (this.s.topology.lastIsMaster().minWireVersion > 2) {
            this.s.cmd.maxTimeMS = value;
        }
        return this;
    }
}

CommandCursor.prototype.get = CommandCursor.prototype.toArray;

CommandCursor.INIT = 0;
CommandCursor.OPEN = 1;
CommandCursor.CLOSED = 2;
