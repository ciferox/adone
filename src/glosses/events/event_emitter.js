const {
    is,
    x,
    util: { spliceOne }
} = adone;

const $events = Symbol.for("events");
const $eventsCount = Symbol.for("eventsCount");
const $maxListeners = Symbol.for("maxListeners");

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
let defaultMaxListeners = 10;

const _addListener = (target, type, listener, prepend) => {
    if (!is.function(listener)) {
        throw new x.InvalidArgument("\"listener\" argument must be a function");
    }
    let events = target[$events];
    if (!events) {
        events = target[$events] = Object.create(null);
    } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
            target.emit("newListener", type, listener.listener ? listener.listener : listener);

            // Re-assign `events` because a newListener handler could have caused the
            // this._events to be assigned to a new object
            events = target[$events];
        }
    }
    let existing = events[type];

    if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target[$eventsCount];
    } else {
        if (is.function(existing)) {
            // Adding the second element, need to change to array.
            existing = events[type] = prepend ? [listener, existing] : [existing, listener];
        } else {
            if (prepend) {
                existing.unshift(listener);
            } else {
                existing.push(listener);
            }
        }

        // Check for listener leak
        if (!existing.warned) {
            const m = target.getMaxListeners();
            if (m && m > 0 && existing.length > m) {
                existing.warned = true;
                const w = new x.Exception(`Possible EventEmitter memory leak detected. ${existing.length} ${String(type)} listeners added. Use emitter.setMaxListeners() to increase limit`);
                w.name = "MaxListenersExceededWarning";
                w.emitter = target;
                w.type = type;
                w.count = existing.length;
                process.emitWarning(w);
            }
        }
    }

    return target;
};

const arrayClone = (arr, n) => {
    const copy = new Array(n);
    for (let i = 0; i < n; ++i) {
        copy[i] = arr[i];
    }
    return copy;
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
const emitNone = (handler, isFn, self) => {
    if (isFn) {
        handler.call(self);

    } else {
        const len = handler.length;
        const listeners = arrayClone(handler, len);
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self);
        }
    }
};

const emitOne = (handler, isFn, self, arg1) => {
    if (isFn) {
        handler.call(self, arg1);

    } else {
        const len = handler.length;
        const listeners = arrayClone(handler, len);
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1);
        }
    }
};

const emitTwo = (handler, isFn, self, arg1, arg2) => {
    if (isFn) {
        handler.call(self, arg1, arg2);
    } else {
        const len = handler.length;
        const listeners = arrayClone(handler, len);
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1, arg2);
        }
    }
};

const emitThree = (handler, isFn, self, arg1, arg2, arg3) => {
    if (isFn) {
        handler.call(self, arg1, arg2, arg3);
    } else {
        const len = handler.length;
        const listeners = arrayClone(handler, len);
        for (let i = 0; i < len; ++i) {
            listeners[i].call(self, arg1, arg2, arg3);
        }
    }
};

const emitMany = (handler, isFn, self, args) => {
    if (isFn) {
        handler.apply(self, args);
    } else {
        const len = handler.length;
        const listeners = arrayClone(handler, len);
        for (let i = 0; i < len; ++i) {
            listeners[i].apply(self, args);
        }
    }
};

const onceWrapper = function () {
    if (!this.fired) {
        this.target.removeListener(this.type, this.wrapFn);
        this.fired = true;
        switch (arguments.length) {
            case 0:
                return this.listener.call(this.target);
            case 1:
                return this.listener.call(this.target, arguments[0]);
            case 2:
                return this.listener.call(this.target, arguments[0], arguments[1]);
            case 3:
                return this.listener.call(this.target, arguments[0], arguments[1], arguments[2]);
            default: {
                const args = new Array(arguments.length);
                for (let i = 0; i < args.length; ++i) {
                    args[i] = arguments[i];
                }
                this.listener.apply(this.target, args);
            }
        }
    }
};

const _onceWrap = (target, type, listener) => {
    const state = { fired: false, wrapFn: undefined, target, type, listener };
    const wrapped = onceWrapper.bind(state);
    wrapped.listener = listener;
    state.wrapFn = wrapped;
    return wrapped;
};

const unwrapListeners = (arr) => {
    const ret = new Array(arr.length);
    for (let i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
    }
    return ret;
};

const explicitPropagate = (events, source, dest) => {
    let eventsIn;
    let eventsOut;
    if (is.array(events)) {
        eventsIn = events;
        eventsOut = events;
    } else {
        eventsIn = Object.keys(events);
        eventsOut = eventsIn.map((key) => {
            return events[key];
        });
    }

    const listeners = eventsOut.map((event) => {
        return function (...args) {
            args.unshift(event);
            dest.emit.apply(dest, args);
        };
    });

    const register = (listener, i) => {
        source.on(eventsIn[i], listener);
    };

    const unregister = (listener, i) => {
        source.removeListener(eventsIn[i], listener);
    };

    const end = () => {
        listeners.forEach(unregister);
    };

    listeners.forEach(register);

    return {
        end
    };
};


export default class EventEmitter {
    constructor() {
        this[$events] = Object.create(null);
        this[$eventsCount] = 0;
        this[$maxListeners] = EventEmitter.defaultMaxListeners;
    }

    getMaxListeners() {
        return this[$maxListeners];
    }

    setMaxListeners(n) {
        if (!is.number(n) || is.nan(n) || n < 0) {
            throw new x.InvalidArgument("\"n\" argument must be a positive number");
        }
        this[$maxListeners] = n;
    }

    emit(type) {
        const isError = type === "error";

        const events = this[$events];

        // If there is no 'error' event listener then throw.
        if (isError && !events.error) {
            let er = null;
            if (arguments.length > 1) {
                er = arguments[1];
            }
            if (er instanceof Error) {
                throw er; // Unhandled 'error' event
            } else {
                // At least give some kind of context to the user
                const err = new x.Exception(`Uncaught, unspecified "error" event. (${er})`);
                err.context = er;
                throw err;
            }
        }

        const handler = events[type];

        if (!handler) {
            return false;
        }

        const isFn = is.function(handler);
        const len = arguments.length;
        switch (len) {
            // fast cases
            case 1:
                emitNone(handler, isFn, this);
                break;
            case 2:
                emitOne(handler, isFn, this, arguments[1]);
                break;
            case 3:
                emitTwo(handler, isFn, this, arguments[1], arguments[2]);
                break;
            case 4:
                emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
                break;
            // slower
            default: {
                const args = new Array(len - 1);
                for (let i = 1; i < len; i++) {
                    args[i - 1] = arguments[i];
                }
                emitMany(handler, isFn, this, args);
            }
        }
        return true;
    }

    addListener(type, listener) {
        return _addListener(this, type, listener, false);
    }

    prependListener(type, listener) {
        return _addListener(this, type, listener, true);
    }

    once(type, listener) {
        if (!is.function(listener)) {
            throw new x.InvalidArgument("\"listener\" argument must be a function");
        }
        this.on(type, _onceWrap(this, type, listener));
        return this;
    }

    prependOnceListener(type, listener) {
        if (!is.function(listener)) {
            throw new x.InvalidArgument("\"listener\" argument must be a function");
        }
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
    }

    removeListener(type, listener) {
        if (!is.function(listener)) {
            throw new x.InvalidArgument("\"listener\" argument must be a function");
        }

        const events = this[$events];

        const list = events[type];
        if (!list) {
            return this;
        }

        if (list === listener || list.listener === listener) {
            if (--this[$eventsCount] === 0) {
                this[$events] = Object.create(null);
            } else {
                delete events[type];
                if (events.removeListener) {
                    this.emit("removeListener", type, list.listener || listener);
                }
            }
        } else if (!is.function(list)) {
            let position = -1;
            let originalListener;

            for (let i = list.length - 1; i >= 0; i--) {
                if (list[i] === listener || list[i].listener === listener) {
                    originalListener = list[i].listener;
                    position = i;
                    break;
                }
            }

            if (position < 0) {
                return this;
            }

            if (position === 0) {
                list.shift();
            } else {
                spliceOne(list, position);
            }

            if (list.length === 1) {
                events[type] = list[0];
            }

            if (events.removeListener) {
                this.emit("removeListener", type, originalListener || listener);
            }
        }

        return this;
    }

    removeAllListeners(type) {
        const events = this[$events];

        // not listening for removeListener, no need to emit
        if (!events.removeListener) {
            if (arguments.length === 0) {
                this[$events] = Object.create(null);
                this[$eventsCount] = 0;
            } else if (events[type]) {
                if (--this[$eventsCount] === 0) {
                    this[$events] = Object.create(null);
                } else {
                    delete events[type];
                }
            }
            return this;
        }

        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
            const keys = Object.keys(events);
            for (let i = 0, key; i < keys.length; ++i) {
                key = keys[i];
                if (key === "removeListener") {
                    continue;
                }
                this.removeAllListeners(key);
            }
            this.removeAllListeners("removeListener");
            this[$events] = Object.create(null);
            this[$eventsCount] = 0;
            return this;
        }

        const listeners = events[type];

        if (is.function(listeners)) {
            this.removeListener(type, listeners);
        } else if (listeners) {
            // LIFO order
            for (let i = listeners.length - 1; i >= 0; i--) {
                this.removeListener(type, listeners[i]);
            }
        }

        return this;
    }

    listeners(type) {
        const evlistener = this[$events][type];
        if (!evlistener) {
            return [];
        }

        if (is.function(evlistener)) {
            return [evlistener.listener || evlistener];
        }

        return unwrapListeners(evlistener);
    }

    static listenerCount(emitter, type) {
        return emitter.listenerCount(type);
    }

    listenerCount(type) {
        const evlistener = this[$events][type];
        if (is.function(evlistener)) {
            return 1;
        }
        if (evlistener) {
            return evlistener.length;
        }
        return 0;
    }

    eventNames() {
        return this[$eventsCount] > 0 ? Reflect.ownKeys(this[$events]) : [];
    }

    static get defaultMaxListeners() {
        return defaultMaxListeners;
    }

    static set defaultMaxListeners(arg) {
        // check whether the input is a positive number (whose value is zero or
        // greater and not a NaN).
        // eslint-disable-next-line no-self-compare
        if (!is.number(arg) || arg < 0 || arg !== arg) {
            throw new TypeError('"defaultMaxListeners" must be a positive number');
        }
        defaultMaxListeners = arg;
    }

    propagateEvents(dest, events) {
        return this.constructor.propagateEvents(this, dest, events);
    }

    /**
     * @param {object | string[]} events
     */
    static propagateEvents(source, dest, events) {
        const eventsIsObject = is.object(events);

        if (events && !eventsIsObject) {
            events = [events];
        }

        if (events) {
            return explicitPropagate(events, source, dest);
        }

        // patch listener count?

        const oldEmit = source.emit;

        source.emit = function (...args) {
            oldEmit.apply(this, args);
            dest.emit(...args);
        };

        const end = () => {
            source.emit = oldEmit;
        };

        return {
            end
        };
    }
}

EventEmitter.prototype.on = EventEmitter.prototype.addListener;
