const { is } = adone;

const PROMISIFIED = Symbol.for("adone:promise:promisified");
const PROMISIFY_SOURCE = Symbol.for("adone:promise:promisify_source");

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
export const delay = (ms, value) => {
    return new Promise((resolve) => {
        adone.setTimeout(resolve, ms, value);
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
        throw new adone.x.InvalidArgument("The first argument must be a promise");
    }
    return new Promise((resolve, reject) => {
        const timestamp = new adone.Date();
        const timer = adone.setTimeout(() => {
            reject(new adone.x.Timeout(`Timeout of ${ms}ms exceeded`));
        }, ms);
        promise.then((x) => {
            adone.clearTimeout(timer);
            if (new adone.Date() - timestamp >= ms) {
                reject(new adone.x.Timeout(`Timeout of ${ms}ms exceeded`));
            } else {
                resolve(x);
            }
        }, (y) => {
            adone.clearTimeout(timer);
            if (new adone.Date() - timestamp >= ms) {
                const err = new adone.x.Timeout(`Timeout of ${ms}ms exceeded`);
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
        throw new adone.x.InvalidArgument("The first argument must be a promise");
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
 * Converts a callback function to a promise-based function
 *
 * @param {Function} fn
 * @param {object} [context] Context to bind to new function
 * @returns {Function}
 */
export const promisify = (fn, { context = null } = {}) => {
    if (!is.function(fn)) {
        throw new adone.x.InvalidArgument("The first argument must be a function");
    }

    const { name } = fn;
    let res;

    if (context) {
        res = {
            [name]: (...args) => new Promise((resolve, reject) => {
                args.push((err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
                fn.apply(context, args);
            })
        };
    } else {
        res = {
            [name](...args) {
                return new Promise((resolve, reject) => {
                    args.push((err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                    fn.apply(this, args);
                });
            }
        };
    }

    res[name][PROMISIFIED] = true;
    res[name][PROMISIFY_SOURCE] = fn;
    return res[name];
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
export const promisifyAll = (source, { suffix = "Async", filter = () => true, context } = {}) => {
    if (is.function(source)) {
        return promisify(source, context);
    }

    const target = adone.o(source);
    for (const [key, value] of adone.util.entries(source)) {
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
