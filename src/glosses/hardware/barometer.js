const util = require("util");

const Board = require("./board");
const Fn = require("./fn");

const toFixed = Fn.toFixed;


const Controllers = {
    MPL115A2: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "MPL115A2", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                // http://cache.freescale.com/files/sensors/doc/data_sheet/MPL115A2.pdf
                // P. 6, Eqn. 2
                return ((65 / 1023) * raw) + 50;
            }
        }
    },
    MPL3115A2: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "MPL3115A2", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                // formulas extracted from code example:
                // https://github.com/adafruit/Adafruit_MPL3115A2_Library
                const inches = (raw / 4) / 3377;
                return inches * 3.39;
            }
        }
    },
    BMP180: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "BMP180", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                return raw / 1000;
            }
        }
    },
    BMP280: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "BMP280", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                return raw / 1000;
            }
        }
    },
    BME280: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "BME280", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                return raw / 1000;
            }
        }
    },
    MS5611: {
        initialize: {
            value(opts, dataHandler) {
                const Multi = require("./imu");
                const driver = Multi.Drivers.get(this.board, "MS5611", opts);
                driver.on("data", (data) => {
                    dataHandler.call(this, data.pressure);
                });
            }
        },
        // kPa (Kilopascals)
        toPressure: {
            value(raw) {
                return raw / 1000;
            }
        }
    }
};

Controllers.BMP085 = Controllers.BMP180;

/**
 * Barometer
 * @constructor
 *
 * five.Barometer(opts);
 *
 * five.Barometer({
 *   controller: "CONTROLLER"
 *   address: 0x00
 * });
 *
 *
 * @param {Object} opts [description]
 *
 */

function Barometer(opts) {
    if (!(this instanceof Barometer)) {
        return new Barometer(opts);
    }

    let controller = null;
    let last = null;
    let raw = null;

    Board.Component.call(
        this, opts = Board.Options(opts)
    );

    const freq = opts.freq || 25;

    if (opts.controller && typeof opts.controller === "string") {
        controller = Controllers[opts.controller.toUpperCase()];
    } else {
        controller = opts.controller;
    }

    if (controller == null) {
        // controller = Controllers["ANALOG"];
        throw new Error("Missing Barometer controller");
    }

    Board.Controller.call(this, controller, opts);

    if (!this.toPressure) {
        this.toPressure = opts.toPressure || function (raw) {
            return raw;
        };
    }

    if (typeof this.initialize === "function") {
        this.initialize(opts, (data) => {
            raw = data;
        });
    }

    Object.defineProperties(this, {
        pressure: {
            get() {
                return toFixed(this.toPressure(raw), 4);
            }
        }
    });

    setInterval(() => {
        if (raw === null) {
            return;
        }

        const data = {
            pressure: this.pressure
        };

        this.emit("data", data);

        if (this.pressure !== last) {
            last = this.pressure;
            this.emit("change", data);
        }
    }, freq);
}

util.inherits(Barometer, adone.event.Emitter);

/* istanbul ignore else */
if (process.env.IS_TEST_MODE) {
    Barometer.Controllers = Controllers;
    Barometer.purge = function () { };
}

module.exports = Barometer;
