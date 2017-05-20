let Board = require("./board"),
    events = require("events"),
    util = require("util"),
    __ = require("./fn"),
    Led = require("./led"),
    Sensor = require("./sensor");

const CALIBRATED_MIN_VALUE = 0;
const CALIBRATED_MAX_VALUE = 1000;
const LINE_ON_THRESHOLD = 200;
const LINE_NOISE_THRESHOLD = 50;

const priv = new Map();

// Private methods
function initialize() {
    let self = this,
        state = priv.get(this);

    if (typeof this.opts.emitter === "undefined") {
        throw new Error("Emitter pin is required");
    }

    if (!this.pins || this.pins.length === 0) {
        throw new Error("Pins must be defined");
    }

    state.emitter = new Led({
        board: this.board,
        pin: this.opts.emitter
    });

    state.sensorStates = this.pins.map(function (pin) {
        const sensorState = {
            sensor: new Sensor({
                board: this.board,
                freq: this.freq,
                pin
            }),
            rawValue: 0,
            dataReceived: false
        };


        sensorState.sensor.on("data", function () {
            onData.call(self, sensorState, this.value);
        });

        return sensorState;
    }, this);
}

function onData(sensorState, value) {
    let allRead, state = priv.get(this);

    sensorState.dataReceived = true;
    sensorState.rawValue = value;

    allRead = state.sensorStates.every((sensorState) => {
        return sensorState.dataReceived;
    });

    if (allRead) {
        this.emit("data", this.raw);

        if (state.autoCalibrate) {
            setCalibration(state.calibration, this.raw);
        }

        if (this.isCalibrated) {
            this.emit("calibratedData", this.values);
            this.emit("line", this.line);
        }

        state.sensorStates.forEach((sensorState) => {
            sensorState.dataReceived = false;
        });
    }
}

function setCalibration(calibration, values) {
    values.forEach((value, i) => {
        if (calibration.min[i] === undefined || value < calibration.min[i]) {
            calibration.min[i] = value;
        }

        if (calibration.max[i] === undefined || value > calibration.max[i]) {
            calibration.max[i] = value;
        }
    });
}

function calibrationIsValid(calibration, sensors) {
    return calibration &&
        (calibration.max && calibration.max.length === sensors.length) &&
        (calibration.min && calibration.min.length === sensors.length);
}


function calibratedValues() {
    return this.raw.map(function (value, i) {
        let max = this.calibration.max[i],
            min = this.calibration.min[i];

        const scaled = __.scale(value, min, max, CALIBRATED_MIN_VALUE, CALIBRATED_MAX_VALUE);
        return __.constrain(scaled, CALIBRATED_MIN_VALUE, CALIBRATED_MAX_VALUE);
    }, this);
}

function maxLineValue() {
    return (this.sensors.length - 1) * CALIBRATED_MAX_VALUE;
}

// Returns a value between 0 and (n-1)*1000
// Given 5 sensors, the value will be between 0 and 4000
function getLine(whiteLine) {
    let onLine = false;
    let avg = 0,
        sum = 0;
    const state = priv.get(this);

    whiteLine = Boolean(whiteLine);

    this.values.forEach((value, i) => {
        value = whiteLine ? (CALIBRATED_MAX_VALUE - value) : value;

        if (value > LINE_ON_THRESHOLD) {
            onLine = true;
        }

        if (value > LINE_NOISE_THRESHOLD) {
            avg += value * i * CALIBRATED_MAX_VALUE;
            sum += value;
        }
    });

    if (!onLine) {
        const maxPoint = maxLineValue.call(this) + 1;
        const centerPoint = maxPoint / 2;

        return state.lastLine < centerPoint ? 0 : maxPoint;
    }

    return state.lastLine = Math.floor(avg / sum);
}

// Constructor
function ReflectanceArray(opts) {

    if (!(this instanceof ReflectanceArray)) {
        return new ReflectanceArray(opts);
    }

    this.opts = Board.Options(opts);

    Board.Component.call(
        this, this.opts, {
            requestPin: false
        }
    );

    // Read event throttling
    this.freq = opts.freq || 25;

    // Make private data entry
    const state = {
        lastLine: 0,
        isOn: false,
        calibration: {
            min: [],
            max: []
        },
        autoCalibrate: opts.autoCalibrate || false
    };

    priv.set(this, state);

    initialize.call(this);

    Object.defineProperties(this, {
        isOn: {
            get() {
                return state.emitter.isOn;
            }
        },
        isCalibrated: {
            get() {
                return calibrationIsValid(this.calibration, this.sensors);
            }
        },
        isOnLine: {
            get() {
                const line = this.line;
                return line > CALIBRATED_MIN_VALUE && line < maxLineValue.call(this);
            }
        },
        sensors: {
            get() {
                return state.sensorStates.map((sensorState) => {
                    return sensorState.sensor;
                });
            }
        },
        calibration: {
            get() {
                return state.calibration;
            }
        },
        raw: {
            get() {
                return state.sensorStates.map((sensorState) => {
                    return sensorState.rawValue;
                });
            }
        },
        values: {
            get() {
                return this.isCalibrated ? calibratedValues.call(this) : this.raw;
            }
        },
        line: {
            get() {
                return this.isCalibrated ? getLine.call(this) : 0;
            }
        }
    });
}

util.inherits(ReflectanceArray, events.EventEmitter);

// Public methods
ReflectanceArray.prototype.enable = function () {
    const state = priv.get(this);

    state.emitter.on();

    return this;
};

ReflectanceArray.prototype.disable = function () {
    const state = priv.get(this);

    state.emitter.off();

    return this;
};

// Calibrate will store the min/max values for this sensor array
// It should be called many times in order to get a lot of readings
// on light and dark areas.  See calibrateUntil for a convenience
// for looping until a condition is met.
ReflectanceArray.prototype.calibrate = function () {
    const state = priv.get(this);

    this.once("data", function (values) {
        setCalibration(state.calibration, values);

        this.emit("calibrated");
    });

    return this;
};

// This will continue to calibrate until the predicate is true.
// Allows the user to calibrate n-times, or wait for user input,
// or base it on calibration heuristics.  However the user wants.
ReflectanceArray.prototype.calibrateUntil = function (predicate) {
    var loop = function () {
        this.calibrate();
        this.once("calibrated", () => {
            if (!predicate()) {
                loop();
            }
        });
    }.bind(this);

    loop();

    return this;
};

// Let the user tell us what the calibration data is
// This allows the user to save calibration data and
// reload it without needing to calibrate every time.
ReflectanceArray.prototype.loadCalibration = function (calibration) {
    const state = priv.get(this);

    if (!calibrationIsValid(calibration, this.sensors)) {
        throw new Error("Calibration data not properly set: {min: [], max: []}");
    }

    state.calibration = calibration;

    return this;
};

module.exports = ReflectanceArray;
