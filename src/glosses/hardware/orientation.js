const Emitter = require("events").EventEmitter;
const util = require("util");

const Board = require("./board");

const priv = new Map();

const Controllers = {

    BNO055: {
        initialize: {
            value(opts, dataHandler) {
                let IMU = require("./imu"),
                    driver = IMU.Drivers.get(this.board, "BNO055", opts);

                driver.on("data", (data) => {
                    dataHandler(data);
                });
            }
        },
        toScaledEuler: {
            value(raw) {

                return {
                    heading: raw.euler.heading / 16,
                    roll: raw.euler.roll / 16,
                    pitch: raw.euler.pitch / 16
                };
            }
        },
        toScaledQuarternion: {
            value(raw) {
                return {
                    w: raw.quarternion.w * (1 / (1 << 14)),
                    x: raw.quarternion.x * (1 / (1 << 14)),
                    y: raw.quarternion.y * (1 / (1 << 14)),
                    z: raw.quarternion.z * (1 / (1 << 14))
                };
            }
        },
        calibration: {
            get() {
                return priv.get(this).calibration;
            }
        },
        isCalibrated: {
            get() {
                //only returns true if the calibration of the NDOF/Fusion algo is calibrated
                return ((this.calibration >> 6) & 0x03) === 0x03; //are we fully calibrated
            }
        }
    }
};


/**
 * Orientation
 * @constructor
 *
 * five.Orientation();
 *
 * five.Orientation({
 *  controller: "BNO055",
 *  freq: 50,
 * });
 *
 *
 * Device Shorthands:
 *
 * "BNO055": new five.Orientation()
 *
 *
 * @param {Object} opts [description]
 *
 */

function Orientation(opts) {

    if (!(this instanceof Orientation)) {
        return new Orientation(opts);
    }

    Board.Component.call(
        this, opts = Board.Options(opts)
    );

    const freq = opts.freq || 25;
    let controller = null;
    let raw = null;
    const state = {
        euler: {
            heading: 0,
            roll: 0,
            pitch: 0
        },
        quarternion: {
            w: 0,
            x: 0,
            y: 0,
            z: 0
        },
        calibration: 0
    };

    if (opts.controller && typeof opts.controller === "string") {
        controller = Controllers[opts.controller.toUpperCase()];
    } else {
        controller = opts.controller;
    }

    if (controller === null || typeof controller !== "object") {
        throw new Error("Missing valid Orientation controller");
    }

    Board.Controller.call(this, controller, opts);

    if (!this.toScaledQuarternion) {
        this.toScaledQuarternion = opts.toScaledQuarternion || function (raw) {
            return raw;
        };
    }

    if (!this.toScaledEuler) {
        this.toScaledEuler = opts.toScaledEuler || function (raw) {
            return raw;
        };
    }

    priv.set(this, state);

    if (typeof this.initialize === "function") {
        this.initialize(opts, (data) => {
            raw = data;
        });
    }

    setInterval(() => {
        if (raw === null) {
            return;
        }
        let didOrientationChange = false;
        let didCalibrationChange = false;

        ["heading", "roll", "pitch"].forEach((el) => {
            if (state.euler[el] !== raw.orientation.euler[el]) {
                didOrientationChange = true;
            }
            state.euler[el] = raw.orientation.euler[el];
        });

        ["w", "x", "y", "z"].forEach((el) => {
            if (state.quarternion[el] !== raw.orientation.quarternion[el]) {
                didOrientationChange = true;
            }
            state.quarternion[el] = raw.orientation.quarternion[el];
        });

        //if we have a raw calibration state...
        // not sure if this is the best place... some devices may not have a calibration state...
        if (raw.calibration) {
            if (state.calibration !== raw.calibration) {
                didCalibrationChange = true;
            }
            state.calibration = raw.calibration;
        }

        let data = {
            euler: this.euler,
            quarternion: this.quarternion,
            calibration: this.calibration
        };

        this.emit("data", data);

        if (didOrientationChange) {
            this.emit("change", data);
        }

        //not sure how we can get this event into other drivers
        if (didCalibrationChange) {
            this.emit("calibration", this.calibration);
        }
    }, freq);
}


util.inherits(Orientation, Emitter);

Object.defineProperties(Orientation.prototype, {
    euler: {
        get() {
            let state = priv.get(this);
            return this.toScaledEuler(state);
        }
    },
    quarternion: {
        get() {
            let state = priv.get(this);
            return this.toScaledQuarternion(state);
        }
    }
});


module.exports = Orientation;
