const { is, x, collection } = adone;

const __ = adone.lazify({
    RateLimiter: "./rate_limiter"
}, adone.asNamespace(exports), require);

export const DROPPED = Symbol("DROPPED");

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
        !is.null(this.resolve) && this.resolve(DROPPED);
    }
}

const throttleNoInterval = (concurrency, drop, dropLast, fn, onDone) => {
    let remaning = concurrency;
    const queue = new collection.LinkedList();
    let release = null;

    const run = (fn, self, args) => {
        if (remaning) {
            remaning--;

            let result;

            if (fn.length === 1) { // with callback
                result = fn.call(self, release, ...args);
            } else {
                result = fn.apply(self, args);
                if (is.promise(result)) {
                    result.then(release, release);
                }
            }

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

        if (fn.length === 1) {
            queue.push(new Delayed(null, fn, self, args));
        } else {
            return new Promise((resolve) => {
                queue.push(new Delayed(resolve, fn, self, args));
            });
        }
    };

    release = () => {
        remaning++;

        if (remaning === concurrency) {
            is.function(onDone) && onDone();
        }
        if (!queue.empty) {
            const next = queue.shift();
            if (is.null(next.resolve)) {
                run(next.fn, next.self, next.args);
            } else {
                next.resolve(run(next.fn, next.self, next.args));
            }
        }
    };

    if (is.function(fn)) {
        return function (...args) {
            return run(fn, this, args);
        };
    }
    return function (fn, ...args) {
        if (!is.function(fn)) {
            throw new x.InvalidArgument("The first argument must be a function");
        }
        return run(fn, this, args);
    };
};

export const create = function (fn, opts = {}) {
    if (!is.function(fn)) {
        [fn, opts] = [opts, fn];
    }
    if (is.number(opts)) {
        opts = { concurrency: opts };
    }
    const { concurrency = 1, interval = 0, ordered = true, waitForReturn = true, drop = false, dropLast = true, onDone } = opts;

    // Just for fun
    if (concurrency === Infinity) {
        throw new x.NotAllowed("Infinite concurrency is not allowed");
    }

    if (!interval) {
        return throttleNoInterval(concurrency, drop, dropLast, fn, onDone);
    }

    const limiter = new __.RateLimiter(concurrency, interval);

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
};


const done = function () {
    this.pending--;
    this._run();
};

export class Limiter {
    constructor(options) {
        options = options || {};
        this.concurrency = options.concurrency || Infinity;
        this.pending = 0;
        this.jobs = [];
        this.cbs = [];
        this._done = done.bind(this);
    }

    get length() {
        return this.pending + this.jobs.length;
    }

    _run() {
        if (this.pending === this.concurrency) {
            return;
        }
        if (this.jobs.length) {
            const job = this.jobs.shift();
            this.pending++;
            job(this._done);
            this._run();
        }

        if (this.pending === 0) {
            while (this.cbs.length !== 0) {
                const cb = this.cbs.pop();
                process.nextTick(cb);
            }
        }
    }

    onDone(cb) {
        if (is.function(cb)) {
            this.cbs.push(cb);
            this._run();
        }
    }

}

const arrayAddMethods = [
    "push",
    "unshift",
    "splice"
];

arrayAddMethods.forEach((method) => {
    Limiter.prototype[method] = function () {
        const methodResult = Array.prototype[method].apply(this.jobs, arguments);
        this._run();
        return methodResult;
    };
});
