const {
    is,
    x
} = adone;

export default class MongoError extends x.Exception {
    static create(options) {
        let err = null;

        if (options instanceof Error) {
            err = new MongoError(options.message);
            err.stack = options.stack;
        } else if (is.string(options)) {
            err = new MongoError(options);
        } else {
            err = new MongoError(options.message || options.errmsg || options.$err || "n/a");
            // Other options
            for (const name in options) {
                err[name] = options[name];
            }
        }

        return err;
    }
}
MongoError.prototype.name = "MongoError";
