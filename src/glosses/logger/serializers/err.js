const {
    is
} = adone;

module.exports = errSerializer;

const seen = Symbol("circular-ref-tag");
const rawSymbol = Symbol("pino-raw-err-ref");
const pinoErrProto = Object.create({}, {
    type: {
        enumerable: true,
        writable: true,
        value: undefined
    },
    message: {
        enumerable: true,
        writable: true,
        value: undefined
    },
    stack: {
        enumerable: true,
        writable: true,
        value: undefined
    },
    raw: {
        enumerable: false,
        get() {
            return this[rawSymbol];
        },
        set(val) {
            this[rawSymbol] = val;
        }
    }
});
Object.defineProperty(pinoErrProto, rawSymbol, {
    writable: true,
    value: {}
});

function errSerializer(err) {
    if (!(err instanceof Error)) {
        return err;
    }

    err[seen] = undefined; // tag to prevent re-looking at this
    const _err = Object.create(pinoErrProto);
    _err.type = err.constructor.name;
    _err.message = err.message;
    _err.stack = err.stack;
    for (const key in err) {
        if (is.undefined(_err[key])) {
            const val = err[key];
            if (val instanceof Error) {
                if (!val.hasOwnProperty(seen)) {
                    _err[key] = errSerializer(val);
                }
            } else {
                _err[key] = val;
            }
        }
    }

    delete err[seen]; // clean up tag in case err is serialized again later
    _err.raw = err;
    return _err;
}
