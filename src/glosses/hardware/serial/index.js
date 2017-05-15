const { is } = adone;
const DATABITS = Object.freeze([5, 6, 7, 8]);
const STOPBITS = Object.freeze([1, 1.5, 2]);
const PARITY = Object.freeze(["none", "even", "mark", "odd", "space"]);
const FLOWCONTROLS = Object.freeze(["xon", "xoff", "xany", "rtscts"]);

const defaultSettings = Object.freeze({
    autoOpen: true,
    baudRate: 9600,
    dataBits: 8,
    hupcl: true,
    lock: true,
    parity: "none",
    rtscts: false,
    stopBits: 1,
    xany: false,
    xoff: false,
    xon: false,
    highWaterMark: 16 * 1024
});

const defaultSetFlags = Object.freeze({
    brk: false,
    cts: false,
    dtr: true,
    dts: false,
    rts: true
});

const allocNewReadPool = (poolSize) => {
    let pool;
    // performs better on node 6+
    if (Buffer.allocUnsafe) {
        pool = Buffer.allocUnsafe(poolSize);
    } else {
        pool = Buffer.allocUnsafe(poolSize);
    }
    pool.used = 0;
    return pool;
};

export class Port extends adone.std.stream.Duplex {
    constructor(path, options, callback) {
        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        const settings = Object.assign({}, defaultSettings, options);

        super({
            highWaterMark: settings.highWaterMark
        });

        const Binding = settings.binding || adone.hardware.serial.Binding;

        if (!Binding) {
            throw new TypeError('"Bindings" is invalid pass it as `options.binding`');
        }

        if (!path) {
            throw new TypeError(`"path" is not defined: ${path}`);
        }

        if (!is.number(settings.baudRate)) {
            throw new TypeError(`"baudRate" must be a number: ${settings.baudRate}`);
        }

        if (DATABITS.indexOf(settings.dataBits) === -1) {
            throw new TypeError(`"databits" is invalid: ${settings.dataBits}`);
        }

        if (STOPBITS.indexOf(settings.stopBits) === -1) {
            throw new TypeError(`"stopbits" is invalid: ${settings.stopbits}`);
        }

        if (PARITY.indexOf(settings.parity) === -1) {
            throw new TypeError(`"parity" is invalid: ${settings.parity}`);
        }

        FLOWCONTROLS.forEach((control) => {
            if (!is.boolean(settings[control])) {
                throw new TypeError(`"${control}" is not boolean: ${settings[control]}`);
            }
        });

        const binding = new Binding({
            disconnect: this._disconnected.bind(this),
            bindingOptions: settings.bindingOptions
        });

        Object.defineProperties(this, {
            binding: {
                enumerable: true,
                value: binding
            },
            path: {
                enumerable: true,
                value: path
            },
            settings: {
                enumerable: true,
                value: settings
            }
        });

        this.opening = false;
        this.closing = false;
        this._pool = null;
        this._kMinPoolSpace = 128;

        if (this.settings.autoOpen) {
            this.open(callback);
        }
    }

    get isOpen() {
        return this.binding.isOpen && !this.closing;
    }

    get baudRate() {
        return this.settings.baudRate;
    }

    _error(error, callback) {
        if (callback) {
            callback.call(this, error);
        } else {
            this.emit("error", error);
        }
    }

    _asyncError(error, callback) {
        process.nextTick(() => this._error(error, callback));
    }

    open(callback) {
        if (this.isOpen) {
            return this._asyncError(new Error("Port is already open"), callback);
        }

        if (this.opening) {
            return this._asyncError(new Error("Port is opening"), callback);
        }

        this.opening = true;
        this.binding.open(this.path, this.settings).then(() => {
            this.opening = false;
            this.emit("open");
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            this.opening = false;
            this._error(err, callback);
        });
    }

    update(options, callback) {
        if (!is.plainObject(options)) {
            throw new TypeError('"options" is not an object');
        }

        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }

        const settings = Object.assign({}, defaultSettings, options);
        this.settings.baudRate = settings.baudRate;

        this.binding.update(this.settings).then(() => {
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            return this._error(err, callback);
        });
    }

    write(data, encoding, callback) {
        if (adone.is.array(data)) {
            data = Buffer.from(data);
        }
        return super.write(data, encoding, callback);
    }

    _write(data, encoding, callback) {
        if (!this.isOpen) {
            return this.once("open", function afterOpenWrite() {
                this._write(data, encoding, callback);
            });
        }
        this.binding.write(data).then(() => callback(null), callback);
    }

    _writev(data, callback) {
        const datav = data.map((write) => write.chunk);
        data = Buffer.concat(datav);
        this._write(data, null, callback);
    }

    _read(bytesToRead) {
        if (!this.isOpen) {
            this.once("open", () => {
                this._read(bytesToRead);
            });
            return;
        }

        if (!this._pool || this._pool.length - this._pool.used < this._kMinPoolSpace) {
            // discard the old this._pool.
            this._pool = allocNewReadPool(this.settings.highWaterMark);
        }

        // Grab another reference to the pool in the case that while we're
        // in the thread pool another read() finishes up the pool, and
        // allocates a new one.
        const pool = this._pool;
        // Read the smaller of rest of the pool or however many bytes we want
        const toRead = Math.min(pool.length - pool.used, bytesToRead);
        const start = pool.used;

        // the actual read.
        this.binding.read(pool, start, toRead).then((bytesRead) => {
            pool.used += bytesRead;
            this.push(pool.slice(start, start + bytesRead));
        }, this.disconnect);
    }

    _disconnected(err) {
        if (!this.isOpen) {
            return;
        }
        this.emit("disconnect", err);
        this.close();
    }

    close(callback) {
        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }

        this.closing = true;
        this.binding.close().then(() => {
            this.closing = false;
            // TODO should we be calling this.push(null) here?
            this.emit("close");
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            this.closing = false;
            return this._error(err, callback);
        });
    }

    set(options, callback) {
        if (!is.plainObject(options)) {
            throw new TypeError('"options" is not an object');
        }

        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }

        const settings = Object.assign({}, defaultSetFlags, options);
        this.binding.set(settings).then(() => {
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            return this._error(err, callback);
        });
    }

    get(callback) {
        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }

        this.binding.get().then((status) => {
            if (callback) {
                callback.call(this, null, status);
            }
        }, (err) => {
            return this._error(err, callback);
        });
    }

    flush(callback) {
        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }

        this.binding.flush().then(() => {
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            return this._error(err, callback);
        });
    }

    drain(callback) {
        if (!this.isOpen) {
            return this._asyncError(new Error("Port is not open"), callback);
        }
        this.binding.drain().then(() => {
            if (callback) {
                callback.call(this, null);
            }
        }, (err) => {
            return this._error(err, callback);
        });
    }

    static list(callback) {
        return adone.hardware.serial.Binding.list().then((ports) => callback(null, ports), (err) => callback(err));
    }
}

adone.lazify({
    __: () => adone.lazify({
        native: () => adone.bind("serial.node"),
        readUnix: "./__/unix_read",
        BaseBinding: "./__/base"
    }, null, require),
    Binding: () => {
        switch (process.platform) {
            case "win32":
                return require("./__/win32");
            case "darwin":
                return require("./__/darwin");
            default:
                return require("./__/linux");
        }
    },
    MockBinding: "./__/mock",
    parser: () => adone.lazify({
        Delimiter: "./parsers/delimiter",
        Readline: "./parsers/readline",
        ByteLength: "./parsers/byte_length",
        Regex: "./parsers/regex"
    }, null, require)
}, exports, require);
