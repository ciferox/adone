const { is } = adone;

class Delayed {
    constructor(resolve, fn, self, args) {
        this.resolve = resolve;
        this.fn = fn;
        this.self = self || null;
        this.args = args;
    }
}

export default function throat(size, fn) {
    const queue = [];
    let release = null;

    const run = (fn, self, args) => {
        if (size) {
            size--;
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
        size++;
        if (queue.length) {
            const next = queue.shift();
            next.resolve(run(next.fn, next.self, next.args));
        }
    };

    if (is.function(size)) {
        const temp = fn;
        fn = size;
        size = temp;
    }
    if (!is.number(size)) {
        throw new TypeError(
            `Expected throat size to be a number but got ${typeof size}`
        );
    }
    if (!is.undefined(fn) && !is.function(fn)) {
        throw new TypeError(`Expected throat fn to be a function but got ${typeof (fn)}`);
    }
    if (is.function(fn)) {
        return function () {
            const args = [];
            for (let i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            return run(fn, this, args);
        };
    }
    return function (fn) {
        if (!is.function(fn)) {
            throw new TypeError(`Expected throat fn to be a function but got ${typeof (fn)}`);
        }
        const args = [];
        for (let i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return run(fn, this, args);
    };
}
