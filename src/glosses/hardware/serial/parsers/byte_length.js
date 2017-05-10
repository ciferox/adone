export default class ByteLengthParser extends adone.std.stream.Transform {
    constructor(options = {}) {
        super(options);

        if (!adone.is.number(options.length)) {
            throw new TypeError('"length" is not a number');
        }

        if (options.length < 1) {
            throw new TypeError('"length" is not greater than 0');
        }

        this.length = options.length;
        this.buffer = Buffer.allocUnsafe(0);
    }

    _transform(chunk, encoding, cb) {
        let data = Buffer.concat([this.buffer, chunk]);
        while (data.length >= this.length) {
            const out = data.slice(0, this.length);
            this.push(out);
            data = data.slice(this.length);
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
