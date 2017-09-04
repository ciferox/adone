const { event: { EventEmitter }, std, fs, is, collection } = adone;

export default class Tail extends EventEmitter {
    constructor(filename, {
        separator = /[\r]?\n/,
        fsWatchOptions = {},
        fromBeginning = false,
        follow = true,
        useWatchFile = false,
        encoding = "utf8",
        pos
    } = {}) {
        super();
        this._readBlock = this.readBlock.bind(this);
        this.filename = filename;
        this.separator = separator;
        this.fsWatchOptions = fsWatchOptions;
        this.fromBeginning = fromBeginning;
        this.follow = follow;
        this.useWatchFile = useWatchFile;
        this.encoding = encoding;

        this.buffer = "";
        this.internalDispatcher = new EventEmitter();
        this.queue = new collection.LinkedList();
        this.isWatching = false;

        this.internalDispatcher.on("next", () => this.readBlock());

        this.watch(this.fromBeginning ? 0 : pos);
    }

    readBlock() {
        if (!this.queue.empty) {
            const block = this.queue.shift();
            if (block.end > block.start) {
                const stream = fs.createReadStream(this.filename, { start: block.start, end: block.end - 1, encoding: this.encoding });
                stream.on("error", (error) => {
                    this.emit("error", error);
                });
                stream.on("end", () => {
                    if (!this.queue.empty) {
                        this.internalDispatcher.emit("next");
                    }
                });
                stream.on("data", (data) => {
                    this.buffer += data;
                    const parts = this.buffer.split(this.separator);
                    this.buffer = parts.pop();
                    for (const part of parts) {
                        this.emit("line", part);
                    }
                });
            }
        }
    }

    watch(pos) {
        if (this.isWatching) {
            return;
        }
        this.isWatching = true;
        if (is.nil(pos)) {
            this.pos = fs.statSync(this.filename).size;
        } else {
            this.pos = pos;
        }

        if (!this.useWatchFile && std.fs.watch) {
            return this.watcher = std.fs.watch(this.filename, this.fsWatchOptions, (e) => this.watchEvent(e));
        }
        return std.fs.watchFile(this.filename, this.fsWatchOptions, (curr, prev) => this.watchFileEvent(curr, prev));

    }

    watchEvent(e) {
        if (e === "change") {
            const stats = fs.statSync(this.filename);
            if (stats.size < this.pos) { // scenario where texts is not appended but it's actually a w+
                this.pos = stats.size;
            }
            if (stats.size > this.pos) {
                this.queue.push({ start: this.pos, end: stats.size });
                this.pos = stats.size;
                if (this.queue.length === 1) {
                    return this.internalDispatcher.emit("next");
                }
            }
        } else if (e === "rename") {
            this.unwatch();
            if (this.follow) {
                return setTimeout((() => this.watch()), 1000);
            }
            return this.emit("error", `'rename' event for ${this.filename}. File not available.`);
        }
    }


    watchFileEvent(curr, prev) {
        if (curr.size > prev.size) {
            this.queue.push({ start: prev.size, end: curr.size });
            if (this.queue.length === 1) {
                return this.internalDispatcher.emit("next");
            }
        }
    }

    unwatch() {
        if (this.watcher) {
            this.watcher.close();
        } else {
            fs.unwatchFile(this.filename);
        }
        this.isWatching = false;
        return this.queue = new collection.LinkedList();
    }
}
