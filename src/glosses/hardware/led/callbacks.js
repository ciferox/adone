const noop = function () { };

module.exports = function (klass, methods) {
    // Methods with callbacks need to have the callback called
    // as a result of all entries reaching completion, not
    // calling the callback once for each entry completion.
    // Uses an array to match pattern in Led, and may be more
    // in future.
    methods.forEach((method) => {
        klass.prototype[method] = function (duration, callback) {
            const length = this.length;
            const signals = [];
            let led;

            if (typeof duration === "function") {
                callback = duration;
                duration = 1000;
            }

            if (typeof callback !== "function") {
                callback = noop;
            }

            for (let i = 0; i < length; i++) {
                led = this[i];
                signals.push(
                    /* jshint ignore:start */
                    new Promise((resolve) => {
                        led[method](duration, () => {
                            resolve();
                        });
                    })
                    /* jshint ignore:end */
                );
            }

            Promise.all(signals).then(callback);

            return this;
        };
    });
};
