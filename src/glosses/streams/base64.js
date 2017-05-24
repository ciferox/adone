const { std: { stream: { Transform } } } = adone;

/**
 * Adds soft line breaks to a base64 string
 *
 * @param {String} str base64 encoded string that might need line wrapping
 * @param {Number} [lineLength=76] Maximum allowed length for a line
 * @returns {String} Soft-wrapped base64 encoded string
 */
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
        const wrappedLines = str.substr(pos, chunkLength).replace(new RegExp(`.{${lineLength}}`, "g"), "$&\r\n").trim();
        result.push(wrappedLines);
        pos += chunkLength;
    }

    return result.join(delimiter).trim();
};

export class Encode extends Transform {
    constructor(options) {
        super();
        // init Transform
        this.options = options || {};

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
        let b64;

        if (encoding !== "buffer") {
            chunk = Buffer.from(chunk, encoding);
        }

        if (!chunk || !chunk.length) {
            return done();
        }

        this.inputBytes += chunk.length;

        if (this._remainingBytes && this._remainingBytes.length) {
            chunk = Buffer.concat([this._remainingBytes, chunk]);
            this._remainingBytes = false;
        }

        if (chunk.length % 3) {
            this._remainingBytes = chunk.slice(chunk.length - chunk.length % 3);
            chunk = chunk.slice(0, chunk.length - chunk.length % 3);
        } else {
            this._remainingBytes = false;
        }

        b64 = this._curLine + adone.data.base64.encode(chunk, { buffer: false });

        if (this.options.lineLength) {
            b64 = wrap(b64, this.options.lineLength, this.options.delimiter);
            b64 = b64.replace(/(^|\n)([^\n]*)$/, (match, lineBreak, lastLine) => {
                this._curLine = lastLine;
                return lineBreak;
            });
        }

        if (b64) {
            this.outputBytes += b64.length;
            this.push(b64);
        }

        done();
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
        done();
    }
}
