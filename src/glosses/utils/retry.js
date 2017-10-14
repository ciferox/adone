const {
    is
} = adone;

adone.asNamespace(exports);

class RetryOperation {
    constructor(timeouts, options) {
        // Compatibility for the old (timeouts, retryForever) signature
        if (is.boolean(options)) {
            options = { forever: options };
        }

        this._timeouts = timeouts;
        this._options = options || {};
        this._fn = null;
        this._errors = [];
        this._attempts = 1;
        this._operationTimeout = null;
        this._operationTimeoutCb = null;
        this._timeout = null;

        if (this._options.forever) {
            this._cachedTimeouts = this._timeouts.slice(0);
        }
    }

    stop() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        this._timeouts = [];
        this._cachedTimeouts = null;
    }

    retry(err) {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        if (err) {
            this._errors.push(err);
        }

        let timeout = this._timeouts.shift();
        if (is.undefined(timeout)) {
            if (this._cachedTimeouts) {
                // retry forever, only keep last error
                this._errors.splice(this._errors.length - 1, this._errors.length);
                this._timeouts = this._cachedTimeouts.slice(0);
                timeout = this._timeouts.shift();
            } else {
                return false;
            }
        }

        const self = this;
        const timer = setTimeout(() => {
            self._attempts++;

            if (self._operationTimeoutCb) {
                self._timeout = setTimeout(() => {
                    self._operationTimeoutCb(self._attempts);
                }, self._operationTimeout);

                if (self._options.unref) {
                    self._timeout.unref();
                }
            }

            self._fn(self._attempts);
        }, timeout);

        if (this._options.unref) {
            timer.unref();
        }

        return true;
    }

    attempt(fn, timeoutOps) {
        this._fn = fn;

        if (timeoutOps) {
            if (timeoutOps.timeout) {
                this._operationTimeout = timeoutOps.timeout;
            }
            if (timeoutOps.cb) {
                this._operationTimeoutCb = timeoutOps.cb;
            }
        }

        const self = this;
        if (this._operationTimeoutCb) {
            this._timeout = setTimeout(() => {
                self._operationTimeoutCb();
            }, self._operationTimeout);
        }

        this._fn(this._attempts);
    }

    errors() {
        return this._errors;
    }

    attempts() {
        return this._attempts;
    }

    mainError() {
        if (this._errors.length === 0) {
            return null;
        }

        const counts = {};
        let mainError = null;
        let mainErrorCount = 0;

        for (let i = 0; i < this._errors.length; i++) {
            const error = this._errors[i];
            const message = error.message;
            const count = (counts[message] || 0) + 1;

            counts[message] = count;

            if (count >= mainErrorCount) {
                mainError = error;
                mainErrorCount = count;
            }
        }

        return mainError;
    }
}

export const operation = (options) => {
    const timeouts = exports.timeouts(options);
    return new RetryOperation(timeouts, {
        forever: options && options.forever,
        unref: options && options.unref
    });
};

export const createTimeout = (attempt, opts) => {
    const random = (opts.randomize) ? (Math.random() + 1) : 1;

    let timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
    timeout = Math.min(timeout, opts.maxTimeout);

    return timeout;
};

export const timeouts = (options) => {
    if (options instanceof Array) {
        return [].concat(options);
    }

    const opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: Infinity,
        randomize: false
    };
    for (const key in options) {
        opts[key] = options[key];
    }

    if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
    }

    const timeouts = [];
    let i;
    for (i = 0; i < opts.retries; i++) {
        timeouts.push(createTimeout(i, opts));
    }

    if (options && options.forever && !timeouts.length) {
        timeouts.push(createTimeout(i, opts));
    }

    // sort the array numerically ascending
    timeouts.sort((a, b) => {
        return a - b;
    });

    return timeouts;
};

// export const wrap = (obj, options, methods) => {
//     if (options instanceof Array) {
//         methods = options;
//         options = null;
//     }

//     if (!methods) {
//         methods = [];
//         for (const key in obj) {
//             if (is.function(obj[key])) {
//                 methods.push(key);
//             }
//         }
//     }

//     for (let i = 0; i < methods.length; i++) {
//         const method = methods[i];
//         const original = obj[method];

//         obj[method] = function (...args) {
//             const op = exports.operation(options);
//             const callback = args.pop();

//             args.push(function (err) {
//                 if (op.retry(err)) {
//                     return;
//                 }
//                 if (err) {
//                     arguments[0] = op.mainError();
//                 }
//                 callback.apply(this, arguments);
//             });

//             op.attempt(() => {
//                 original.apply(obj, args);
//             });
//         };
//         obj[method].options = options;
//     }
// };
