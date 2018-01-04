const { is, x, util, collection, promise } = adone;

const DROPPED = Symbol("DROPPED");

class Delayed {
    constructor(resolve, fn, self, args) {
        this.resolve = resolve;
        this.fn = fn;
        this.self = self || null;
        this.args = args;
        this.cancelled = false;
    }

    cancel() {
        this.cancelled = true;
        this.resolve(DROPPED);
    }
}

const throttleNoInterval = (count, drop, dropLast, fn) => {
    const queue = new collection.LinkedList();
    let release = null;

    const run = (fn, self, args) => {
        if (count) {
            count--;
            const result = new Promise((resolve) => {
                resolve(fn.apply(self, args));
            });
            result.then(release, release);
            return result;
        }
        if (drop) {
            if (dropLast) {
                return Promise.resolve(DROPPED);
            }
            if (queue.length) {
                // cancel the last delayed call
                queue.shift().cancel();
            }
        }
        return new Promise((resolve) => {
            queue.push(new Delayed(resolve, fn, self, args));
        });
    };

    release = () => {
        count++;
        if (!queue.empty) {
            const next = queue.shift();
            next.resolve(run(next.fn, next.self, next.args));
        }
    };

    if (is.function(count)) {
        [fn, count] = [count, fn];
    }
    if (!is.number(count)) {
        throw new x.InvalidArgument(`Expected size to be a number but got ${typeof count}`);
    }
    if (is.function(fn)) {
        return function (...args) {
            return run(fn, this, args);
        };
    }
    return function (fn, ...args) {
        if (!is.function(fn)) {
            throw new x.InvalidArgument(`Expected fn to be a function but got ${typeof fn}`);
        }
        return run(fn, this, args);
    };
};

export default function throttle(fn, opts = {}) {
    if (!is.function(fn)) {
        [fn, opts] = [opts, fn];
    }
    if (is.number(opts)) {
        opts = { interval: opts };
    }
    const { max = 1, interval = 0, ordered = true, waitForReturn = true, drop = false, dropLast = true } = opts;

    if (!interval) {
        return throttleNoInterval(max, drop, dropLast, fn);
    }

    const limiter = new util.RateLimiter(max, interval);

    let getFn;

    if (is.function(fn)) {
        getFn = (args) => [fn, args];
    } else {
        getFn = (args) => {
            const fn = args.shift();
            return [fn, args];
        };
    }

    let removeTokens = () => limiter.removeTokens(1);

    if (ordered) {
        removeTokens = throttleNoInterval(1, false, false, removeTokens);
    }

    let removing = false;
    let delayed = null;

    let executor = (self, fn, args) => {
        if (limiter.tryRemoveTokens(1)) {
            return new Promise((resolve) => {
                resolve(fn.apply(self, args));
            });
        }
        if (drop) {
            if (dropLast) {
                return Promise.resolve(DROPPED);
            }
            if (delayed) {
                delayed.cancel();
            }
            if (removing) {
                return new Promise((resolve) => {
                    delayed = new Delayed(resolve, fn, self, args);
                });
            }
        }
        removing = true;
        return removeTokens().then(() => {
            removing = false;
            if (delayed) {
                const d = delayed;
                delayed = null;

                d.resolve(d.fn.apply(d.self, d.args));
                return DROPPED;
            }
            return fn.apply(self, args);
        });
    };

    if (waitForReturn) {
        executor = throttleNoInterval(1, drop, dropLast, executor);
    }

    return function throttled(...args) {
        const [fn, _args] = getFn(args);
        return executor(this, fn, _args);
    };
}

throttle.DROPPED = DROPPED;
