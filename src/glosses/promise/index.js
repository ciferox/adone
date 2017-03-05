import adone from "adone";

export function defer() {
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
}


export function delay(ms, value) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms, value);
    });
}

export function timeout(promise, ms) {
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
}

export function nodeify(promise, cb) {
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
}

const PROMISIFIED = Symbol.for("adone:promise:promisified");
const PROMISIFY_SOURCE = Symbol.for("adone:promise:promisify_source");

export function promisify(fn) {
    if (!adone.is.function(fn)) {
        throw new adone.x.InvalidArgument("The first argument must be a function");
    }
    const f = function (...args) {
        return new Promise((resolve, reject) => {
            fn.apply(this, [...args, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }]);
        });
    };
    f[PROMISIFIED] = true;
    f[PROMISIFY_SOURCE] = fn;
    return f;
}


export function promisifyAll(source, { suffix = "Async", filter = () => true } = {}) {
    const target = adone.o(source);
    for (const [key, value] of adone.util.entries(source)) {
        if (adone.is.function(value) && filter(key)) {
            target[`${key}${suffix}`] = promisify(value);
        }
    }
    return target;
}
