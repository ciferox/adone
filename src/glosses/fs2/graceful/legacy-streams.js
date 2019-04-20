const Stream = require("stream").Stream;

module.exports = legacy;

function legacy(fs) {
    return {
        ReadStream,
        WriteStream
    };

    function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) {
            return new ReadStream(path, options); 
        }

        Stream.call(this);

        const self = this;

        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;

        this.flags = "r";
        this.mode = 438; /**
                          * =0666
                          */
        this.bufferSize = 64 * 1024;

        options = options || {};

        // Mixin options into this
        const keys = Object.keys(options);
        for (let index = 0, length = keys.length; index < length; index++) {
            const key = keys[index];
            this[key] = options[key];
        }

        if (this.encoding) {
            this.setEncoding(this.encoding); 
        }

        if (!is.undefined(this.start)) {
            if (!is.number(this.start)) {
                throw TypeError("start must be a Number");
            }
            if (is.undefined(this.end)) {
                this.end = Infinity;
            } else if (!is.number(this.end)) {
                throw TypeError("end must be a Number");
            }

            if (this.start > this.end) {
                throw new Error("start must be <= end");
            }

            this.pos = this.start;
        }

        if (!is.null(this.fd)) {
            process.nextTick(() => {
                self._read();
            });
            return;
        }

        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                self.emit("error", err);
                self.readable = false;
                return;
            }

            self.fd = fd;
            self.emit("open", fd);
            self._read();
        });
    }

    function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) {
            return new WriteStream(path, options); 
        }

        Stream.call(this);

        this.path = path;
        this.fd = null;
        this.writable = true;

        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438; /**
                          * =0666
                          */
        this.bytesWritten = 0;

        options = options || {};

        // Mixin options into this
        const keys = Object.keys(options);
        for (let index = 0, length = keys.length; index < length; index++) {
            const key = keys[index];
            this[key] = options[key];
        }

        if (!is.undefined(this.start)) {
            if (!is.number(this.start)) {
                throw TypeError("start must be a Number");
            }
            if (this.start < 0) {
                throw new Error("start must be >= zero");
            }

            this.pos = this.start;
        }

        this.busy = false;
        this._queue = [];

        if (is.null(this.fd)) {
            this._open = fs.open;
            this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
            this.flush();
        }
    }
}
