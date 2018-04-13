const genobj = require("generate-object-property");
const genfun = require("generate-function");

const {
    is,
    std,
    identity
} = adone;

const toFunction = function (list) {
    list = list.slice();
    return function (_, cb) {
        let err = null;
        let item = list.length ? list.shift() : null;
        if (item instanceof Error) {
            err = item;
            item = null;
        }

        cb(err, item);
    };
};

const ctor = function (opts, read) {
    if (is.function(opts)) {
        read = opts;
        opts = {};
    }

    opts = opts || {};

    class Class extends adone.std.stream.Readable {
        constructor(override) {
            super(override || opts);

            const self = this;
            const hwm = this._readableState.highWaterMark;
            const check = function (err, data) {
                if (self.destroyed) {
                    return;
                }
                if (err) {
                    return self.destroy(err);
                }
                if (is.null(data)) {
                    return self.push(null);
                }
                self._reading = false;
                if (self.push(data)) {
                    self._read(hwm);
                }
            };

            this._reading = false;
            this._callback = check;
            this.destroyed = false;
        }

        _read(size) {
            if (this._reading || this.destroyed) {
                return;
            }
            this._reading = true;
            this._from(size, this._callback);
        }

        destroy(err) {
            if (this.destroyed) {
                return;
            }
            this.destroyed = true;
            const self = this;
            process.nextTick(() => {
                if (err) {
                    self.emit("error", err);
                }
                self.emit("close");
            });
        }
    }

    Class.prototype._from = read || adone.noop;

    return Class;
};

const Proto = ctor();

const from2 = function (opts, read) {
    if (typeof opts !== "object" || is.array(opts)) {
        read = opts;
        opts = {};
    }

    const rs = new Proto(opts);
    rs._from = is.array(read) ? toFunction(read) : (read || adone.noop);
    return rs;
};

const intoStream = (x) => {
    if (is.array(x)) {
        x = x.slice();
    }

    let promise;
    let iterator;

    const prepare = function (value) {
        x = value;
        promise = is.promise(x) ? x : null;
        // we don't iterate on strings and buffers since slicing them is ~7x faster
        const shouldIterate = !promise && x[Symbol.iterator] && !is.string(x) && !is.buffer(x);
        iterator = shouldIterate ? x[Symbol.iterator]() : null;
    };

    prepare(x);

    return from2(function reader(size, cb) {
        if (promise) {
            promise.then(prepare).then(() => reader.call(this, size, cb), cb);
            return;
        }

        if (iterator) {
            const obj = iterator.next();
            setImmediate(cb, null, obj.done ? null : obj.value);
            return;
        }

        if (x.length === 0) {
            setImmediate(cb, null, null);
            return;
        }

        const chunk = x.slice(0, size);
        x = x.slice(size);

        setImmediate(cb, null, chunk);
    });
};



const quote = Buffer.from('"')[0];
const comma = Buffer.from(",")[0];
const cr = Buffer.from("\r")[0];
const nl = Buffer.from("\n")[0];

export class Parser extends std.stream.Transform {
    constructor(opts) {
        super({ objectMode: true, highWaterMark: 16 });
        if (!opts) {
            opts = {};
        }
        if (is.array(opts)) {
            opts = { headers: opts };
        }

        this.separator = opts.separator ? Buffer.from(opts.separator)[0] : comma;
        this.quote = opts.quote ? Buffer.from(opts.quote)[0] : quote;
        this.escape = opts.escape ? Buffer.from(opts.escape)[0] : this.quote;
        if (opts.newline) {
            this.newline = Buffer.from(opts.newline)[0];
            this.customNewline = true;
        } else {
            this.newline = nl;
            this.customNewline = false;
        }

        this.headers = opts.headers || null;
        this.strict = opts.strict || null;
        this.mapHeaders = opts.mapHeaders || identity;
        this.mapValues = opts.mapValues || identity;

        this._raw = Boolean(opts.raw);
        this._prev = null;
        this._prevEnd = 0;
        this._first = true;
        this._quoted = false;
        this._escaped = false;
        this._empty = this._raw ? Buffer.alloc(0) : "";
        this._Row = null;

        if (this.headers) {
            this._first = false;
            this._compile(this.headers);
        }
    }

    _transform(data, enc, cb) {
        if (is.string(data)) {
            data = Buffer.from(data);
        }

        let start = 0;
        let buf = data;

        if (this._prev) {
            start = this._prev.length;
            buf = Buffer.concat([this._prev, data]);
            this._prev = null;
        }

        const bufLen = buf.length;

        for (let i = start; i < bufLen; i++) {
            const chr = buf[i];
            const nextChr = i + 1 < bufLen ? buf[i + 1] : null;

            if (!this._escaped && chr === this.escape && nextChr === this.quote && i !== start) {
                this._escaped = true;
                continue;
            } else if (chr === this.quote) {
                if (this._escaped) {
                    this._escaped = false;
                    // non-escaped quote (quoting the cell)
                } else {
                    this._quoted = !this._quoted;
                }
                continue;
            }

            if (!this._quoted) {
                if (this._first && !this.customNewline) {
                    if (chr === nl) {
                        this.newline = nl;
                    } else if (chr === cr) {
                        if (nextChr !== nl) {
                            this.newline = cr;
                        }
                    }
                }

                if (chr === this.newline) {
                    this._online(buf, this._prevEnd, i + 1);
                    this._prevEnd = i + 1;
                }
            }
        }

        if (this._prevEnd === bufLen) {
            this._prevEnd = 0;
            return cb();
        }

        if (bufLen - this._prevEnd < data.length) {
            this._prev = data;
            this._prevEnd -= (bufLen - data.length);
            return cb();
        }

        this._prev = buf;
        cb();
    }

    _flush(cb) {
        if (this._escaped || !this._prev) {
            return cb();
        }
        this._online(this._prev, this._prevEnd, this._prev.length + 1); // plus since online -1s
        cb();
    }

    _online(buf, start, end) {
        end--; // trim newline
        if (!this.customNewline && buf.length && buf[end - 1] === cr) {
            end--;
        }

        const comma = this.separator;
        const cells = [];
        let isQuoted = false;
        let offset = start;

        for (let i = start; i < end; i++) {
            const isStartingQuote = !isQuoted && buf[i] === this.quote;
            const isEndingQuote = isQuoted && buf[i] === this.quote && i + 1 <= end && buf[i + 1] === comma;
            const isEscape = isQuoted && buf[i] === this.escape && i + 1 < end && buf[i + 1] === this.quote;

            if (isStartingQuote || isEndingQuote) {
                isQuoted = !isQuoted;
                continue;
            } else if (isEscape) {
                i++;
                continue;
            }

            if (buf[i] === comma && !isQuoted) {
                cells.push(this._oncell(buf, offset, i));
                offset = i + 1;
            }
        }

        if (offset < end) {
            cells.push(this._oncell(buf, offset, end));
        }
        if (buf[end - 1] === comma) {
            cells.push(this._empty);
        }

        if (this._first) {
            this._first = false;
            this.headers = cells;
            this._compile(cells);
            this.emit("headers", this.headers);
            return;
        }

        if (this.strict && cells.length !== this.headers.length) {
            this.emit("error", new Error("Row length does not match headers"));
        } else {
            this._emit(this._Row, cells);
        }
    }

    _compile() {
        if (this._Row) {
            return;
        }

        const Row = genfun()("function Row (cells) {");

        const self = this;
        this.headers.forEach((cell, i) => {
            const newHeader = self.mapHeaders(cell, i);
            if (newHeader) {
                Row("%s = cells[%d]", genobj("this", newHeader), i);
            }
        });

        Row("}");

        this._Row = Row.toFunction();

        if (Object.defineProperty) {
            Object.defineProperty(this._Row.prototype, "headers", {
                enumerable: false,
                value: this.headers
            });
        } else {
            this._Row.prototype.headers = this.headers;
        }
    }

    _emit(Row, cells) {
        this.push(new Row(cells));
    }

    _oncell(buf, start, end) {
        // remove quotes from quoted cells
        if (buf[start] === this.quote && buf[end - 1] === this.quote) {
            start++;
            end--;
        }

        let i;
        let y;
        for (i = start, y = start; i < end; i++) {
            // check for escape characters and skip them
            if (buf[i] === this.escape && i + 1 < end && buf[i + 1] === this.quote) {
                i++;
            }
            if (y !== i) {
                buf[y] = buf[i];
            }
            y++;
        }

        const value = this._onvalue(buf, start, y);
        return this._first ? value : this.mapValues(value);
    }

    _onvalue(buf, start, end) {
        if (this._raw) {
            return buf.slice(start, end);
        }
        return buf.toString("utf-8", start, end);
    }
}


export const parse = (input, opts) => {
    if (is.string(input) || is.buffer(input)) {
        input = intoStream(input);
    }

    return adone.stream.as.array(input.pipe(new Parser(opts)));
};
