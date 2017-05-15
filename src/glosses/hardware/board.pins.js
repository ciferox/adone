const Options = require("./board.options");

const MODES = {
    INPUT: 0x00,
    OUTPUT: 0x01,
    ANALOG: 0x02,
    PWM: 0x03,
    SERVO: 0x04
};


/**
 * Pin Capability Signature Mapping
 */

const pinsToType = {
    20: "UNO",
    25: "LEONARDO",
    70: "MEGA"
};

function Pins(board) {
    if (!(this instanceof Pins)) {
        return new Pins(board);
    }

    const io = board.io;
    const pins = io.pins.slice();
    const length = pins.length;
    const type = pinsToType[length] || "OTHER";

    board.type = type;

    // Copy pin data to index
    for (let i = 0; i < length; i++) {
        this[i] = pins[i];
    }

    Object.defineProperties(this, {
        type: {
            value: type
        },
        length: {
            value: length
        }
    });

    // If an IO Plugin or Expander defines
    // these, override the default
    [
        "isInput",
        "isOutput",
        "isAnalog",
        "isPwm",
        "isServo"
    ].forEach(function (isType) {
        if (io[isType]) {
            this[isType] = io[isType];
        }
    }, this);
}

Object.keys(MODES).forEach((mode) => {
    Object.defineProperty(Pins, mode, {
        value: MODES[mode]
    });
});

function isFirmata(board) {
    return board.io.name === "Firmata" || board.io.name === "Mock";
}

function hasPins(opts) {
    return typeof opts.pin !== "undefined" ||
        (typeof opts.pins !== "undefined" && opts.pins.length);
}

Pins.isFirmata = isFirmata;

Pins.Error = function (opts) {
    throw new Error(
        `Pin Error: ${opts.pin
        } is not a valid ${opts.type
        } pin (${opts.via})`
    );
};

const normalizers = new Map();

Pins.normalize = function (opts, board) {
    const type = board.pins.type;
    const isArduino = isFirmata(board);
    let normalizer = normalizers.get(board);
    let isNormalizing;

    if (typeof opts === "string" ||
        typeof opts === "number" ||
        Array.isArray(opts)) {

        opts = new Options(opts);
    }

    if (!normalizer) {
        isNormalizing = board.io && typeof board.io.normalize === "function";

        normalizer = function (pin) {
            return isArduino ?
                Pins.fromAnalog(Pins.translate(pin, type)) :
                (isNormalizing ? board.io.normalize(pin) : pin);
        };

        normalizers.set(board, normalizer);
    }

    // Auto-normalize pin values, this reduces boilerplate code
    // inside module constructors
    if (hasPins(opts)) {

        // When an array of pins is present, attempt to
        // normalize them if necessary
        if (opts.pins) {
            opts.pins = opts.pins.map(normalizer);
        } else {
            opts.pin = normalizer(opts.pin);
        }
    }

    return opts;
};

Pins.normalize.clear = function () {
    normalizers.clear();
};

// Special kit-centric pin translations
Pins.translations = {
    UNO: {
        dtoa: {
            14: "A0",
            15: "A1",
            16: "A2",
            17: "A3",
            18: "A4",
            19: "A5"
        },

        // TinkerKit
        tinker: {
            I0: "A0",
            I1: "A1",
            I2: "A2",
            I3: "A3",
            I4: "A4",
            I5: "A5",

            O0: 11,
            O1: 10,
            O2: 9,
            O3: 6,
            O4: 5,
            O5: 3,

            D13: 13,
            D12: 12,
            D8: 8,
            D7: 7,
            D4: 4,
            D2: 2
        }
    },
    MEGA: {
        dtoa: {
            54: "A0",
            55: "A1",
            56: "A2",
            57: "A3",
            58: "A4",
            59: "A5",
            60: "A6",
            61: "A7",
            62: "A8",
            63: "A9"
        },

        // TinkerKit
        tinker: {
            I0: "A0",
            I1: "A1",
            I2: "A2",
            I3: "A3",
            I4: "A4",
            I5: "A5",
            I6: "A6",
            I7: "A7",
            I8: "A8",
            I9: "A9",

            O0: 11,
            O1: 10,
            O2: 9,
            O3: 6,
            O4: 5,
            O5: 3,

            D13: 13,
            D12: 12,
            D8: 8,
            D7: 7,
            D4: 4,
            D2: 2
        }
    }
};

Pins.translations.LEONARDO = Pins.translations.UNO;

Pins.translate = function (pin, type) {
    const translations = Pins.translations[type.toUpperCase()];

    if (!translations) {
        return pin;
    }

    return Object.keys(translations).reduce((pin, map) => {
        return translations[map][pin] || pin;
    }, pin);
};

Pins.fromAnalog = function (pin) {
    if (typeof pin === "string" && pin[0] === "A") {
        return parseInt(pin.slice(1), 10);
    }
    return pin;
};

Pins.identity = function (pins, needle) {
    return [].findIndex.call(pins, (pin) => {
        return pin.name === needle || pin.id === needle || pin.port === needle;
    });
};

/**
 * (generated methods)
 *
 * Pins.prototype.isInput
 * Pins.prototype.isOutput
 * Pins.prototype.isAnalog
 * Pins.prototype.isPwm
 * Pins.prototype.isServo
 *
 */
Object.keys(MODES).forEach((key) => {
    const name = key[0] + key.slice(1).toLowerCase();

    Pins.prototype[`is${name}`] = function (pin) {
        const attrs = this[pin] || this[Pins.identity(this, pin)];

        if (attrs && attrs.supportedModes.includes(MODES[key])) {
            return true;
        }
        return false;
    };
});

Pins.prototype.isDigital = function (pin) {
    const attrs = this[pin] || this[Pins.identity(this, pin)];

    if (attrs && attrs.supportedModes.length) {
        return true;
    }
    return false;
};

module.exports = Pins;
