const {
    is
} = adone;

export default class DataStream extends adone.std.stream.Stream {
    constructor(data) {
        super();
        this.buffer = null;
        this.writable = true;
        this.readable = true;

        // No input
        if (!data) {
            this.buffer = Buffer.alloc(0);
            return this;
        }

        // Stream
        if (is.function(data.pipe)) {
            this.buffer = Buffer.alloc(0);
            data.pipe(this);
            return this;
        }

        // Buffer or String
        // or Object (assumedly a passworded key)
        if (data.length || typeof data === "object") {
            this.buffer = data;
            this.writable = false;
            process.nextTick(() => {
                this.emit("end", data);
                this.readable = false;
                this.emit("close");
            });
            return this;
        }

        throw new TypeError(`Unexpected data type (${typeof data})`);
    }

    write(data) {
        this.buffer = Buffer.concat([this.buffer, Buffer.from(data)]);
        this.emit("data", data);
    }

    end(data) {
        if (data) {
            this.write(data);
        }
        this.emit("end", data);
        this.emit("close");
        this.writable = false;
        this.readable = false;
    }
}
