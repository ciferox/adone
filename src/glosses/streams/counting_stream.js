export default class CountingStream extends adone.std.stream.Transform {
    constructor() {
        super();
        this.count = 0;
    }

    _transform(chunk, encoding, cb) {
        this.count += chunk.length;
        this.push(chunk);
        cb();
    }
}
