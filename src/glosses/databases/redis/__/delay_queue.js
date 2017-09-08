const {
    collection,
    noop
} = adone;

export default class DelayQueue {
    constructor() {
        this.queues = new Map();
        this.timeouts = new Map();
    }

    push(bucket, item, options) {
        const callback = options.callback;

        if (!this.queues[bucket]) {
            this.queues[bucket] = new collection.LinkedList();
        }

        const queue = this.queues[bucket];
        queue.push(item);

        if (!this.timeouts[bucket]) {
            this.timeouts[bucket] = setTimeout(() => {
                if (callback) {
                    callback().catch(noop).then(() => {
                        this.timeouts[bucket] = null;
                        this._execute(bucket);
                    });
                } else {
                    this.timeouts[bucket] = null;
                    this._execute(bucket);
                }
            }, options.timeout);
        }
    }

    _execute(bucket) {
        const queue = this.queues[bucket];
        if (!queue) {
            return;
        }
        const length = queue.length;
        if (!length) {
            return;
        }

        this.queues[bucket] = null;
        while (queue.length > 0) {
            queue.shift()();
        }
    }
}
