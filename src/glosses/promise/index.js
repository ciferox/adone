const {
    is,
    util
} = adone;

adone.asNamespace(exports);

/**
 * @typedef Deferred
 * @property {Function} resolve
 * @property {Function} reject
 * @property {Promise} promise
 */

/**
 * Creates a promise and returns an interface to control the state
 *
 * @returns {Deferred}
 */
export const defer = () => {
    const defer = {
        resolve: null,
        reject: null,
        promise: null
    };
    defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
};

/**
 * Returns a promise that will be resolved after given milliseconds
 *
 * @template T
 * @param {number} ms delay in milliseconds
 * @param {T} [value] resolving value
 * @returns {Promise<T>}
 */
export const delay = (ms, value, { unref = false } = {}) => {
    return new Promise((resolve) => {
        const timer = adone.setTimeout(resolve, ms, value);
        if (unref) {
            timer.unref();
        }
    });
};

/**
 * Creates a promise that will be rejected after given milliseconds if the given promise is not fulfilled
 *
 * @template T
 * @param {Promise<T>} promise promise to wrap
 * @param {number} ms timeout in milliseconds
 * @returns {Promise<T>}
 */
export const timeout = (promise, ms) => {
    if (!is.promise(promise)) {
        throw new adone.error.InvalidArgumentException("The first argument must be a promise");
    }
    return new Promise((resolve, reject) => {
        const timestamp = new Date();
        const timer = adone.setTimeout(() => {
            reject(new adone.error.TimeoutException(`Timeout of ${ms}ms exceeded`));
        }, ms);
        promise.then((x) => {
            adone.clearTimeout(timer);
            if (new Date() - timestamp >= ms) {
                reject(new adone.error.TimeoutException(`Timeout of ${ms}ms exceeded`));
            } else {
                resolve(x);
            }
        }, (y) => {
            adone.clearTimeout(timer);
            if (new Date() - timestamp >= ms) {
                const err = new adone.error.TimeoutException(`Timeout of ${ms}ms exceeded`);
                err.original = y;
                reject(err);
            } else {
                reject(y);
            }
        });
    });
};

/**
 * Converts a promise to node.js style callback
 *
 * @param {Promise} promise
 * @param {Function} cb
 */
export const nodeify = (promise, cb) => {
    if (!is.promise(promise)) {
        throw new adone.error.InvalidArgumentException("The first argument must be a promise");
    }
    if (!is.function(cb)) {
        return promise;
    }
    promise.then((x) => {
        cb(null, x);
    }, (y) => {
        cb(y);
    });
    return promise;
};

/**
 * Converts a function that returns promises to a node.js style callback function
 *
 * @param {Function} fn Function
 * @returns {Promise} the original promise
 */
export const callbackify = (fn) => {
    if (!is.function(fn)) {
        throw new adone.error.InvalidArgumentException("The first argument must be a function");
    }
    return function (...args) {
        if (args.length && is.function(args[args.length - 1])) {
            const cb = args.pop();
            return nodeify(fn.apply(this, args), cb);
        }
        return fn.apply(this, args);
    };
};

const processFn = (fn, context, args, multiArgs, resolve, reject) => {
    if (multiArgs) {
        args.push((...result) => {
            if (result[0]) {
                reject(result);
            } else {
                result.shift();
                resolve(result);
            }
        });
    } else {
        args.push((err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    }
    fn.apply(context, args);
};

/**
 * Converts a callback function to a promise-based function
 *
 * @param {Function} fn
 * @param {object} [context] Context to bind to new function
 * @returns {Function}
 */
export const promisify = (fn, { context = null, multiArgs = false } = {}) => {
    if (!is.function(fn)) {
        throw new adone.error.InvalidArgumentException("The first argument must be a function");
    }

    return context
        ? (...args) => new Promise((resolve, reject) => {
            processFn(fn, context, args, multiArgs, resolve, reject);
        })
        : function (...args) {
            return new Promise((resolve, reject) => {
                processFn(fn, this, args, multiArgs, resolve, reject);
            });
        };
};

/**
 * Promisifies entire object
 *
 * @param {object} source
 * @param {string} [suffix] Suffix to use for keys
 * @param {Function} [filter] Function to filter keys
 * @param {object} [context] Context to bind to new functions
 * @returns {object} object with promisified functions
 */
export const promisifyAll = (source, { suffix = "Async", filter = adone.truly, context } = {}) => {
    if (is.function(source)) {
        return promisify(source, { context });
    }

    const target = Object.create(source);
    for (const [key, value] of util.entries(source, { all: true })) {
        if (is.function(value) && filter(key)) {
            target[`${key}${suffix}`] = promisify(value, { context });
        }
    }
    return target;
};

/**
 * Executes function after promise fulfillment
 *
 * @param {Promise} promise promise to wrap
 * @param {Function} onFinally callback to call
 * @returns {Promise} a promise that will be fulfilled using the original value
 */
const _finally = (promise, onFinally) => {
    onFinally = onFinally || adone.noop;

    return promise.then((val) => new Promise((resolve) => {
        resolve(onFinally());
    }).then(() => val), (err) => new Promise((resolve) => {
        resolve(onFinally());
    }).then(() => {
        throw err;
    }));
};

export { _finally as finally };

/**
 * Calls the given function after some timeout until the result is returned or it cannot be restarted anymore
 */
export const retry = async (callback, options) => {
    if (!callback || !options) {
        throw new Error("requires a callback and an options set or a number");
    }

    if (is.number(options)) {
        options = { max: options };
    }

    options = {
        $current: options.$current || 1,
        max: options.max,
        timeout: options.timeout || undefined,
        match: options.match || [],
        backoffBase: is.undefined(options.backoffBase) ? 100 : options.backoffBase,
        backoffExponent: options.backoffExponent || 1.1,
        report: options.report || null,
        name: options.name || callback.name || "unknown"
    };

    // Massage match option into array so we can blindly treat it as such later
    if (!is.array(options.match)) {
        options.match = [options.match];
    }

    if (options.report) {
        options.report(`Trying ${options.name} #${options.$current} at ${new Date().toLocaleTimeString()}`, options);
    }

    for (; ;) {
        try {
            let p = Promise.resolve(callback({ current: options.$current })); // eslint-disable-line
            if (options.timeout) {
                p = timeout(p, options.timeout);
            }
            return await p; // eslint-disable-line
        } catch (err) {
            if (options.report) {
                options.report(`Try ${options.name} #${options.$current} failed: ${err.toString()}`, options, err);
            }
            let shouldRetry = options.$current < options.max;
            if (shouldRetry && options.match.length && err) {
                // If match is defined we should fail if it is not met
                shouldRetry = options.match.reduce((shouldRetry, match) => {
                    if (shouldRetry) {
                        return shouldRetry;
                    }

                    if (
                        match === err.toString()
                        || match === err.message
                        || (is.function(match) && err instanceof match)
                        || (
                            match instanceof RegExp && (match.test(err.message) || match.test(err.toString()))
                        )
                    ) {
                        shouldRetry = true;
                    }
                    return shouldRetry;
                }, false);
            }

            if (!shouldRetry) {
                throw err;
            }

            const retryDelay = Math.pow(options.backoffBase, Math.pow(options.backoffExponent, (options.$current - 1)));
            options.$current++;
            if (retryDelay) {
                if (options.report) {
                    options.report(`Delaying retry of ${options.name} by ${retryDelay}`, options);
                }
                await delay(retryDelay); // eslint-disable-line
            }
        }
    }
};

export const props = async (obj) => {
    const result = {};
    await Promise.all(Object.keys(obj).map(async (key) => {
        result[key] = await obj[key];
    }));
    return result;
};


const try_ = (fn, ...args) => new Promise((resolve) => {
    resolve(fn(...args));
});

export { try_ as try };


export const universalify = (fn) => {
    const props = {
        name: {
            value: fn.name
        },
        ...Object.keys(fn).reduce((props, k) => {
            props[k] = {
                enumerable: true,
                value: fn[k]
            };
            return props;
        }, {})
    };
    return Object.defineProperties(function (...args) {
        if (is.function(args[args.length - 1])) {
            fn.apply(this, args);
        } else {
            return new Promise((resolve, reject) => {
                args.push((err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                });
                fn.apply(this, args);
            });
        }
    }, props);
};

export const universalifyFromPromise = (fn) => {
    return Object.defineProperty(function (...args) {
        const cb = args[args.length - 1];
        if (!is.function(cb)) {
            return fn.apply(this, args);
        }
        fn.apply(this, args).then((r) => cb(null, r), cb);
    }, "name", { value: fn.name });
};
