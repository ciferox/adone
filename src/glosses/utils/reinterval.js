const { is } = adone;

class ReInterval {
    constructor(callback, interval, args) {
        this._callback = callback;
        this._args = args;

        this._interval = setInterval(callback, interval, this._args);

        this.reschedule = (interval) => {
            // if no interval entered, use the interval passed in on creation
            if (!interval) {
                interval = this._interval;
            }

            if (this._interval) {
                clearInterval(this._interval);
            }
            this._interval = setInterval(this._callback, interval, this._args);
        };

        this.clear = () => {
            if (this._interval) {
                clearInterval(this._interval);
                this._interval = undefined;
            }
        };

        this.destroy = () => {
            if (this._interval) {
                clearInterval(this._interval);
            }
            this._callback = undefined;
            this._interval = undefined;
            this._args = undefined;
        };
    }
}

const reinterval = (...args) => {
    if (!is.function(args[0])) {
        throw new Error("Callback needed");
    }
    if (!is.number(args[1])) {
        throw new Error("Interval needed");
    }

    let extArgs;

    if (args.length > 0) {
        extArgs = new Array(args.length - 2);

        for (let i = 0; i < args.length; i++) {
            extArgs[i] = args[i + 2];
        }
    }

    return new ReInterval(args[0], args[1], extArgs);
};

export default reinterval;
