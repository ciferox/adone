const { is, hardware: { board: { rpi: { gpio: { Gpio } } } } } = adone;

const DEFAULT_PIN = 1;
const DEFAULT_FREQUENCY = 50;
const MAX_DUTY_CYCLE = 1000000;

const PWM0 = "PWM0";
const PWM1 = "PWM1";

// So there's a funky thing with PWM, where there are four PWM-capable pins,
// but only two actual PWM ports. So the standard pin contention mechanism
// doesn't _quite_ cover all cases. This object tracks which PWM peripherals are
// in use at a given time, so we can do error checking on it.
const pwmPeripheralsInUse = {
    [PWM0]: false,
    [PWM1]: false
};

export class PWM extends adone.hardware.board.rpi.Peripheral {
    constructor(config) {
        let pin = DEFAULT_PIN;
        let frequency = DEFAULT_FREQUENCY;
        if (is.number(config) || is.string(config)) {
            pin = config;
        } else if (is.plainObject(config)) {
            if (is.number(config.pin) || is.string(config.pin)) {
                pin = config.pin;
            }
            if (is.number(config.frequency)) {
                frequency = config.frequency;
            }
        }
        super(pin);

        // Pin details from http://elinux.org/RPi_BCM2835_GPIOs
        let gpioPin: number;
        let mode: number;
        switch (this.pins[0]) {
            case 26: // GPIO12 PWM0 ALT0
                gpioPin = 12;
                mode = Gpio.ALT0;
                this.pwmPort = PWM0;
                break;
            case 1: // GPIO18 PWM0 ALT5
                gpioPin = 18;
                mode = Gpio.ALT5;
                this.pwmPort = PWM0;
                break;
            case 23: // GPIO13 PWM1 ALT0
                gpioPin = 13;
                mode = Gpio.ALT0;
                this.pwmPort = PWM1;
                break;
            case 24: // GPIO19 PWM1 ALT5
                gpioPin = 19;
                mode = Gpio.ALT5;
                this.pwmPort = PWM1;
                break;
            default:
                throw new Error(`Pin ${pin} does not support hardware PWM`);
        }

        if (pwmPeripheralsInUse[this.pwmPort]) {
            throw new Error(`${this.pwmPort} is already in use and cannot be used again`);
        }
        pwmPeripheralsInUse[this.pwmPort] = true;

        this.frequencyValue = frequency;
        this.dutyCycleValue = 0;
        this.pwm = new Gpio(gpioPin, { mode });
    }

    get frequency() {
        return this.frequencyValue;
    }

    get dutyCycle() {
        return this.dutyCycleValue;
    }

    destroy() {
        pwmPeripheralsInUse[this.pwmPort] = false;
        super.destroy();
    }

    write(dutyCycle: number) {
        if (!this.alive) {
            throw new Error("Attempted to write to a destroyed peripheral");
        }
        if (!is.number(dutyCycle) || dutyCycle < 0 || dutyCycle > 1) {
            throw new Error(`Invalid PWM duty cycle ${dutyCycle}`);
        }
        this.dutyCycleValue = dutyCycle;
        this.pwm.hardwarePwmWrite(this.frequencyValue, Math.round(this.dutyCycleValue * MAX_DUTY_CYCLE));
    }
}
