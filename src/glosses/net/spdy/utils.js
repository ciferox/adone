const {
    is
} = adone;

export class QueueItem {
    constructor() {
        this.prev = null;
        this.next = null;
    }
}

export class Queue extends QueueItem {
    constructor() {
        super();

        this.prev = this;
        this.next = this;
    }

    insertTail(item) {
        item.prev = this.prev;
        item.next = this;
        item.prev.next = item;
        item.next.prev = item;
    }

    remove(item) {
        const next = item.next;
        const prev = item.prev;

        item.next = item;
        item.prev = item;
        next.prev = prev;
        prev.next = next;
    }

    head() {
        return this.next;
    }

    tail() {
        return this.prev;
    }

    isEmpty() {
        return this.next === this;
    }

    isRoot(item) {
        return this === item;
    }
}

export class LockStream {
    constructor(stream) {
        this.locked = false;
        this.queue = [];
        this.stream = stream;
    }

    write(chunks, callback) {
        const self = this;

        // Do not let it interleave
        if (this.locked) {
            this.queue.push(() => {
                return self.write(chunks, callback);
            });
            return;
        }

        this.locked = true;

        const done = function (err, chunks) {
            self.stream.removeListener("error", done);

            self.locked = false;
            if (self.queue.length > 0) {
                self.queue.shift()();
            }
            callback(err, chunks);
        };

        this.stream.on("error", done);

        // Accumulate all output data
        const output = [];
        const onData = function (chunk) {
            output.push(chunk);
        };
        this.stream.on("data", onData);

        const next = function (err) {
            self.stream.removeListener("data", onData);
            if (err) {
                return done(err);
            }

            done(null, output);
        };

        let i;
        for (i = 0; i < chunks.length - 1; i++) {
            this.stream.write(chunks[i]);
        }

        if (chunks.length > 0) {
            this.stream.write(chunks[i], next);
        } else {
            process.nextTick(next);
        }

        if (this.stream.execute) {
            this.stream.execute((err) => {
                if (err) {
                    return done(err);
                }
            });
        }
    }
}

// Just finds the place in array to insert
export const binaryLookup = function (list, item, compare) {
    let start = 0;
    let end = list.length;

    while (start < end) {
        const pos = (start + end) >> 1;
        const cmp = compare(item, list[pos]);

        if (cmp === 0) {
            start = pos;
            end = pos;
            break;
        } else if (cmp < 0) {
            end = pos;
        } else {
            start = pos + 1;
        }
    }

    return start;
};

export const binaryInsert = function (list, item, compare) {
    const index = binaryLookup(list, item, compare);

    list.splice(index, 0, item);
};

export const binarySearch = function (list, item, compare) {
    const index = binaryLookup(list, item, compare);

    if (index >= list.length) {
        return -1;
    }

    if (compare(item, list[index]) === 0) {
        return index;
    }

    return -1;
};

export class Timeout {
    constructor(object) {
        this.delay = 0;
        this.timer = null;
        this.object = object;
    }

    set(delay, callback) {
        this.delay = delay;
        this.reset();
        if (!callback) {
            return;
        }

        if (this.delay === 0) {
            this.object.removeListener("timeout", callback);
        } else {
            this.object.once("timeout", callback);
        }
    }

    reset() {
        if (!is.null(this.timer)) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.delay === 0) {
            return;
        }

        const self = this;
        this.timer = setTimeout(() => {
            self.timer = null;
            self.object.emit("timeout");
        }, this.delay);
    }
}
