export default class DelimiterParser extends adone.std.stream.Transform {
    constructor(options = {}) {
        super(options);

        if (adone.is.undefined(options.delimiter)) {
            throw new TypeError('"delimiter" is not a bufferable object');
        }

        if (options.delimiter.length === 0) {
            throw new TypeError('"delimiter" has a 0 or undefined length');
        }

        this.delimiter = Buffer.allocUnsafe(options.delimiter);
        this.buffer = Buffer.allocUnsafe(0);
    }

    _transform(chunk, encoding, cb) {
        let data = Buffer.concat([this.buffer, chunk]);
        let position;
        while ((position = data.indexOf(this.delimiter)) !== -1) {
            this.push(data.slice(0, position));
            data = data.slice(position + this.delimiter.length);
        }
        this.buffer = data;
        cb();
    }

    _flush(cb) {
        this.push(this.buffer);
        this.buffer = Buffer.allocUnsafe(0);
        cb();
    }
}
