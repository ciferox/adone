const { is, hardware: { board: { rpi: { board: { getGpioNumber }, Peripheral, gpio: { Gpio } } } } } = adone;

const DEFAULT_FREQUENCY = 50;
const DEFAULT_RANGE = 40000;

export class SoftPWM extends Peripheral {
    constructor(config) {
        let pin;
        let frequency = DEFAULT_FREQUENCY;
        let range = DEFAULT_RANGE;
        if (is.number(config) || is.string(config)) {
            pin = config;
        } else if (is.plainObject(config)) {
            if (is.number(config.pin) || is.string(config.pin)) {
                pin = config.pin;
            } else {
                throw new Error(`Invalid pin "${config.pin}". Pin must a number or string`);
            }
            if (is.number(config.frequency)) {
                frequency = config.frequency;
            }
            if (is.number(config.range)) {
                range = config.range;
            }
        } else {
            throw new Error("Invalid config, must be a number, string, or object");
        }
        super(pin);

        const gpioPin = getGpioNumber(pin);
        if (is.null(gpioPin)) {
            throw new Error(`Internal error: ${pin} was parsed as a valid pin, but couldn't be resolved to a GPIO pin`);
        }

        this._frequency = frequency;
        this._range = range;
        this._dutyCycle = 0;
        this._pwm = new Gpio(gpioPin, { mode: Gpio.OUTPUT });
        this._pwm.pwmFrequency(frequency);
        this._pwm.pwmRange(range);
    }

    get frequency() {
        return this._frequency;
    }

    get range() {
        return this._range;
    }

    get dutyCycle() {
        return this._dutyCycle;
    }

    write(dutyCycle: number) {
        if (!this.alive) {
            throw new Error("Attempted to write to a destroyed peripheral");
        }
        if (!is.number(dutyCycle) || dutyCycle < 0 || dutyCycle > 1) {
            throw new Error(`Invalid PWM duty cycle "${dutyCycle}"`);
        }
        this._dutyCycle = dutyCycle;
        this._pwm.pwmWrite(Math.round(this._dutyCycle * this._range));
    }
}
