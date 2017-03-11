const { is } = adone;

const PROMISIFIED = Symbol.for("adone:promise:promisified");
const PROMISIFY_SOURCE = Symbol.for("adone:promise:promisify_source");

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


export const delay = (ms, value) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms, value);
    });
};

export const timeout = (promise, ms) => {
    if (!adone.is.promise(promise)) {
        throw new adone.x.InvalidArgument("The first argument must be a promise");
    }
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new adone.x.Timeout(`Timeout of ${ms}ms exceeded`));
        }, ms);
        promise.then((x) => {
            clearTimeout(timer);
            resolve(x);
        }, (y) => {
            clearTimeout(timer);
            reject(y);
        });
    });
};

export const nodeify = (promise, cb) => {
    if (!adone.is.promise(promise)) {
        throw new adone.x.InvalidArgument("The first argument must be a promise");
    }
    if (!adone.is.function(cb)) {
        return promise;
    }
    promise.then((x) => {
        cb(null, x);
    }, (y) => {
        cb(y);
    });
    return promise;
};

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


export const promisifyAll = (source, { suffix = "Async", filter = () => true, context } = {}) => {
    const target = adone.o(source);
    for (const [key, value] of adone.util.entries(source)) {
        if (is.function(value) && filter(key)) {
            target[`${key}${suffix}`] = promisify(value, { context });
        }
    }
    return target;
};
