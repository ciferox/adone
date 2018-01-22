const {
    assert,
    net: { spdy: transport },
    std: { stream: { Readable } }
} = adone;
const utils = transport.utils;

const debug = require("debug")("spdy:scheduler");

const insertCompare = (a, b) => a.priority === b.priority ? a.stream - b.stream : b.priority - a.priority;

class SchedulerItem {
    constructor(stream, priority) {
        this.stream = stream;
        this.priority = priority;
        this.queue = [];
    }

    push(chunks) {
        this.queue.push(chunks);
    }

    shift() {
        return this.queue.shift();
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}

/**
 * We create following structure in `pending`:
 * [ [ id = 0 ], [ id = 1 ], [ id = 2 ], [ id = 0 ] ]
 *     chunks      chunks      chunks      chunks
 *     chunks                  chunks
 *     chunks
 *
 * Then on the `.tick()` pass we pick one chunks from each item and remove the
 * item if it is empty:
 *
 * [ [ id = 0 ], [ id = 2 ] ]
 *     chunks      chunks
 *     chunks
 *
 * Writing out: chunks for 0, chunks for 1, chunks for 2, chunks for 0
 *
 * This way data is interleaved between the different streams.
 */

export default class Scheduler extends Readable {
    constructor(options) {
        super();

        // Pretty big window by default
        this.window = 0.25;

        if (options && options.window) {
            this.window = options.window;
        }

        this.sync = [];
        this.list = [];
        this.count = 0;
        this.pendingTick = false;
    }

    schedule(data) {
        const priority = data.priority;
        const stream = data.stream;
        const chunks = data.chunks;

        // Synchronous frames should not be interleaved
        if (priority === false) {
            debug("queue sync", chunks);
            this.sync.push(data);
            this.count += chunks.length;

            this._read();
            return;
        }

        debug("queue async priority=%d stream=%d", priority, stream, chunks);
        let item = new SchedulerItem(stream, priority);
        const index = utils.binaryLookup(this.list, item, insertCompare);

        // Push new item
        if (index >= this.list.length || insertCompare(this.list[index], item) !== 0) {
            this.list.splice(index, 0, item);
        } else { // Coalesce
            item = this.list[index];
        }

        item.push(data);

        this.count += chunks.length;

        this._read();
    }

    _read() {
        if (this.count === 0) {
            return;
        }

        if (this.pendingTick) {
            return;
        }
        this.pendingTick = true;

        const self = this;
        process.nextTick(() => {
            self.pendingTick = false;
            self.tick();
        });
    }

    tick() {
        // No luck for async frames
        if (!this.tickSync()) {
            return false;
        }

        return this.tickAsync();
    }

    tickSync() {
        // Empty sync queue first
        const sync = this.sync;
        let res = true;
        this.sync = [];
        for (let i = 0; i < sync.length; i++) {
            const item = sync[i];
            debug("tick sync pending=%d", this.count, item.chunks);
            for (let j = 0; j < item.chunks.length; j++) {
                this.count--;
                res = this.push(item.chunks[j]);
            }
            debug("after tick sync pending=%d", this.count);

            // TODO(indutny): figure out the way to invoke callback on actual write
            if (item.callback) {
                item.callback(null);
            }
        }
        return res;
    }

    tickAsync() {
        let res = true;
        const list = this.list;
        if (list.length === 0) {
            return res;
        }

        let startPriority = list[0].priority;
        for (let index = 0; list.length > 0; index++) {
            // Loop index
            index %= list.length;
            if (startPriority - list[index].priority > this.window) {
                index = 0;
            }
            debug("tick async index=%d start=%d", index, startPriority);

            const current = list[index];
            const item = current.shift();

            if (current.isEmpty()) {
                list.splice(index, 1);
                if (index === 0 && list.length > 0) {
                    startPriority = list[0].priority;
                }
                index--;
            }

            debug("tick async pending=%d", this.count, item.chunks);
            for (let i = 0; i < item.chunks.length; i++) {
                this.count--;
                res = this.push(item.chunks[i]);
            }
            debug("after tick pending=%d", this.count);

            // TODO(indutny): figure out the way to invoke callback on actual write
            if (item.callback) {
                item.callback(null);
            }
            if (!res) {
                break;
            }
        }

        return res;
    }

    dump() {
        this.tickSync();

        // Write everything out
        while (!this.tickAsync()) {
            // Intentional no-op
        }
        assert.equal(this.count, 0);
    }

    // Just for testing, really
    static create(options) {
        return new Scheduler(options);
    }
}
