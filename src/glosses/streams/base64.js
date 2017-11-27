const {
    is,
    std: {
        stream: { Transform }
    }
} = adone;

// Adds soft line breaks to a base64 string
const wrap = (str, lineLength, delimiter) => {
    str = (str || "").toString();
    lineLength = lineLength || 76;

    if (str.length <= lineLength) {
        return str;
    }

    const result = [];
    let pos = 0;
    const chunkLength = lineLength * 1024;
    while (pos < str.length) {
        const wrappedLines = str
            .substr(pos, chunkLength)
            .replace(new RegExp(`.{${lineLength}}`, "g"), "$&\r\n")
            .trim();
        result.push(wrappedLines);
        pos += chunkLength;
    }

    return result.join(delimiter).trim();
};

const encode = (buffer) => {
    if (is.string(buffer)) {
        buffer = Buffer.from(buffer, "utf-8");
    }

    return buffer.toString("base64");
};

const decode = (str) => {
    str = str || "";
    return Buffer.from(str, "base64");
};

export class Encode extends Transform {
    constructor(options = {}) {
        super(options);
        this.options = options;

        if (this.options.lineLength !== false) {
            this.options.lineLength = this.options.lineLength || 76;
            this.options.delimiter = this.options.delimiter || "\r\n";
        }

        this._curLine = "";
        this._remainingBytes = false;

        this.inputBytes = 0;
        this.outputBytes = 0;
    }

    _transform(chunk, encoding, done) {
        if (encoding !== "buffer") {
            chunk = Buffer.from(chunk, encoding);
        }

        if (!chunk || !chunk.length) {
            return setImmediate(done);
        }

        this.inputBytes += chunk.length;

        if (this._remainingBytes && this._remainingBytes.length) {
            chunk = Buffer.concat([this._remainingBytes, chunk], this._remainingBytes.length + chunk.length);
            this._remainingBytes = false;
        }

        if (chunk.length % 3) {
            this._remainingBytes = chunk.slice(chunk.length - chunk.length % 3);
            chunk = chunk.slice(0, chunk.length - chunk.length % 3);
        } else {
            this._remainingBytes = false;
        }

        let b64 = this._curLine + encode(chunk);

        if (this.options.lineLength) {
            b64 = wrap(b64, this.options.lineLength, this.options.delimiter);
            // remove last line as it is still most probably incomplete
            const lastLF = b64.lastIndexOf("\n");
            if (lastLF < 0) {
                this._curLine = b64;
                b64 = "";
            } else if (lastLF === b64.length - 1) {
                this._curLine = "";
            } else {
                this._curLine = b64.substr(lastLF + 1);
                b64 = b64.substr(0, lastLF + 1);
            }
        }

        if (b64) {
            this.outputBytes += b64.length;
            this.push(Buffer.from(b64, "ascii"));
        }

        setImmediate(done);
    }

    _flush(done) {
        if (this._remainingBytes && this._remainingBytes.length) {
            this._curLine += adone.data.base64.encode(this._remainingBytes, { buffer: false });
        }

        if (this._curLine) {
            this._curLine = wrap(this._curLine, this.options.lineLength, this.options.delimiter);
            this.outputBytes += this._curLine.length;
            this.push(this._curLine, "ascii");
            this._curLine = "";
        }
        setImmediate(done);
    }
}

export class Decode extends Transform {
    constructor(options = {}) {
        super(options);
        this._curLine = "";
        this.inputBytes = 0;
        this.outputBytes = 0;
    }

    _transform(chunk, encoding, done) {
        if (!chunk || !chunk.length) {
            return setImmediate(done);
        }

        this.inputBytes += chunk.length;
        let b64 = this._curLine + chunk.toString("ascii");
        this._curLine = "";

        if (/[^a-zA-Z0-9+/=]/.test(b64)) {
            b64 = b64.replace(/[^a-zA-Z0-9+/=]/g, "");
        }

        if (b64.length < 4) {
            this._curLine = b64;
            b64 = "";
        } else if (b64.length % 4) {
            this._curLine = b64.substr(-b64.length % 4);
            b64 = b64.substr(0, b64.length - this._curLine.length);
        }

        if (b64) {
            const buf = decode(b64);
            this.outputBytes += buf.length;
            this.push(buf);
        }

        setImmediate(done);
    }

    _flush(done) {
        if (this._curLine) {
            const buf = base64.decode(this._curLine, { buffer: true });
            this.outputBytes += buf.length;
            this.push(buf);
            this._curLine = "";
        }
        setImmediate(done);
    }
}
