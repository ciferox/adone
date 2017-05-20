const Board = require("../board");
const Animation = require("../animation");
const Expander = require("../expander");
const Fn = require("../fn");
const Pins = Board.Pins;

const priv = new Map();

const Controllers = {
    PCA9685: {
        initialize: {
            value(opts) {

                const state = priv.get(this);

                this.address = opts.address || 0x40;
                this.pwmRange = opts.pwmRange || [0, 4095];
                this.frequency = opts.frequency || 200;

                state.expander = Expander.get({
                    address: this.address,
                    controller: this.controller,
                    bus: this.bus,
                    pwmRange: this.pwmRange,
                    frequency: this.frequency
                });

                this.pin = state.expander.normalize(opts.pin);

                state.mode = this.io.MODES.PWM;
            }
        },
        update: {
            writable: true,
            value(input) {
                const state = priv.get(this);
                const output = typeof input !== "undefined" ? input : state.value;
                const value = state.isAnode ? 255 - Board.constrain(output, 0, 255) : output;
                this.write(value);
            }
        },
        write: {
            writable: true,
            value(value) {
                const state = priv.get(this);
                state.expander.analogWrite(this.pin, value);
            }
        }
    },
    DEFAULT: {
        initialize: {
            value(opts, pinValue) {

                const state = priv.get(this);
                let isFirmata = true;
                let defaultLed;

                isFirmata = Pins.isFirmata(this);

                if (isFirmata && typeof pinValue === "string" && pinValue[0] === "A") {
                    pinValue = this.io.analogPins[Number(pinValue.slice(1))];
                }

                defaultLed = this.io.defaultLed || 13;
                pinValue = Number(pinValue);

                if (isFirmata && this.io.analogPins.includes(pinValue)) {
                    this.pin = pinValue;
                    state.mode = this.io.MODES.OUTPUT;
                } else {
                    this.pin = typeof opts.pin === "undefined" ? defaultLed : opts.pin;
                    state.mode = this.io.MODES[
                        (this.board.pins.isPwm(this.pin) ? "PWM" : "OUTPUT")
                    ];
                }

                this.io.pinMode(this.pin, state.mode);
            }
        },
        update: {
            writable: true,
            value(input) {
                const state = priv.get(this);
                const output = typeof input !== "undefined" ? input : state.value;
                let value = state.isAnode ? 255 - Board.constrain(output, 0, 255) : output;

                // If pin is not a PWM pin and brightness is not HIGH or LOW, emit an error
                if (value !== this.io.LOW && value !== this.io.HIGH && this.mode !== this.io.MODES.PWM) {
                    Board.Pins.Error({
                        pin: this.pin,
                        type: "PWM",
                        via: "Led"
                    });
                }

                if (state.mode === this.io.MODES.OUTPUT) {
                    value = output;
                }

                this.write(value);
            }
        },
        write: {
            writable: true,
            value(value) {
                const state = priv.get(this);

                if (state.mode === this.io.MODES.OUTPUT) {
                    this.io.digitalWrite(this.pin, value);
                }

                if (state.mode === this.io.MODES.PWM) {
                    this.io.analogWrite(this.pin, value);
                }
            }
        }
    }
};

/**
 * Led
 * @constructor
 *
 * five.Led(pin);
 *
 * five.Led({
 *   pin: number
 *  });
 *
 *
 * @param {Object} opts [description]
 *
 */

function Led(opts) {
    if (!(this instanceof Led)) {
        return new Led(opts);
    }

    const pinValue = typeof opts === "object" ? opts.pin : opts;
    let controller = null;

    Board.Component.call(
        this, opts = Board.Options(opts)
    );

    if (opts.controller && typeof opts.controller === "string") {
        controller = Controllers[opts.controller.toUpperCase()];
    } else {
        controller = opts.controller;
    }

    if (controller == null) {
        controller = Controllers.DEFAULT;
    }

    Object.defineProperties(this, controller);

    const state = {
        isAnode: opts.isAnode,
        isOn: false,
        isRunning: false,
        value: null,
        direction: 1,
        mode: null,
        intensity: 0,
        interval: null
    };

    priv.set(this, state);

    Object.defineProperties(this, {
        value: {
            get() {
                return state.value;
            }
        },
        mode: {
            get() {
                return state.mode;
            }
        },
        isOn: {
            get() {
                return Boolean(state.value);
            }
        },
        isRunning: {
            get() {
                return state.isRunning;
            }
        },
        animation: {
            get() {
                return state.animation;
            }
        }
    });

    /* istanbul ignore else */
    if (typeof this.initialize === "function") {
        this.initialize(opts, pinValue);
    }
}

/**
 * on Turn the led on
 * @return {Led}
 */
Led.prototype.on = function () {
    const state = priv.get(this);

    if (state.mode === this.io.MODES.OUTPUT) {
        state.value = this.io.HIGH;
    }

    if (state.mode === this.io.MODES.PWM) {
        // Assume we need to simply turn this all the way on, when:

        // ...state.value is null
        if (state.value === null) {
            state.value = 255;
        }

        // ...there is no active interval
        if (!state.interval) {
            state.value = 255;
        }

        // ...the last value was 0
        if (state.value === 0) {
            state.value = 255;
        }
    }

    this.update();

    return this;
};

/**
 * off  Turn the led off
 * @return {Led}
 */
Led.prototype.off = function () {
    const state = priv.get(this);

    state.value = 0;

    this.update();

    return this;
};

/**
 * toggle Toggle the on/off state of an led
 * @return {Led}
 */
Led.prototype.toggle = function () {
    return this[this.isOn ? "off" : "on"]();
};

/**
 * brightness
 * @param  {Number} value analog brightness value 0-255
 * @return {Led}
 */
Led.prototype.brightness = function (brightness) {
    const state = priv.get(this);
    state.value = brightness;

    this.update();

    return this;
};

/**
 * intensity
 * @param  {Number} value Light intensity 0-100
 * @return {Led}
 */
Led.prototype.intensity = function (intensity) {
    const state = priv.get(this);

    if (arguments.length === 0) {
        return state.intensity;
    }

    state.intensity = Fn.constrain(intensity, 0, 100);

    return this.brightness(Fn.scale(state.intensity, 0, 100, 0, 255));
};

/**
 * Animation.normalize
 *
 * @param [number || object] keyFrames An array of step values or a keyFrame objects
 */

Led.prototype[Animation.normalize] = function (keyFrames) {
    const state = priv.get(this);

    // If user passes null as the first element in keyFrames use current value
    /* istanbul ignore else */
    if (keyFrames[0] === null) {
        keyFrames[0] = {
            value: state.value || 0
        };
    }

    return keyFrames.map((frame) => {
        const value = frame;
        /* istanbul ignore else */
        if (frame !== null) {
            // frames that are just numbers represent values
            if (typeof frame === "number") {
                frame = {
                    value
                };
            } else {
                if (typeof frame.brightness === "number") {
                    frame.value = frame.brightness;
                    delete frame.brightness;
                }
                if (typeof frame.intensity === "number") {
                    frame.value = Fn.scale(frame.intensity, 0, 100, 0, 255);
                    delete frame.intensity;
                }
            }

            /* istanbul ignore else */
            if (!frame.easing) {
                frame.easing = "linear";
            }
        }
        return frame;
    });
};

/**
 * Animation.render
 *
 * @position [number] value to set the led to
 */

Led.prototype[Animation.render] = function (position) {
    const state = priv.get(this);
    state.value = position[0];
    return this.update();
};

/**
 * pulse Fade the Led in and out in a loop with specified time
 * @param  {number} duration Time in ms that a fade in/out will elapse
 * @return {Led}
 *
 * - or -
 *
 * @param  {Object} val An Animation() segment config object
 */

Led.prototype.pulse = function (duration, callback) {
    const state = priv.get(this);

    this.stop();

    const options = {
        duration: typeof duration === "number" ? duration : 1000,
        keyFrames: [0, 0xff],
        metronomic: true,
        loop: true,
        easing: "inOutSine",
        onloop() {
            /* istanbul ignore else */
            if (typeof callback === "function") {
                callback();
            }
        }
    };

    if (typeof duration === "object") {
        Object.assign(options, duration);
    }

    if (typeof duration === "function") {
        callback = duration;
    }

    state.isRunning = true;

    state.animation = state.animation || new Animation(this);
    state.animation.enqueue(options);
    return this;
};

/**
 * fade Fade an led in and out
 * @param  {Number} val  Analog brightness value 0-255
 * @param  {Number} duration Time in ms that a fade in/out will elapse
 * @return {Led}
 *
 * - or -
 *
 * @param  {Object} val An Animation() segment config object
 */

Led.prototype.fade = function (val, duration, callback) {

    const state = priv.get(this);

    this.stop();

    const options = {
        duration: typeof duration === "number" ? duration : 1000,
        keyFrames: [null, typeof val === "number" ? val : 0xff],
        easing: "outSine",
        oncomplete() {
            state.isRunning = false;
            /* istanbul ignore else */
            if (typeof callback === "function") {
                callback();
            }
        }
    };

    if (typeof val === "object") {
        Object.assign(options, val);
    }

    if (typeof val === "function") {
        callback = val;
    }

    if (typeof duration === "object") {
        Object.assign(options, duration);
    }

    if (typeof duration === "function") {
        callback = duration;
    }

    state.isRunning = true;

    state.animation = state.animation || new Animation(this);
    state.animation.enqueue(options);

    return this;
};

Led.prototype.fadeIn = function (duration, callback) {
    return this.fade(255, duration || 1000, callback);
};

Led.prototype.fadeOut = function (duration, callback) {
    return this.fade(0, duration || 1000, callback);
};

/**
 * blink
 * @param  {Number} duration Time in ms on, time in ms off
 * @return {Led}
 */
Led.prototype.blink = function (duration, callback) {
    const state = priv.get(this);

    // Avoid traffic jams
    this.stop();

    if (typeof duration === "function") {
        callback = duration;
        duration = null;
    }

    state.isRunning = true;

    state.interval = setInterval(() => {
        this.toggle();
        if (typeof callback === "function") {
            callback();
        }
    }, duration || 100);

    return this;
};

Led.prototype.strobe = Led.prototype.blink;

/**
 * stop Stop the led from strobing, pulsing or fading
 * @return {Led}
 */
Led.prototype.stop = function () {
    const state = priv.get(this);

    if (state.interval) {
        clearInterval(state.interval);
    }

    if (state.animation) {
        state.animation.stop();
    }

    state.interval = null;
    state.isRunning = false;

    return this;
};

/* istanbul ignore else */
if (process.env.IS_TEST_MODE) {
    Led.Controllers = Controllers;
    Led.purge = function () {
        priv.clear();
    };
}


module.exports = Led;
