const seen = Symbol("circular-ref-tag");

const {
    is
} = adone;

const errSerializer = function (err) {
    if (!(err instanceof Error)) {
        return err;
    }

    err[seen] = undefined; // tag to prevent re-looking at this

    const obj = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
    };
    for (const key in err) {
        if (is.undefined(obj[key])) {
            const val = err[key];
            if (val instanceof Error) {
                if (!val.hasOwnProperty(seen)) {
                    obj[key] = errSerializer(val);
                }
            } else {
                obj[key] = val;
            }
        }
    }

    delete err[seen]; // clean up tag in case err is serialized again later
    return obj;
};

module.exports = errSerializer;
