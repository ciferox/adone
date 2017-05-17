export const PARITY_NONE = "none";
export const PARITY_EVEN = "even";
export const PARITY_ODD = "odd";
export const PARITY_MARK = "mark";
export const PARITY_SPACE = "space";
export const DEFAULT_PORT = "/dev/ttyAMA0";

const createEmptyCallback = (cb) => {
    return function () {
        if (cb) {
            cb();
        }
    };
};

const createErrorCallback = (cb) => {
    return function (err) {
        if (cb) {
            cb(err);
        }
    };
};

export class Serial extends adone.hardware.board.rpi.Peripheral {
    constructor({ portId = DEFAULT_PORT, baudRate = 9600, dataBits = 8, stopBits = 1, parity = PARITY_NONE } = {}) {
        const pins = [];
        if (portId === DEFAULT_PORT) {
            pins.push("TXD0", "RXD0");
        }
        super(pins);
        this.isOpen = false;
        this.portId = portId;
        this.options = {
            baudRate,
            dataBits,
            stopBits,
            parity
        };

        process.on("beforeExit", () => {
            this.destroy();
        });
    }

    get port() {
        return this.portId;
    }

    get baudRate() {
        return this.options.baudRate;
    }

    get dataBits() {
        return this.options.dataBits;
    }

    get stopBits() {
        return this.options.stopBits;
    }

    get parity() {
        return this.options.parity;
    }

    destroy() {
        this.close();
    }

    open(cb) {
        this.validateAlive();
        if (this.isOpen) {
            if (cb) {
                setImmediate(cb);
            }
            return;
        }
        this.portInstance = new adone.hardware.serial.Port(this.portId, {
            lock: false,
            baudRate: this.options.baudRate,
            dataBits: this.options.dataBits,
            stopBits: this.options.stopBits,
            parity: this.options.parity
        });
        this.portInstance.on("open", () => {
            this.portInstance.on("data", (data) => {
                this.emit("data", data);
            });
            this.isOpen = true;
            if (cb) {
                cb();
            }
        });
    }

    close(cb) {
        this.validateAlive();
        if (!this.isOpen) {
            if (cb) {
                setImmediate(cb);
            }
            return;
        }
        this.isOpen = false;
        this.portInstance.close(createErrorCallback(cb));
    }

    write(data, cb) {
        this.validateAlive();
        if (!this.isOpen) {
            throw new Error("Attempted to write to a closed serial port");
        }
        this.portInstance.write(data, createEmptyCallback(cb));
    }

    flush(cb) {
        this.validateAlive();
        if (!this.isOpen) {
            throw new Error("Attempted to flush a closed serial port");
        }
        this.portInstance.flush(createErrorCallback(cb));
    }
}
