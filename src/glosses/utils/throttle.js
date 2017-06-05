const { is, x, util, collection } = adone;

class Delayed {
    constructor(resolve, fn, self, args) {
        this.resolve = resolve;
        this.fn = fn;
        this.self = self || null;
        this.args = args;
    }
}

const throttleNoInterval = (count, fn) => {
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
    const { max = 1, interval = 0, ordered = true, waitForReturn = true } = opts;

    if (!interval) {
        return throttleNoInterval(max, fn);
    }

    const limiter = new util.RateLimiter(max, interval);

    let getToken = () => limiter.removeTokens(1);

    if (!waitForReturn) {
        if (ordered) {
            getToken = throttleNoInterval(1, getToken);
        }

        if (is.function(fn)) {
            return async function throttled(...args) {
                await getToken();
                return fn.apply(this, args);
            };
        }
        return async function throttled(fn, ...args) {
            await getToken();
            return fn.apply(this, args);
        };
    }

    if (is.function(fn)) {
        const executor = throttleNoInterval(1, async (self, args) => {
            await getToken();
            return fn.apply(self, args);
        });

        return function throttled(...args) {
            return executor(this, args);
        };
    }

    const executor = throttleNoInterval(1, async (fn, self, args) => {
        await getToken();
        return fn.apply(self, args);
    });

    return function throttled(fn, ...args) {
        return executor(fn, this, args);
    };
}
