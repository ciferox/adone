const {
    is,
    std: { stream: { Readable } }
} = adone;

class ReadStream extends Readable {
    constructor(iterator, options = {}) {
        super(Object.assign({}, options, {
            objectMode: true
        }));
        this._iterator = iterator;
        this._options = options;
        this.on("end", this.destroy.bind(this, null, null));
    }

    _read() {
        const options = this._options;
        if (this.destroyed) {
            return;
        }

        this._iterator.next((err, key, value) => {
            if (this.destroyed) {
                return; 
            }
            if (err) {
                return this.destroy(err); 
            }

            if (is.undefined(key) && is.undefined(value)) {
                this.push(null);
            } else if (options.keys !== false && options.values === false) {
                this.push(key);
            } else if (options.keys === false && options.values !== false) {
                this.push(value);
            } else {
                this.push({ key, value });
            }
        });
    }

    _destroy(err, callback) {
        this._iterator.end((err2) => {
            callback(err || err2);
        });
    }
}

export default (iterator, options) => new ReadStream(iterator, options);
