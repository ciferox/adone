import adone from "adone";

export const DEFAULT_INITIAL_SIZE = (8 * 1024);
export const DEFAULT_INCREMENT_AMOUNT = (8 * 1024);
export const DEFAULT_FREQUENCY = 1;
export const DEFAULT_CHUNK_SIZE = 1024;

export class ReadableStream extends adone.std.stream.Readable {
    constructor(options = {}) {
        super(options);

        this.stopped = false;

        this.frequency = options.hasOwnProperty("frequency") ? options.frequency : DEFAULT_FREQUENCY;
        this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
        this.incrementAmount = options.incrementAmount || DEFAULT_INCREMENT_AMOUNT;
        const initialSize = options.initialSize || DEFAULT_INITIAL_SIZE;

        this._size = 0;
        this._buffer = new Buffer(initialSize);
    }

    stop() {
        if (this.stopped) {
            throw new Error("stop() called on already stopped ReadableStreamBuffer");
        }
        this.stopped = true;

        if (this._size === 0) {
            this.push(null);
        }
    }

    size() {
        return this._size;
    }

    maxSize() {
        return this._buffer.length;
    }

    put(data, encoding) {
        if (this.stopped) {
            throw new Error("Tried to write data to a stopped ReadableStreamBuffer");
        }

        if (Buffer.isBuffer(data)) {
            this._increaseBufferIfNecessary(data.length);
            data.copy(this._buffer, this._size, 0);
            this._size += data.length;
        } else {
            data = data + "";
            const dataSizeInBytes = Buffer.byteLength(data);
            this._increaseBufferIfNecessary(dataSizeInBytes);
            this._buffer.write(data, this._size, encoding || "utf8");
            this._size += dataSizeInBytes;
        }
    }

    _read() {
        if (!this._sendTimeout) {
            this._sendTimeout = setTimeout(() => this._sendData(), this.frequency);
        }
    }

    _increaseBufferIfNecessary(incomingDataSize) {
        if ((this._buffer.length - this._size) < incomingDataSize) {
            const factor = Math.ceil((incomingDataSize - (this._buffer.length - this._size)) / this.incrementAmount);

            const newBuffer = new Buffer(this._buffer.length + (this.incrementAmount * factor));
            this._buffer.copy(newBuffer, 0, 0, this._size);
            this._buffer = newBuffer;
        }
    }

    _sendData() {
        const amount = Math.min(this.chunkSize, this._size);
        let sendMore = false;

        if (amount > 0) {
            let chunk = null;
            chunk = new Buffer(amount);
            this._buffer.copy(chunk, 0, 0, amount);

            sendMore = this.push(chunk) !== false;

            this._buffer.copy(this._buffer, 0, amount, this._size);
            this._size -= amount;
        }

        if (this._size === 0 && this.stopped) {
            this.push(null);
        }

        if (sendMore) {
            this._sendTimeout = setTimeout(() => this._sendData(), this.frequency);
        } else {
            this._sendTimeout = null;
        }
    }
}

export class WritableStream extends adone.std.stream.Writable {
    constructor(options = { }) {
        options.decodeStrings = true;
        super(options);

        this.incrementAmount = options.incrementAmount || DEFAULT_INCREMENT_AMOUNT;
        const initialSize = options.initialSize || DEFAULT_INITIAL_SIZE;

        this._buffer = new Buffer(initialSize);
        this._size = 0;
    }

    size() {
        return this._size;
    }

    maxSize() {
        return this._buffer.length;
    }

    getContents(length = this._size) {
        if (!this._size) {
            return false;
        }

        const data = new Buffer(Math.min(length, this._size));
        this._buffer.copy(data, 0, 0, data.length);

        if (data.length < this._size) {
            this._buffer.copy(this._buffer, 0, data.length);
        }

        this._size -= data.length;

        return data;
    }

    getContentsAsString(encoding, length) {
        if (!this._size) {
            return false;
        }

        const data = this._buffer.toString(encoding || "utf8", 0, Math.min(length || this._size, this._size));
        const dataLength = Buffer.byteLength(data);

        if (dataLength < this._size) {
            this._buffer.copy(this._buffer, 0, dataLength);
        }

        this._size -= dataLength;
        return data;
    }

    _increaseBufferIfNecessary(incomingDataSize) {
        if ((this._buffer.length - this._size) < incomingDataSize) {
            const factor = Math.ceil((incomingDataSize - (this._buffer.length - this._size)) / this.incrementAmount);

            const newBuffer = new Buffer(this._buffer.length + (this.incrementAmount * factor));
            this._buffer.copy(newBuffer, 0, 0, this._size);
            this._buffer = newBuffer;
        }
    }

    _write(chunk, encoding, callback) {
        this._increaseBufferIfNecessary(chunk.length);
        chunk.copy(this._buffer, this._size, 0);
        this._size += chunk.length;
        callback();
    }
}
