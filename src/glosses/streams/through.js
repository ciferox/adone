const {
    is
} = adone;

class DestroyableTransform extends adone.std.stream.Transform {
    constructor(opts) {
        super(opts);
        this._destroyed = false;
    }

    destroy(err) {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;

        process.nextTick(() => {
            if (err) {
                this.emit("error", err);
            }
            this.emit("close");
        });
    }
}

// a noop _transform function
const noop = (chunk, enc, callback) => callback(null, chunk);

// create a new export function, used by both the main export and
// the .ctor export, contains common logic for dealing with arguments
const through2 = (construct) => {
    return (options, transform, flush) => {
        if (is.function(options)) {
            flush = transform;
            transform = options;
            options = {};
        }

        if (!is.function(transform)) {
            transform = noop;
        }

        if (!is.function(flush)) {
            flush = null;
        }

        return construct(options, transform, flush);
    };
};

// main export, just make me a transform stream!
export const base = through2((options, transform, flush) => {
    const t2 = new DestroyableTransform(options);

    t2._transform = transform;

    if (flush) {
        t2._flush = flush;
    }

    return t2;
});


// make me a reusable prototype that I can `new`, or implicitly `new`
// with a constructor call
export const ctor = through2((options, transform, flush) => {
    class Through2 extends DestroyableTransform {
        constructor(override) {
            const opts = Object.assign({}, options, override);
            super(opts);
            this.options = opts;
        }
    }
    Through2.prototype._transform = transform;

    if (flush) {
        Through2.prototype._flush = flush;
    }

    return Through2;
});


export const obj = through2((options, transform, flush) => {
    const t2 = new DestroyableTransform(Object.assign({ objectMode: true, highWaterMark: 16 }, options));

    t2._transform = transform;

    if (flush) {
        t2._flush = flush;
    }

    return t2;
});
