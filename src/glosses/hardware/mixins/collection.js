const IS_TEST_MODE = Boolean(process.env.IS_TEST_MODE);
const Emitter = require("events").EventEmitter;
const util = require("util");
const priv = new Map();

/**
 * Collection
 *
 * Make Collections for output classes
 *
 * @param {[type]} numsOrObjects
 */
function Collection(numsOrObjects) {
    const Type = this.type;
    let initObjects = [];

    this.length = 0;

    if (Array.isArray(numsOrObjects)) {
        initObjects = numsOrObjects;
    } else {
        // Initialize with a Shared Properties object
        /* istanbul ignore else */
        if (Array.isArray(numsOrObjects.pins)) {
            const keys = Object.keys(numsOrObjects).filter((key) => {
                return key !== "pins";
            });
            initObjects = numsOrObjects.pins.map((pin) => {
                const obj = {};

                if (Array.isArray(pin)) {
                    obj.pins = pin;
                } else {
                    obj.pin = pin;
                }

                return keys.reduce((accum, key) => {
                    accum[key] = numsOrObjects[key];
                    return accum;
                }, obj);
            });
        }
    }

    /* istanbul ignore else */
    if (initObjects.length) {
        while (initObjects.length) {
            let numOrObject = initObjects.shift();

            // When a Type exists, respect it!
            if (typeof Type === "function") {
                if (!(numOrObject instanceof Type || numOrObject instanceof this.constructor)) {
                    numOrObject = new Type(numOrObject);
                }
            }

            this.add(numOrObject);
        }
    }
}

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    Collection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

Collection.prototype.add = function () {
    let length = this.length;
    const aLen = arguments.length;

    for (let i = 0; i < aLen; i++) {
        // When a Type exists, respect it!
        if (this.type) {
            if (arguments[i] instanceof this.type ||
                arguments[i] instanceof this.constructor) {
                this[length++] = arguments[i];
            }
        } else {
            // Otherwise allow user to directly instantiate
            // Collection or Collection.Emitter to create
            // a mixed collection
            this[length++] = arguments[i];
        }
    }

    return (this.length = length);
};

Collection.prototype.each = function (callbackFn) {
    const length = this.length;

    for (let i = 0; i < length; i++) {
        callbackFn.call(this[i], this[i], i);
    }

    return this;
};

Collection.prototype.forEach = function () {
    [].forEach.apply(this, arguments);
};

Collection.prototype.includes = function () {
    return [].includes.apply(this, arguments);
};

Collection.prototype.indexOf = function () {
    return [].indexOf.apply(this, arguments);
};

Collection.prototype.map = function () {
    return [].map.apply(this, arguments);
};

Collection.prototype.slice = function () {
    return new this.constructor([].slice.apply(this, arguments));
};

Collection.prototype.byId = function (id) {
    return [].find.call(this, (entry) => {
        return entry.id !== undefined && entry.id === id;
    });
};

/**
 * Collection.installMethodForwarding
 *
 * Copy single method to collection class
 *
 * @param  {Object} target Target prototype
 * @param  {Object} source Source prototype
 * @return {Object} target Modified Target prototype
 */
Collection.installMethodForwarding = function (target, source) {
    return Object.keys(source).reduce((accum, method) => {
        // Create Inputs wrappers for each method listed.
        // This will allow us control over all Input instances
        // simultaneously.
        accum[method] = function () {
            const length = this.length;

            for (let i = 0; i < length; i++) {
                this[i][method].apply(this[i], arguments);
            }
            return this;
        };

        return accum;
    }, target);
};



/**
 * Collection.Emitter
 *
 * Make Collections for input classes
 *
 * @param {[type]} numsOrObjects
 *
 */
Collection.Emitter = function (numsOrObjects) {

    // Create private state ahead of super call
    priv.set(this, {
        timing: {
            last: Date.now()
        }
    });

    Collection.call(this, numsOrObjects);

    // If the Collection.Emitter was created
    // with a Shared Properties object, then
    // we should abide by the freq or period
    // properties...
    let interval = null;
    let period = 5;

    if (!Array.isArray(numsOrObjects) &&
        (typeof numsOrObjects === "object" && numsOrObjects !== null)) {

        period = numsOrObjects.freq || numsOrObjects.period || period;

        // _However_, looking to the future, we
        // need to start thinking about replacing
        // the garbage named _freq_ (the value is
        // actually a period), with real _frequency_
        // in Hz.

        // If provided, convert frequency to period
        /* istanbul ignore else */
        if (numsOrObjects.frequency) {
            period = (1 / numsOrObjects.frequency) * 1000;
        }
    }

    Object.defineProperties(this, {
        period: {
            get() {
                return period;
            },
            set(value) {
                if (period !== value) {
                    period = value;
                }

                if (interval) {
                    clearInterval(interval);
                }

                interval = setInterval(() => {
                    this.emit("data", this);
                }, period);
            }
        }
    });

    this.period = period;

    this.on("newListener", function (event) {
        if (event === "change" || event === "data") {
            return;
        }

        this.forEach(function (input) {
            input.on(event, (data) => {
                this.emit(event, input, data);
            });
        }, this);
    });
};

util.inherits(Collection.Emitter, Collection);

Object.assign(Collection.Emitter.prototype, Emitter.prototype);

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    Collection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

Collection.Emitter.prototype.add = function () {
    const inputs = Array.from(arguments);

    /* istanbul ignore else */
    if (inputs.length) {
        Collection.prototype.add.apply(this, inputs);

        inputs.forEach(function (input) {
            if (input) {
                input.on("change", () => {
                    this.emit("change", input);
                });
            }
        }, this);
    }
    return this.length;
    // return (this.length = length);
};

/* istanbul ignore else */
if (IS_TEST_MODE) {
    Collection.purge = function () {
        priv.clear();
    };
}

module.exports = Collection;
