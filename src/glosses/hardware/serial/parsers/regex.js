export default class RegexParser extends adone.std.stream.Transform {
    constructor(options = {}) {
        super(options);

        if (adone.is.undefined(options.delimiter)) {
            throw new TypeError('"delimiter" is not a RegExp object or a string');
        }

        if (options.delimiter.length === 0) {
            throw new TypeError('"delimiter" has a 0 or undefined length');
        }

        if (!(options.delimiter instanceof RegExp)) {
            options.delimiter = new RegExp(options.delimiter);
        }

        const encoding = options.encoding || "utf8";
        this.setEncoding(encoding);

        this.delimiter = options.delimiter;
        this.buffer = Buffer.allocUnsafe(0);
    }

    _transform(chunk, encoding, cb) {
        let data = Buffer.concat([this.buffer, chunk]).toString();

        const parts = data.split(this.delimiter);

        data = parts.pop();

        parts.forEach((part) => {
            this.push(part);
        });

        this.buffer = Buffer.from(data);
        cb();
    }

    _flush(cb) {
        this.push(this.buffer);
        this.buffer = Buffer.allocUnsafe(0);
        cb();
    }
}
