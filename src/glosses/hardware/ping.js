const Emitter = require("events").EventEmitter;
const util = require("util");

const Board = require("./board");
const Fn = require("./fn");
const within = require("./mixins/within");

const toFixed = Fn.toFixed;

const priv = new Map();

/**
 * Ping
 * @param {Object} opts Options: pin
 */

function Ping(opts) {

    if (!(this instanceof Ping)) {
        return new Ping(opts);
    }

    let last = null;

    Board.Component.call(
        this, opts = Board.Options(opts)
    );

    this.pin = opts && opts.pin || 7;
    this.freq = opts.freq || 20;
    // this.pulse = opts.pulse || 250;

    const state = {
        value: null
    };

    // Private settings object
    const settings = {
        pin: this.pin,
        value: this.io.HIGH,
        pulseOut: 5
    };

    this.io.setMaxListeners(100);

    // Interval for polling pulse duration as reported in microseconds
    setInterval(() => {
        this.io.pingRead(settings, (microseconds) => {
            state.value = microseconds;
        });
    }, 225);

    // Interval for throttled event
    setInterval(() => {
        if (state.value === null) {
            return;
        }

        // The "read" event has been deprecated in
        // favor of a "data" event.
        this.emit("data", state.value);

        // If the state.value for this interval is not the same as the
        // state.value in the last interval, fire a "change" event.
        if (state.value !== last) {
            this.emit("change", state.value);
        }

        // Store state.value for comparison in next interval
        last = state.value;

        // Reset samples;
        // samples.length = 0;
    }, this.freq);

    Object.defineProperties(this, {
        value: {
            get() {
                return state.value;
            }
        },
        // Based on the round trip travel time in microseconds,
        // Calculate the distance in inches and centimeters
        inches: {
            get() {
                return toFixed(state.value / 74 / 2, 2);
            }
        },
        in: {
            get() {
                return this.inches;
            }
        },
        cm: {
            get() {
                return toFixed(state.value / 29 / 2, 3);
            }
        }
    });

    priv.set(this, state);
}

util.inherits(Ping, Emitter);

Object.assign(Ping.prototype, within);

module.exports = Ping;


//http://itp.nyu.edu/physcomp/Labs/Servo
//http://arduinobasics.blogspot.com/2011/05/arduino-uno-flex-sensor-and-leds.html
//http://protolab.pbworks.com/w/page/19403657/TutorialPings
