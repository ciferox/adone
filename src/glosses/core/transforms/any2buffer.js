

export default class extends adone.Transform {
    constructor(options) {
        super(options);
        this.options = options;
    }
    _transform(chunk) {
        if (adone.is.primitive(chunk)) {
            this.push(chunk.toString());
        } else if (adone.is.buffer(chunk)) {
            this.push(chunk);
        } else {
            this.push(new Buffer(adone.std.util.inspect(chunk, this.options)));
        }
    }
}
