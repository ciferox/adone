const {
    is,
    event
} = adone;

if (!is.plainObject(global.raspiPinUsage)) {
    global.raspiPinUsage = {};
}
const registeredPins = global.raspiPinUsage;

export default class Peripheral extends event.Emitter {
    constructor(pins) {
        super();
        this.alive = true;
        this.pins = [];
        if (!is.array(pins)) {
            pins = [pins];
        }
        for (const alias of pins) {
            const pin = adone.hardware.board.rpi.board.getPinNumber(alias);
            if (is.null(pin)) {
                throw new Error(`Invalid pin: ${alias}`);
            }
            this.pins.push(pin);
            if (registeredPins[pin]) {
                registeredPins[pin].destroy();
            }
            registeredPins[pin] = this;
        }
    }

    destroy() {
        if (this.alive) {
            this.alive = false;
            for (const pin of this.pins) {
                delete registeredPins[pin];
            }
            this.emit("destroyed");
        }
    }

    validateAlive() {
        if (!this.alive) {
            throw new Error("Attempted to access a destroyed peripheral");
        }
    }
}
