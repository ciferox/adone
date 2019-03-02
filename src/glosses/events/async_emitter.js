const {
    is,
    util
} = adone;

const ONCE_MAPPING = Symbol.for("asyncEmitter:onceMapping");
const MANAGER = Symbol();

export default class AsyncEmitter extends adone.event.Emitter {
    constructor(concurrency = null) {
        super();
        if (concurrency >= 1) {
            this.setConcurrency(concurrency);
        }
        this[ONCE_MAPPING] = new Map();
    }

    setConcurrency(concurrency = null) {
        if (concurrency >= 1) {
            this[MANAGER] = util.throttle.create({ concurrency });
        } else {
            this[MANAGER] = null;
        }
        return this;
    }

    emitParallel(event, ...args) {
        const promises = [];

        this.listeners(event).forEach((listener) => {
            promises.push(this._executeListener(listener, args));
        });

        return Promise.all(promises);
    }

    emitSerial(event, ...args) {
        return this.listeners(event).reduce((promise, listener) => promise.then((values) =>
            this._executeListener(listener, args).then((value) => {
                values.push(value);
                return values;
            })
        ), Promise.resolve([]));
    }

    emitReduce(event, ...args) {
        return this._emitReduceRun(event, args);
    }

    emitReduceRight(event, ...args) {
        return this._emitReduceRun(event, args, true);
    }

    once(event, listener) {
        if (!is.function(listener)) {
            throw new TypeError("listener must be a function");
        }
        let fired = false;
        const self = this;
        const onceListener = function (...args) {
            self.removeListener(event, onceListener);
            if (fired === false) {
                fired = true;
                return listener.apply(this, args);
            }
            return undefined;
        };
        this.on(event, onceListener);
        this[ONCE_MAPPING].set(listener, onceListener);
        return this;
    }

    removeListener(event, listener) {
        if (this[ONCE_MAPPING].has(listener)) {
            const t = this[ONCE_MAPPING].get(listener);
            this[ONCE_MAPPING].delete(listener);
            listener = t;
        }
        return super.removeListener(event, listener);
    }

    subscribe(event, listener, once = false) {
        const unsubscribe = () => {
            this.removeListener(event, listener);
        };

        if (once) {
            this.once(event, listener);
        } else {
            this.on(event, listener);
        }

        return unsubscribe;
    }

    _emitReduceRun(event, args, inverse = false) {
        const listeners = inverse ? this.listeners(event).reverse() : this.listeners(event);
        return listeners.reduce((promise, listener) => promise.then((prevArgs) => {
            const currentArgs = is.array(prevArgs) ? prevArgs : [prevArgs];
            return this._executeListener(listener, currentArgs);
        }), Promise.resolve(args));
    }

    _executeListener(listener, args) {
        try {
            if (this[MANAGER]) {
                return this[MANAGER](() => listener(...args));
            }
            return Promise.resolve(listener(...args));
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
